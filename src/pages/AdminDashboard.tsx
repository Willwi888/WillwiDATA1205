import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language } from '../types';

type Tab = 'catalog' | 'settings' | 'payment' | 'curation';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing_assets'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'releaseDate', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
      totalUsers: 0,
      incomeProduction: 0,
      incomeDonation: 0,
      activeSongs: 0,
      missingDataSongs: 0
  });

  // Global Brand Configuration
  const [platformConfig, setPlatformConfig] = useState({
    defaultCompany: 'Willwi Music',
    defaultProject: ProjectType.Indie,
    youtubeFeaturedUrl: '',
    homeTitle: ''
  });

  // QR Code Images State
  const [qrImages, setQrImages] = useState({
      global_payment: '',
      production: '',
      cinema: '',
      support: '',
      line: ''
  });
  const [accessCode, setAccessCode] = useState('8888');

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_platform_config');
      if (savedConfig) setPlatformConfig(JSON.parse(savedConfig));
      
      setQrImages({
          global_payment: localStorage.getItem('qr_global_payment') || '',
          production: localStorage.getItem('qr_production') || '',
          cinema: localStorage.getItem('qr_cinema') || '',
          support: localStorage.getItem('qr_support') || '',
          line: localStorage.getItem('qr_line') || ''
      });

      setAccessCode(localStorage.getItem('willwi_access_code') || '8888');
      
      if (isAdmin) {
          const users = getAllUsers();
          const txs = getAllTransactions();
          const prodIncome = txs.filter(t => t.type === 'production').reduce((acc, t) => acc + t.amount, 0);
          const donaIncome = txs.filter(t => t.type === 'donation').reduce((acc, t) => acc + t.amount, 0);
          
          const activeCount = songs.filter(s => s.isInteractiveActive).length;
          const missingCount = songs.filter(s => !s.lyrics || !s.audioUrl).length;

          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome,
              activeSongs: activeCount,
              missingDataSongs: missingCount
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions, songs]);

  const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredSongs.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredSongs.map(s => s.id)));
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(`警告：確定要刪除選取的 ${selectedIds.size} 首歌曲嗎？此動作不可逆。`)) return;
      for (const id of selectedIds) { await deleteSong(id); }
      setSelectedIds(new Set());
  };

  const savePlatformConfig = () => { 
    localStorage.setItem('willwi_platform_config', JSON.stringify(platformConfig)); 
    alert("全站設定已儲存。"); 
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
            const result = event.target?.result;
            if (typeof result !== 'string') return;
            const data = JSON.parse(result);
            if (Array.isArray(data)) {
                if (window.confirm(`即將匯入 ${data.length} 筆資料。建議先點擊「導出 JSON」備份當前資料。確定匯入並覆蓋嗎？`)) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    window.location.reload();
                }
            } else alert("無效的 JSON 格式。");
          } catch (e) { alert("匯入失敗，請檢查檔案內容。"); }
          finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
      };
      reader.readAsText(file);
  };

  const handleQrUpload = (key: keyof typeof qrImages) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              setQrImages(prev => ({ ...prev, [key]: base64 }));
              localStorage.setItem(`qr_${String(key)}`, base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const saveAccessCode = () => {
      localStorage.setItem('willwi_access_code', accessCode);
      alert("通行碼已更新");
  };

  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.isrc && s.isrc.includes(searchTerm))
      );
      if (filterStatus === 'active') result = result.filter(s => s.isInteractiveActive);
      if (filterStatus === 'inactive') result = result.filter(s => !s.isInteractiveActive);
      if (filterStatus === 'missing_assets') result = result.filter(s => !s.lyrics || !s.audioUrl);
      return result.sort((a, b) => {
          let valA = a[sortConfig.key] || '';
          let valB = b[sortConfig.key] || '';
          if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
          return valA < valB ? 1 : -1;
      });
  }, [songs, searchTerm, filterStatus, sortConfig]);

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">Unlock Console</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Central Control</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                New Song
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">Exit</button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl cursor-pointer hover:bg-slate-800" onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Catalog</div>
              <div className="text-3xl font-black text-white">{songs.length}</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-emerald-500" onClick={() => setActiveTab('curation')}>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Interactive Active</div>
              <div className="text-3xl font-black text-emerald-400">{stats.activeSongs}</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-brand-gold" onClick={() => setActiveTab('payment')}>
              <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-2">Payment Setup</div>
              <div className="text-3xl font-black text-white">QR</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-brand-accent" onClick={() => setActiveTab('settings')}>
              <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mb-2">Data Center</div>
              <div className="text-3xl font-black text-white">JSON</div>
          </div>
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-4">
              <div className="bg-slate-900/50 border border-white/10 p-2 rounded-lg flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                      <input type="text" placeholder="搜尋作品或 ISRC..." className="w-full bg-black/50 border border-transparent focus:border-brand-accent/50 rounded-md pl-10 pr-4 py-3 text-white text-xs font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <svg className="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <select className="bg-black/50 text-slate-300 text-xs font-bold px-4 py-3 rounded-md outline-none cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                      <option value="all">所有狀態</option>
                      <option value="active">已開放互動</option>
                      <option value="missing_assets">⚠️ 缺音檔或歌詞</option>
                  </select>
                  {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-md">刪除選取 ({selectedIds.size})</button>}
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse table-auto">
                      <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                              <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredSongs.length} /></th>
                              <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>作品資訊</th>
                              <th className="p-4 hidden md:table-cell" onClick={() => handleSort('releaseDate')}>發行日期</th>
                              <th className="p-4 text-center">互動模式</th>
                              <th className="p-4 text-right">管理</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className={`group transition-all ${selectedIds.has(song.id) ? 'bg-brand-gold/10' : 'hover:bg-white/[0.03]'}`} onClick={() => navigate(`/song/${song.id}`)}>
                                  <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); handleSelectOne(song.id); }}><input type="checkbox" checked={selectedIds.has(song.id)} readOnly /></td>
                                  <td className="p-4"><div className="flex items-center gap-4"><img src={song.coverUrl} className="w-10 h-10 object-cover rounded" alt="" /><div className="font-bold text-sm text-white">{song.title}</div></div></td>
                                  <td className="p-4 hidden md:table-cell text-xs font-mono text-slate-400">{song.releaseDate}</td>
                                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-4 py-1 text-[9px] font-black uppercase border rounded ${song.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-500 border-white/10'}`}>{song.isInteractiveActive ? 'ON' : 'OFF'}</button></td>
                                  <td className="p-4 text-right"><button onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }} className="text-[10px] font-black text-slate-400 hover:text-white">編輯</button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-brand-accent/30 p-10 rounded-xl shadow-[0_0_50px_rgba(56,189,248,0.1)]">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                      <span className="w-8 h-8 bg-brand-accent text-black rounded-full flex items-center justify-center text-sm">JSON</span>
                      資料管理中心 (Data Center)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between">
                          <div>
                              <h4 className="text-white text-base font-bold mb-3">導出作品集 (Export JSON)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mb-8">將目前資料庫中所有的作品、歌詞與連結備份成單一 JSON 檔案，以便隨時復原或轉移。</p>
                          </div>
                          <button onClick={downloadFullBackup} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded shadow-xl">
                              立即下載備份檔案
                          </button>
                      </div>
                      <div className="p-8 bg-black/40 border border-red-900/30 rounded-lg flex flex-col justify-between">
                          <div>
                              <h4 className="text-red-400 text-base font-bold mb-3">匯入作品集 (Import JSON)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mb-8">上傳備份的 JSON 檔案。<span className="text-red-500 font-bold underline">注意：這會清空目前的資料庫並以新檔案覆蓋。</span></p>
                          </div>
                          <div className="relative">
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-red-500 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded">
                                  選擇檔案並覆寫
                              </button>
                              <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-brand-gold uppercase tracking-[0.3em] mb-8">金流 QR Code 設置</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="col-span-full p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                          <div>
                              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">系統通行碼 (Access Code)</h4>
                              <p className="text-slate-500 text-[10px] mt-1">使用者付款後需輸入此代碼解鎖互動權限。</p>
                          </div>
                          <div className="flex gap-2">
                              <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-black border border-emerald-500/50 px-4 py-2 text-white font-mono text-center w-24 outline-none" />
                              <button onClick={saveAccessCode} className="px-6 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-400">更新</button>
                          </div>
                      </div>
                      {[
                          { key: 'global_payment', label: '主要收款 QR (Line Pay)' },
                          { key: 'line', label: 'LINE 官方帳號 QR' }
                      ].map((item) => (
                          <div key={item.key} className="p-6 bg-black/40 border border-white/5 rounded-xl text-center">
                              <h4 className="text-xs font-bold text-white uppercase mb-4">{item.label}</h4>
                              <div className="aspect-square bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                                  {qrImages[item.key as keyof typeof qrImages] ? <img src={qrImages[item.key as keyof typeof qrImages]} className="w-full h-full object-contain" /> : <span className="text-slate-700 text-[9px]">未上傳</span>}
                              </div>
                              <label className="block w-full cursor-pointer py-3 border border-white/20 text-slate-300 font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">
                                  選擇圖片上傳
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key as keyof typeof qrImages)} />
                              </label>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;