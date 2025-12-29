
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType } from '../types';
import { useTranslation } from '../context/LanguageContext';

type Tab = 'catalog' | 'settings' | 'payment' | 'curation';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs, dbStatus } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // QR Code & Security State
  const [qrImages, setQrImages] = useState({
      global_payment: '',
      production: '',
      cinema: '',
      support: '',
      line: ''
  });
  const [accessCode, setAccessCode] = useState('8888'); 
  const [adminPassword, setAdminPassword] = useState('8520'); 
  
  // Import Options
  const [importStrategy, setImportStrategy] = useState<'merge' | 'overwrite'>('merge');

  useEffect(() => {
      setQrImages({
          global_payment: localStorage.getItem('qr_global_payment') || '',
          production: localStorage.getItem('qr_production') || '',
          cinema: localStorage.getItem('qr_cinema') || '',
          support: localStorage.getItem('qr_support') || '',
          line: localStorage.getItem('qr_line') || ''
      });

      setAccessCode(localStorage.getItem('willwi_access_code') || '8888');
      setAdminPassword(localStorage.getItem('willwi_admin_password') || '8520');
      
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
      if (!window.confirm(`警告：確定要刪除選取的 ${selectedIds.size} 首歌曲嗎？`)) return;
      for (const id of selectedIds) { await deleteSong(id); }
      setSelectedIds(new Set());
  };

  const togglePreview = (url: string | undefined, id: string) => {
      if (!url) return alert("無音檔連結");
      if (playingId === id) {
          audioRef.current?.pause();
          setPlayingId(null);
      } else {
          if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.play();
              setPlayingId(id);
          } else {
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.play();
              setPlayingId(id);
              audio.onended = () => setPlayingId(null);
          }
      }
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const exportData = {
          metadata: {
              version: '3.0',
              exportedAt: new Date().toISOString(),
              count: allSongs.length
          },
          songs: allSongs
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DATABASE_${new Date().toISOString().split('T')[0]}.json`;
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
            const rawSongs = Array.isArray(parsed) ? parsed : (parsed.songs || []);
            if (importStrategy === 'overwrite') await dbService.clearAllSongs();
            await bulkAddSongs(rawSongs);
            alert("匯入成功！");
            window.location.reload();
          } catch (e) { alert("匯入失敗，請檢查格式。"); }
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
      alert("✅ 通行碼已更新");
  };

  const saveAdminPassword = () => {
      localStorage.setItem('willwi_admin_password', adminPassword);
      alert("✅ 管理密碼已更新");
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
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">{t('admin_login_title')}</h2>
                   <form onSubmit={(e) => { 
                       e.preventDefault(); 
                       const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
                       if (passwordInput === correctPwd) enableAdmin(); 
                       else setLoginError(t('admin_login_error')); 
                   }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">{t('admin_login_btn')}</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{t('admin_title')}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">{t('admin_subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                {t('admin_btn_new')}
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">{t('admin_btn_exit')}</button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          <div className={`bg-slate-900 border p-5 rounded-xl cursor-pointer hover:bg-slate-800 ${activeTab === 'catalog' ? 'border-white bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{t('admin_stat_total')}</div>
              <div className="text-3xl font-black text-white">{songs.length}</div>
          </div>
          <div className={`bg-slate-900 border p-5 rounded-xl border-l-4 border-l-brand-gold cursor-pointer hover:bg-slate-800 ${activeTab === 'payment' ? 'bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('payment')}>
              <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-2">{t('admin_stat_payment')}</div>
              <div className="text-3xl font-black text-white">QR</div>
          </div>
          <div className={`bg-slate-900 border p-5 rounded-xl border-l-4 border-l-brand-accent cursor-pointer hover:bg-slate-800 ${activeTab === 'settings' ? 'bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('settings')}>
              <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mb-2">{t('admin_stat_data')}</div>
              <div className="text-3xl font-black text-white">SET</div>
          </div>
      </div>

      {/* 核心功能：發布同步提醒 */}
      <div className="mb-10 bg-emerald-950/20 border border-emerald-500/30 p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <div className="w-16 h-16 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-2xl animate-pulse">📢</div>
          <div className="flex-grow">
              <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">同步資料至全站 (聽眾端)</h4>
              <p className="text-sm text-slate-400 font-light leading-relaxed">
                威威，您目前新增的作品儲存在「您的瀏覽器」中。若要讓全球聽眾也看到這些作品：<br/>
                1. 點擊下方按鈕 <span className="text-brand-accent font-bold">「導出作品 JSON」</span>。<br/>
                2. 將下載的檔案傳送給開發工程師（AI），由我為您更新至全站 INITIAL_DATA 中。
              </p>
          </div>
          <button onClick={downloadFullBackup} className="px-8 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-white hover:text-emerald-900 transition-all shadow-lg">導出作品 JSON</button>
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-4">
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse table-auto">
                      <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                              <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredSongs.length} /></th>
                              <th className="p-4 w-12">{t('admin_table_play')}</th>
                              <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>{t('admin_table_info')}</th>
                              <th className="p-4 hidden md:table-cell" onClick={() => handleSort('releaseDate')}>{t('admin_table_date')}</th>
                              <th className="p-4 text-center">{t('admin_table_mode')}</th>
                              <th className="p-4 text-right">{t('admin_table_action')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className={`group transition-all ${selectedIds.has(song.id) ? 'bg-brand-gold/10' : 'hover:bg-white/[0.03]'}`} onClick={() => navigate(`/song/${song.id}`)}>
                                  <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); handleSelectOne(song.id); }}><input type="checkbox" checked={selectedIds.has(song.id)} readOnly /></td>
                                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => togglePreview(song.audioUrl, song.id)} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${playingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : 'bg-slate-800 text-white border-white/20'}`}>
                                          {playingId === song.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                      </button>
                                  </td>
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
              <div className="bg-slate-900 border border-brand-accent/30 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.3em] mb-8">系統權限管理</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-lg">
                          <h5 className="text-red-400 font-bold text-xs mb-4">後台登入密碼</h5>
                          <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="bg-black border border-red-900/30 px-4 py-3 text-white font-mono w-full mb-4" />
                          <button onClick={saveAdminPassword} className="w-full py-3 bg-red-900 text-white text-[10px] font-black uppercase">更新管理密碼</button>
                      </div>
                      <div className="p-6 bg-emerald-950/20 border border-emerald-900/50 rounded-lg">
                          <h5 className="text-emerald-400 font-bold text-xs mb-4">前台通行碼</h5>
                          <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-black border border-emerald-900/30 px-4 py-3 text-white font-mono w-full mb-4" />
                          <button onClick={saveAccessCode} className="w-full py-3 bg-emerald-900 text-white text-[10px] font-black uppercase">更新通行碼</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-brand-gold uppercase tracking-[0.3em] mb-8">收款 QR Code</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                          { key: 'global_payment', label: '主要收款 QR' },
                          { key: 'line', label: 'LINE 官方帳號 QR' }
                      ].map((item) => (
                          <div key={item.key} className="p-6 bg-black/40 border border-white/5 rounded-xl text-center">
                              <h4 className="text-xs font-bold text-white uppercase mb-4">{item.label}</h4>
                              <div className="aspect-square bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                                  {qrImages[item.key as keyof typeof qrImages] ? <img src={qrImages[item.key as keyof typeof qrImages]} className="w-full h-full object-contain" /> : <span className="text-slate-700">未上傳</span>}
                              </div>
                              <label className="block w-full cursor-pointer py-3 border border-white/20 text-slate-300 font-black text-[9px] uppercase hover:bg-white hover:text-black transition-all">
                                  上傳圖片
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
