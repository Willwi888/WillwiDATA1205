
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, ReleaseCategory } from '../types';

type Tab = 'catalog' | 'insights' | 'settings' | 'payment';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong } = useData();
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
  
  // Album Expansion State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
      totalUsers: 0,
      incomeProduction: 0,
      incomeDonation: 0,
      activeSongs: 0,
      totalSongs: 0,
      hasLyricsCount: 0,
      hasAudioCount: 0
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
          const hasLyrics = songs.filter(s => s.lyrics && s.lyrics.length > 10).length;
          const hasAudio = songs.filter(s => s.audioUrl && s.audioUrl.length > 5).length;

          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome,
              activeSongs: activeCount,
              totalSongs: songs.length,
              hasLyricsCount: hasLyrics,
              hasAudioCount: hasAudio
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions, songs]);

  const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(`警告：確定要刪除選取的 ${selectedIds.size} 首歌曲嗎？此動作不可逆。`)) return;
      for (const id of selectedIds) { await deleteSong(id); }
      setSelectedIds(new Set());
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

  // 1. Filter songs first
  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.isrc && s.isrc.includes(searchTerm)) ||
          (s.upc && s.upc.includes(searchTerm))
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

  // 2. Group by UPC
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    filteredSongs.forEach(song => {
        const key = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${song.id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(song);
    });
    return Object.values(groups).sort((a, b) => {
        const dateA = new Date(a[0].releaseDate).getTime();
        const dateB = new Date(b[0].releaseDate).getTime();
        return dateB - dateA;
    });
  }, [filteredSongs]);

  const toggleGroup = (key: string) => {
      const next = new Set(expandedGroups);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpandedGroups(next);
  };

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

  // Helper for Circular Progress
  const CircularProgress = ({ percentage, color, label }: { percentage: number, color: string, label: string }) => (
      <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
               <svg className="w-full h-full transform -rotate-90">
                   <circle cx="64" cy="64" r="60" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                   <circle cx="64" cy="64" r="60" stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * percentage) / 100} className="transition-all duration-1000" strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                   <span className="text-2xl font-black text-white">{percentage}%</span>
               </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
  );

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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl cursor-pointer hover:bg-slate-800" onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Catalog</div>
              <div className="text-3xl font-black text-white">{songs.length}</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-emerald-500" onClick={() => setActiveTab('insights')}>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Data Insights</div>
              <div className="text-3xl font-black text-emerald-400">{Math.floor((stats.hasLyricsCount / (stats.totalSongs || 1)) * 100)}%</div>
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

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
             <div className="col-span-full bg-slate-900 border border-white/5 p-10 rounded-xl mb-8 flex justify-around items-center">
                 <CircularProgress percentage={Math.floor((stats.hasLyricsCount / (stats.totalSongs || 1)) * 100)} color="#fbbf24" label="Lyrics Completion" />
                 <CircularProgress percentage={Math.floor((stats.hasAudioCount / (stats.totalSongs || 1)) * 100)} color="#38bdf8" label="Audio Readiness" />
                 <CircularProgress percentage={Math.floor((stats.activeSongs / (stats.totalSongs || 1)) * 100)} color="#10b981" label="Interactive Active" />
             </div>
             <div className="col-span-full bg-black/40 border border-white/5 p-8 rounded-xl">
                 <h4 className="text-brand-gold font-black uppercase tracking-widest text-xs mb-6">Interaction Stats</h4>
                 <div className="grid grid-cols-2 gap-8">
                     <div>
                         <span className="block text-slate-500 text-[10px] uppercase font-bold">Total Support</span>
                         <span className="text-3xl font-black text-white">NT$ {(stats.incomeProduction + stats.incomeDonation).toLocaleString()}</span>
                     </div>
                     <div>
                         <span className="block text-slate-500 text-[10px] uppercase font-bold">Registered Users</span>
                         <span className="text-3xl font-black text-white">{stats.totalUsers}</span>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/10 p-4 rounded-lg flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                      <input type="text" placeholder="搜尋作品 (Search by Title / UPC / ISRC)..." className="w-full bg-black/50 border border-transparent focus:border-brand-accent/50 rounded-md pl-10 pr-4 py-3 text-white text-xs font-bold outline-none uppercase" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <svg className="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <select className="bg-black/50 text-slate-300 text-xs font-bold px-4 py-3 rounded-md outline-none cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                      <option value="all">ALL STATUS</option>
                      <option value="active">INTERACTIVE ON</option>
                      <option value="missing_assets">⚠️ MISSING ASSETS</option>
                  </select>
                  {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-md">刪除選取 ({selectedIds.size})</button>}
              </div>

              {/* Grouped Catalog View */}
              <div className="space-y-4">
                  {groupedCatalog.map(group => {
                      const mainSong = group[0];
                      const groupKey = mainSong.upc ? normalizeIdentifier(mainSong.upc) : `SINGLE_${mainSong.id}`;
                      const isExpanded = expandedGroups.has(groupKey);
                      const isAlbum = group.length > 1 || mainSong.releaseCategory === ReleaseCategory.Album;
                      const hasActiveTrack = group.some(s => s.isInteractiveActive);

                      return (
                        <div key={groupKey} className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden transition-all hover:border-white/10">
                            {/* Album/Release Header */}
                            <div onClick={() => toggleGroup(groupKey)} className="p-4 flex items-center gap-6 cursor-pointer hover:bg-white/[0.02]">
                                <div onClick={(e) => e.stopPropagation()} className="pl-2">
                                    <input 
                                        type="checkbox" 
                                        checked={group.every(s => selectedIds.has(s.id))}
                                        onChange={() => {
                                            const allSelected = group.every(s => selectedIds.has(s.id));
                                            const newSet = new Set(selectedIds);
                                            group.forEach(s => {
                                                if (allSelected) newSet.delete(s.id);
                                                else newSet.add(s.id);
                                            });
                                            setSelectedIds(newSet);
                                        }}
                                        className="rounded border-slate-600 bg-black/50"
                                    />
                                </div>
                                <img src={mainSong.coverUrl} className="w-16 h-16 object-cover rounded-md shadow-lg bg-slate-800" alt="" />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-white font-bold uppercase tracking-wider truncate text-sm">
                                            {isAlbum ? (mainSong.title || 'Untitled Album') : mainSong.title}
                                        </h4>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${isAlbum ? 'bg-brand-accent/20 text-brand-accent' : 'bg-slate-800 text-slate-400'}`}>
                                            {isAlbum ? 'ALBUM' : 'SINGLE'}
                                        </span>
                                        {hasActiveTrack && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-slate-500 font-mono uppercase items-center">
                                        <span className="text-white/60">{mainSong.releaseDate}</span>
                                        <span className="text-slate-600">•</span>
                                        <span>{group.length} Tracks</span>
                                        {mainSong.upc && (
                                            <>
                                                <span className="text-slate-600">•</span>
                                                <span className="tracking-wider">UPC: {mainSong.upc}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>

                            {/* Expanded Track List */}
                            {isExpanded && (
                                <div className="border-t border-white/5 bg-black/20">
                                    <table className="w-full text-left">
                                        <thead className="text-[9px] text-slate-600 font-black uppercase tracking-widest bg-black/20">
                                            <tr>
                                                <th className="py-3 px-6 w-16">#</th>
                                                <th className="py-3 px-6">Title</th>
                                                <th className="py-3 px-6 hidden md:table-cell">ISRC</th>
                                                <th className="py-3 px-6 text-center">Interactive</th>
                                                <th className="py-3 px-6 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {group.sort((a,b) => a.title.localeCompare(b.title)).map((song, idx) => (
                                                <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="py-3 px-6 text-xs font-mono text-slate-500">{String(idx + 1).padStart(2, '0')}</td>
                                                    <td className="py-3 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors uppercase">{song.title}</span>
                                                            {(!song.lyrics || !song.audioUrl) && <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 rounded" title="Missing Assets">⚠️</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-6 hidden md:table-cell text-[10px] font-mono text-slate-500">{song.isrc}</td>
                                                    <td className="py-3 px-6 text-center">
                                                        <button 
                                                            onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} 
                                                            className={`px-3 py-1 text-[8px] font-black uppercase rounded border transition-all ${song.isInteractiveActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}
                                                        >
                                                            {song.isInteractiveActive ? 'Active' : 'Off'}
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-6 text-right">
                                                        <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-wider">Edit</button>
                                                            <button onClick={() => { if(window.confirm('Delete this track?')) deleteSong(song.id); }} className="text-[9px] font-black text-red-900 hover:text-red-500 uppercase tracking-wider">Del</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                      );
                  })}
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
