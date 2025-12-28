import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType } from '../types';

type Tab = 'catalog' | 'settings' | 'payment' | 'curation';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs, dbStatus, lastSyncTime, storageUsage } = useData();
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

  // Import Options
  const [importStrategy, setImportStrategy] = useState<'merge' | 'overwrite'>('merge');

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

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const exportData = {
          metadata: {
              version: '3.0',
              exportedAt: new Date().toISOString(),
              count: allSongs.length,
              dbStatus: dbStatus
          },
          songs: allSongs
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_CORE_DUMP_${new Date().toISOString().split('T')[0]}.json`;
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
            const parsed = JSON.parse(result);
            
            // Support both old array format and new object format
            const rawSongs = Array.isArray(parsed) ? parsed : (parsed.songs || []);
            
            if (!Array.isArray(rawSongs)) throw new Error("Invalid Format");

            const strategyMsg = importStrategy === 'overwrite' 
                ? `🔴 HARD RESET: 正在執行「強制覆寫」。\n\n這將刪除當前所有 ${songs.length} 筆資料，並以匯入的 ${rawSongs.length} 筆資料取代。` 
                : `🟢 MERGE: 正在執行「智慧合併」。\n\n將匯入 ${rawSongs.length} 筆資料。相同 ID 將被更新，新 ID 將被新增。`;

            if (window.confirm(`${strategyMsg}\n\n確定執行嗎？`)) {
                if (importStrategy === 'overwrite') {
                    await dbService.clearAllSongs();
                }
                await bulkAddSongs(rawSongs);
                alert("Synchronization Complete.");
                window.location.reload();
            }
          } catch (e) { alert("匯入失敗，JSON 格式錯誤或檔案損毀。"); }
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
              <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">Data Health</div>
                  <div className={`w-2 h-2 rounded-full ${dbStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              </div>
              <div className="text-xl font-black text-white truncate">{dbStatus}</div>
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
          <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-950 border border-brand-accent/30 p-10 rounded-xl shadow-[0_0_50px_rgba(56,189,248,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                       <svg className="w-40 h-40 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-brand-accent/20 pb-8">
                      <div>
                          <h3 className="text-2xl font-black text-brand-accent uppercase tracking-[0.3em] flex items-center gap-4">
                              DATA OPERATIONS CENTER
                          </h3>
                          <p className="text-brand-accent/50 text-[10px] font-mono mt-2 uppercase tracking-widest">
                              IDB STATUS: <span className={dbStatus === 'ONLINE' ? 'text-green-400' : 'text-red-400'}>{dbStatus}</span> • 
                              SYNC: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'NEVER'} •
                              USAGE: {(storageUsage / 1024 / 1024).toFixed(2)} MB
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <div className="flex items-center gap-3 text-white">
                              <span className="w-6 h-6 rounded bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold">01</span>
                              <h4 className="text-sm font-black uppercase tracking-widest">Export Core Data</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed pl-9">
                              將完整資料庫導出為 JSON 格式。包含所有歌曲、歌詞、連結與設定。<br/>
                              建議定期執行此操作以備份資料。
                          </p>
                          <div className="pl-9">
                              <button onClick={downloadFullBackup} className="w-full py-4 bg-slate-900 border border-brand-accent/50 text-brand-accent font-black text-[11px] uppercase tracking-[0.2em] hover:bg-brand-accent hover:text-black transition-all rounded shadow-[0_0_20px_rgba(56,189,248,0.1)] flex items-center justify-center gap-3">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  DOWNLOAD FULL DUMP
                              </button>
                          </div>
                      </div>

                      <div className="space-y-6 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5 -ml-6 hidden md:block"></div>
                          <div className="flex items-center gap-3 text-white">
                              <span className="w-6 h-6 rounded bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold">02</span>
                              <h4 className="text-sm font-black uppercase tracking-widest">Import / Sync</h4>
                          </div>
                          
                          <div className="pl-9 space-y-4">
                              <div className="bg-black/40 border border-white/10 p-4 rounded">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-3">Sync Strategy</label>
                                  <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${importStrategy === 'merge' ? 'border-brand-accent' : 'border-slate-600'}`}>
                                              {importStrategy === 'merge' && <div className="w-2 h-2 rounded-full bg-brand-accent"></div>}
                                          </div>
                                          <input type="radio" className="hidden" name="strategy" checked={importStrategy === 'merge'} onChange={() => setImportStrategy('merge')} />
                                          <span className={`text-[10px] font-bold uppercase tracking-wider group-hover:text-white ${importStrategy === 'merge' ? 'text-white' : 'text-slate-500'}`}>Merge (Smart Update)</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${importStrategy === 'overwrite' ? 'border-red-500' : 'border-slate-600'}`}>
                                              {importStrategy === 'overwrite' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                                          </div>
                                          <input type="radio" className="hidden" name="strategy" checked={importStrategy === 'overwrite'} onChange={() => setImportStrategy('overwrite')} />
                                          <span className={`text-[10px] font-bold uppercase tracking-wider group-hover:text-white ${importStrategy === 'overwrite' ? 'text-red-500' : 'text-slate-500'}`}>Overwrite (Hard Reset)</span>
                                      </label>
                                  </div>
                              </div>

                              <div className="relative group">
                                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-accent to-purple-600 rounded opacity-20 group-hover:opacity-50 transition duration-500 blur"></div>
                                  <button onClick={() => fileInputRef.current?.click()} className="relative w-full py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all rounded flex items-center justify-center gap-3">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                      UPLOAD JSON FILE
                                  </button>
                                  <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                              </div>
                              <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest pt-2">
                                  {importStrategy === 'overwrite' ? '⚠️ WARNING: This will delete existing data.' : 'Safe Mode: Updates matching IDs, adds new ones.'}
                              </p>
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