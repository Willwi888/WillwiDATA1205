
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language } from '../types';
import { useTranslation } from '../context/LanguageContext';

type Tab = 'catalog' | 'settings' | 'payment' | 'security';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Security States
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [userAccessCode, setUserAccessCode] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing_assets'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'releaseDate', direction: 'desc' });

  const [qrImages, setQrImages] = useState({
      global_payment: '',
      production: '',
      cinema: '',
      support: '',
      line: ''
  });

  useEffect(() => {
      if (isAdmin) {
          setQrImages({
              global_payment: localStorage.getItem('qr_global_payment') || '',
              production: localStorage.getItem('qr_production') || '',
              cinema: localStorage.getItem('qr_cinema') || '',
              support: localStorage.getItem('qr_support') || '',
              line: localStorage.getItem('qr_line') || ''
          });
          setUserAccessCode(localStorage.getItem('willwi_access_code') || '8888');
          setNewAdminPassword(localStorage.getItem('willwi_admin_password') || '8520');
      }
  }, [isAdmin]);

  const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const togglePreview = (url: string | undefined, id: string) => {
      if (!url) return alert("無音檔連結");
      if (playingId === id) {
          audioRef.current?.pause();
          setPlayingId(null);
      } else {
          if (!audioRef.current) audioRef.current = new Audio();
          audioRef.current.src = url;
          audioRef.current.play();
          setPlayingId(id);
          audioRef.current.onended = () => setPlayingId(null);
      }
  };

  const saveSecuritySettings = () => {
      localStorage.setItem('willwi_admin_password', newAdminPassword);
      localStorage.setItem('willwi_access_code', userAccessCode);
      alert("安全設定已成功更新！");
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const exportData = {
          metadata: {
              version: '3.3',
              exportedAt: new Date().toISOString(),
              count: allSongs.length
          },
          songs: allSongs
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
            const parsed = JSON.parse(result);
            const rawSongs = Array.isArray(parsed) ? parsed : (parsed.songs || []);
            await dbService.clearAllSongs();
            await bulkAddSongs(rawSongs);
            alert(`成功匯入 ${rawSongs.length} 筆作品！`);
            window.location.reload();
          } catch (e) { alert("匯入失敗"); }
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

  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.isrc && s.isrc.includes(searchTerm))
      );
      if (filterStatus === 'active') result = result.filter(s => s.isInteractiveActive);
      return result.sort((a, b) => {
          let valA = a[sortConfig.key] || '';
          let valB = b[sortConfig.key] || '';
          if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
          return valA < valB ? 1 : -1;
      });
  }, [songs, searchTerm, filterStatus, sortConfig]);

  // Data Integrity Helper
  const isSongComplete = (song: Song) => {
      const hasAudio = !!song.audioUrl;
      const hasLyrics = !!song.lyrics || song.language === Language.Instrumental;
      const hasCover = !!song.coverUrl;
      return hasAudio && hasLyrics && hasCover;
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { 
                       e.preventDefault(); 
                       const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
                       if (passwordInput === correctPwd) enableAdmin(); 
                       else setLoginError("存取代碼錯誤"); 
                   }} className="space-y-6">
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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Central Control</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg flex items-center gap-2">New Song</button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">Exit</button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-10">
          <div className={`bg-slate-900 border p-5 rounded-xl cursor-pointer hover:bg-slate-800 ${activeTab === 'catalog' ? 'border-brand-accent bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Songs</div>
              <div className="text-3xl font-black text-white">{songs.length}</div>
          </div>
          <div className={`bg-slate-900 border p-5 rounded-xl border-l-4 border-l-brand-gold cursor-pointer hover:bg-slate-800 ${activeTab === 'payment' ? 'border-brand-gold bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('payment')}>
              <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-2">QR Management</div>
              <div className="text-3xl font-black text-white">QR</div>
          </div>
          <div className={`bg-slate-900 border p-5 rounded-xl border-l-4 border-l-emerald-500 cursor-pointer hover:bg-slate-800 ${activeTab === 'security' ? 'border-emerald-500 bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('security')}>
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-2">Security</div>
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 text-emerald-500">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <span className="text-xl font-black text-white">PASSWORD</span>
              </div>
          </div>
          <div className={`bg-slate-900 border p-5 rounded-xl border-l-4 border-l-brand-accent cursor-pointer hover:bg-slate-800 ${activeTab === 'settings' ? 'border-brand-accent bg-slate-800' : 'border-white/5'}`} onClick={() => setActiveTab('settings')}>
              <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mb-2">Data Sync</div>
              <div className="text-3xl font-black text-white">JSON</div>
          </div>
      </div>

      {activeTab === 'catalog' && (
          <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse table-auto">
                  <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                          <th className="p-4 w-12 text-center">Play</th>
                          <th className="p-4 w-16 text-center">狀態</th>
                          <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>作品資訊</th>
                          <th className="p-4 hidden md:table-cell" onClick={() => handleSort('releaseDate')}>日期</th>
                          <th className="p-4 text-center">互動模式</th>
                          <th className="p-4 text-right">管理</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredSongs.map(song => {
                          const complete = isSongComplete(song);
                          return (
                          <tr key={song.id} className="group hover:bg-white/[0.03] transition-all cursor-pointer" onClick={() => navigate(`/song/${song.id}`)}>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => togglePreview(song.audioUrl, song.id)} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${playingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : 'bg-slate-800 text-white border-white/20'}`}>
                                      {playingId === song.id ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                  </button>
                              </td>
                              <td className="p-4 text-center">
                                  <div className={`w-3 h-3 rounded-full mx-auto shadow-sm ${complete ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`} title={complete ? '資料登錄完成' : '資料未完成（缺音檔或歌詞）'}></div>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-4">
                                      <img src={song.coverUrl} className="w-10 h-10 object-cover rounded" alt="" />
                                      <div>
                                          <div className="font-bold text-sm text-white">{song.title}</div>
                                          {!complete && <div className="text-[8px] text-red-500 font-bold uppercase mt-1">Incomplete</div>}
                                      </div>
                                  </div>
                              </td>
                              <td className="p-4 hidden md:table-cell text-xs font-mono text-slate-400">{song.releaseDate}</td>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-4 py-1 text-[9px] font-black uppercase border rounded ${song.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-500 border-white/10'}`}>{song.isInteractiveActive ? 'ON' : 'OFF'}</button></td>
                              <td className="p-4 text-right"><button onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest">EDIT</button></td>
                          </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'security' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-emerald-500/30 p-10 rounded-xl shadow-xl">
                  <h3 className="text-xl font-black text-emerald-500 uppercase tracking-[0.3em] mb-8">安全與權限設定 (Security)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">後台登入密碼 (Admin Password)</label>
                              <input 
                                type="text" 
                                className="w-full bg-black border border-white/10 p-4 text-white text-base font-mono focus:border-emerald-500 outline-none transition-all tracking-widest"
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                              />
                              <p className="text-[9px] text-slate-600 mt-2 uppercase">變更後下次登入需使用新密碼</p>
                          </div>
                      </div>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] text-brand-gold font-black uppercase tracking-widest mb-3">用戶解鎖通行碼 (User Access Code)</label>
                              <input 
                                type="text" 
                                className="w-full bg-black border border-brand-gold/20 p-4 text-brand-gold text-base font-mono focus:border-brand-gold outline-none transition-all tracking-widest"
                                value={userAccessCode}
                                onChange={(e) => setUserAccessCode(e.target.value)}
                              />
                              <p className="text-[9px] text-slate-600 mt-2 uppercase">提供給完成付款用戶的萬用解鎖碼</p>
                          </div>
                      </div>
                  </div>
                  <div className="mt-12 pt-8 border-t border-white/5 flex justify-end">
                      <button onClick={saveSecuritySettings} className="px-10 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded hover:bg-white hover:text-black transition-all shadow-xl">儲存所有設定</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-brand-accent/30 p-10 rounded-xl shadow-xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.3em] mb-8">數據管理與備份</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between">
                          <div><h4 className="text-white text-base font-bold mb-3">導出 JSON 備份</h4><p className="text-xs text-slate-500 leading-relaxed mb-8">將目前所有作品數據下載為 JSON 檔案。</p></div>
                          <button onClick={downloadFullBackup} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">立即導出</button>
                      </div>
                      <div className="p-8 bg-black/40 border border-brand-accent/30 rounded-lg flex flex-col justify-between">
                          <div><h4 className="text-brand-accent text-base font-bold mb-3">匯入 JSON 檔案</h4><p className="text-xs text-slate-500 leading-relaxed mb-8">匯入外部 JSON 數據並覆蓋目前內容。</p></div>
                          <div className="relative">
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-brand-accent text-brand-accent font-black text-[11px] uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all rounded">選擇檔案匯入</button>
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
                  <h3 className="text-xl font-black text-brand-gold uppercase tracking-[0.3em] mb-8">QR Code 管理</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[{ key: 'global_payment', label: '主要付款 (Line Pay)' }, { key: 'line', label: 'LINE 官方帳號' }].map((item) => (
                          <div key={item.key} className="p-6 bg-black/40 border border-white/5 rounded-xl text-center">
                              <h4 className="text-xs font-bold text-white uppercase mb-4">{item.label}</h4>
                              <div className="aspect-square bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                                  {qrImages[item.key as keyof typeof qrImages] ? <img src={qrImages[item.key as keyof typeof qrImages]} className="w-full h-full object-contain" /> : <span className="text-slate-700 text-[10px]">未上傳</span>}
                              </div>
                              <label className="block w-full cursor-pointer py-3 border border-white/20 text-slate-300 font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">上傳圖片<input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key as keyof typeof qrImages)} /></label>
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
