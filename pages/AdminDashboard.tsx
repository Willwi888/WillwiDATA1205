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
      
      // Load QRs
      setQrImages({
          global_payment: localStorage.getItem('qr_global_payment') || '',
          production: localStorage.getItem('qr_production') || '',
          cinema: localStorage.getItem('qr_cinema') || '',
          support: localStorage.getItem('qr_support') || '',
          line: localStorage.getItem('qr_line') || ''
      });

      // Load Access Code
      setAccessCode(localStorage.getItem('willwi_access_code') || '8888');
      
      if (isAdmin) {
          const users = getAllUsers();
          const txs = getAllTransactions();
          const prodIncome = txs.filter(t => t.type === 'production').reduce((acc, t) => acc + t.amount, 0);
          const donaIncome = txs.filter(t => t.type === 'donation').reduce((acc, t) => acc + t.amount, 0);
          
          const activeCount = songs.filter(s => s.isInteractiveActive).length;
          const missingCount = songs.filter(s => !s.lyrics || !s.audioUrl || !s.isrc).length;

          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome,
              activeSongs: activeCount,
              missingDataSongs: missingCount
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions, songs]);

  // --- Handlers ---

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
      if (!window.confirm(`⚠️ DANGER: Are you sure you want to delete ${selectedIds.size} songs?\nThis action cannot be undone.`)) return;
      
      for (const id of selectedIds) {
          await deleteSong(id);
      }
      setSelectedIds(new Set());
  };

  const handleToggleInteractive = async (song: Song, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      
      if (!song.audioUrl && !song.isInteractiveActive) {
          alert("無法啟用：此作品尚未設定音源 (Missing Audio Source)。\n請先進入編輯模式加入 Dropbox/GoogleDrive 「檔案」連結 (非資料夾)。");
          return;
      }
      if (!song.lyrics && !song.isInteractiveActive) {
          alert("無法啟用：此作品無歌詞文本 (Missing Lyrics)。\n請先填寫歌詞。");
          return;
      }
      if (song.language === Language.Instrumental && !song.isInteractiveActive) {
          if (!window.confirm("警告：此為純音樂 (Instrumental) 作品。\n啟用互動模式可能無法對齊歌詞。確定要啟用嗎？")) return;
      }
      await updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive });
  };

  const savePlatformConfig = () => { 
    localStorage.setItem('willwi_platform_config', JSON.stringify(platformConfig)); 
    localStorage.setItem('willwi_home_player_config', JSON.stringify({
        title: platformConfig.homeTitle,
        youtubeUrl: platformConfig.youtubeFeaturedUrl
    }));
    alert("全站設定已儲存 (System Config Saved)。"); 
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
            // Fix: explicit type check for result string instead of unsafe casting/conversion
            const target = event.target;
            const result = target?.result;
            
            if (typeof result !== 'string') return;

            const data = JSON.parse(result);
            if (Array.isArray(data)) {
                if (window.confirm(`即將匯入 ${data.length} 筆資料。\n[OK]: 清空並覆寫 (Overwrite)\n[Cancel]: 取消`)) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    window.location.reload();
                }
            } else alert("Invalid JSON format.");
          } catch (e) { alert("Import Failed."); }
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
              localStorage.setItem(`qr_${key}`, base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const saveAccessCode = () => {
      localStorage.setItem('willwi_access_code', accessCode);
      alert("通行碼已更新 (Access Code Updated)");
  };

  // --- Filtering & Sorting Logic ---
  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.isrc && s.isrc.includes(searchTerm)) ||
          (s.upc && s.upc.includes(searchTerm))
      );

      if (filterStatus === 'active') result = result.filter(s => s.isInteractiveActive);
      if (filterStatus === 'inactive') result = result.filter(s => !s.isInteractiveActive);
      if (filterStatus === 'missing_assets') result = result.filter(s => !s.lyrics || !s.audioUrl || !s.isrc);

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
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('Access Denied'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-accent transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">Unlock System</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      {/* 1. HEADER & GLOBAL ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Database Manager</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg shadow-brand-accent/20 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                New Song
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">
                Exit
            </button>
          </div>
      </div>

      {/* 2. KPI DASHBOARD STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl hover:border-brand-gold/30 transition-all group cursor-pointer" onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-brand-gold">Total Catalog</div>
              <div className="text-3xl font-black text-white">{songs.length} <span className="text-xs font-medium text-slate-600">Tracks</span></div>
          </div>
          <div className={`bg-slate-900 border border-white/5 p-5 rounded-xl hover:border-emerald-500 transition-all cursor-pointer ${activeTab === 'curation' ? 'border-l-4 border-l-emerald-500 bg-slate-800' : ''}`} onClick={() => setActiveTab('curation')}>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Interactive Control</div>
              <div className="text-3xl font-black text-emerald-400">{stats.activeSongs} <span className="text-xs font-medium text-emerald-900">Active</span></div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl hover:border-red-500/30 transition-all">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Missing Assets</div>
              <div className="text-3xl font-black text-red-400">{stats.missingDataSongs} <span className="text-xs font-medium text-red-900">Alerts</span></div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl hidden lg:block">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Production Rev</div>
              <div className="text-3xl font-black text-white">NT$ {(stats.incomeProduction/1000).toFixed(1)}k</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl cursor-pointer hover:bg-slate-800 transition-all flex items-center justify-center border-l-4 border-l-brand-gold" onClick={() => setActiveTab('payment')}>
              <div className="text-center">
                  <div className="text-2xl mb-1">💰</div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white">Payment & QR</span>
              </div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl cursor-pointer hover:bg-slate-800 transition-all flex items-center justify-center" onClick={() => setActiveTab('settings')}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">⚙ System Settings</span>
          </div>
      </div>

      {activeTab === 'catalog' && (
          <div className="animate-fade-in space-y-4">
              {/* 3. TOOLBAR (Search & Filters) */}
              <div className="bg-slate-900/50 border border-white/10 p-2 rounded-lg flex flex-col md:flex-row gap-2 sticky top-20 z-30 backdrop-blur-xl shadow-2xl">
                  <div className="flex-1 relative">
                      <input 
                          type="text" 
                          placeholder="Search Title, ISRC, UPC..." 
                          className="w-full bg-black/50 border border-transparent focus:border-brand-accent/50 rounded-md pl-10 pr-4 py-3 text-white text-xs font-bold tracking-wider outline-none transition-all" 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)} 
                      />
                      <svg className="w-4 h-4 text-slate-500 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto">
                      <select 
                          className="bg-black/50 border border-transparent text-slate-300 text-xs font-bold px-4 py-3 rounded-md outline-none cursor-pointer hover:text-white appearance-none"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                          <option value="all">Status: All</option>
                          <option value="active">Interactive: ON</option>
                          <option value="inactive">Interactive: OFF</option>
                          <option value="missing_assets">⚠️ Missing Data</option>
                      </select>

                      {/* Bulk Actions Button (Visible only when selected) */}
                      {selectedIds.size > 0 && (
                          <button 
                              onClick={handleBulkDelete}
                              className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-md shadow-lg hover:bg-red-500 transition-all flex items-center gap-2 whitespace-nowrap animate-fade-in"
                          >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete ({selectedIds.size})
                          </button>
                      )}
                  </div>
              </div>

              {/* 4. MAIN DATA TABLE */}
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl min-h-[500px]">
                  <table className="w-full text-left border-collapse table-auto">
                      <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                              <th className="p-4 w-12 text-center bg-black">
                                  <input type="checkbox" className="accent-brand-gold cursor-pointer" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredSongs.length} />
                              </th>
                              <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>Track Info {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                              <th className="p-4 hidden md:table-cell cursor-pointer hover:text-white" onClick={() => handleSort('releaseDate')}>Release {sortConfig.key === 'releaseDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                              <th className="p-4 text-center">Interactive</th>
                              <th className="p-4 text-center hidden sm:table-cell">Assets</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => {
                              const isSelected = selectedIds.has(song.id);
                              const isMissingAssets = !song.lyrics || !song.audioUrl || !song.isrc;
                              
                              return (
                                  <tr 
                                      key={song.id} 
                                      onClick={() => navigate(`/song/${song.id}`)}
                                      className={`group transition-all duration-200 cursor-pointer ${isSelected ? 'bg-brand-gold/10' : 'hover:bg-white/[0.03]'}`}
                                  >
                                      {/* Checkbox */}
                                      <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); handleSelectOne(song.id); }}>
                                          <input type="checkbox" className="accent-brand-gold cursor-pointer w-4 h-4" checked={isSelected} readOnly />
                                      </td>

                                      {/* Track Info */}
                                      <td className="p-4">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 bg-slate-800 rounded overflow-hidden shadow-lg border border-white/10 group-hover:border-white/30 transition-all flex-shrink-0">
                                                  <img src={song.coverUrl} className="w-full h-full object-cover" alt="" />
                                              </div>
                                              <div>
                                                  <div className={`font-bold text-sm mb-1 line-clamp-1 ${song.isInteractiveActive ? 'text-white' : 'text-slate-400'}`}>{song.title}</div>
                                                  <div className="flex gap-2">
                                                      <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-slate-500 border border-white/5">{song.isrc || 'NO ISRC'}</span>
                                                      <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-slate-500 border border-white/5 hidden lg:inline-block">{song.language}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </td>

                                      {/* Release Date */}
                                      <td className="p-4 hidden md:table-cell">
                                          <div className="text-xs font-mono text-slate-400">{song.releaseDate}</div>
                                          <div className="text-[9px] text-slate-600 mt-1">{song.releaseCategory}</div>
                                      </td>

                                      {/* Interactive Toggle */}
                                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                          <button 
                                              onClick={(e) => handleToggleInteractive(song, e)}
                                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${song.isInteractiveActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                          >
                                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${song.isInteractiveActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                          </button>
                                          {song.isInteractiveActive && (
                                              <div className="text-[8px] font-black uppercase text-emerald-500 mt-1 tracking-widest">Active</div>
                                          )}
                                      </td>

                                      {/* Asset Status */}
                                      <td className="p-4 hidden sm:table-cell">
                                          <div className="flex justify-center gap-2">
                                              <span title="Audio Source" className={`w-2 h-2 rounded-full ${song.audioUrl ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'bg-slate-700'}`}></span>
                                              <span title="Lyrics" className={`w-2 h-2 rounded-full ${song.lyrics ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]' : 'bg-slate-700'}`}></span>
                                              <span title="Smart Link" className={`w-2 h-2 rounded-full ${song.smartLink ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'bg-slate-700'}`}></span>
                                          </div>
                                          {isMissingAssets && <div className="text-[8px] text-red-500 font-bold text-center mt-1">MISSING</div>}
                                      </td>

                                      {/* Actions */}
                                      <td className="p-4 text-right">
                                          <button onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }} className="text-[10px] font-black text-slate-300 hover:text-white border border-white/10 hover:border-white bg-black/20 px-3 py-2 rounded transition-all">
                                              EDIT
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
                  
                  {filteredSongs.length === 0 && (
                      <div className="p-20 text-center text-slate-500 text-xs font-mono uppercase tracking-widest">
                          No tracks found matching your filters.
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 5. SELECTION CURATION TAB (NEW) */}
      {activeTab === 'curation' && (
          <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl">
                  <div className="mb-8">
                      <h3 className="text-xl font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Interactive Control Panel</h3>
                      <p className="text-slate-500 text-xs">Curate the songs available for public selection in the Interactive Lab.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {songs.sort((a,b) => (b.isInteractiveActive === a.isInteractiveActive) ? 0 : b.isInteractiveActive ? 1 : -1).map(song => {
                          const hasAudio = !!song.audioUrl;
                          const hasLyrics = !!song.lyrics;
                          const isReady = hasAudio && hasLyrics;
                          const isInstrumental = song.language === Language.Instrumental;
                          
                          return (
                              <div key={song.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${song.isInteractiveActive ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-black/20 border-white/5'}`}>
                                  <div className="flex items-center gap-6">
                                      <img src={song.coverUrl} className="w-16 h-16 object-cover rounded shadow-lg opacity-80" alt="" />
                                      <div>
                                          <h4 className={`text-sm font-black uppercase tracking-widest ${song.isInteractiveActive ? 'text-white' : 'text-slate-400'}`}>{song.title}</h4>
                                          <div className="flex gap-2 mt-2">
                                              {!hasAudio && <span className="text-[9px] bg-red-900 text-red-300 px-2 py-0.5 rounded font-bold uppercase">No Audio</span>}
                                              {!hasLyrics && <span className="text-[9px] bg-red-900 text-red-300 px-2 py-0.5 rounded font-bold uppercase">No Lyrics</span>}
                                              {isInstrumental && <span className="text-[9px] bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded font-bold uppercase">Instrumental</span>}
                                              {song.isInteractiveActive && <span className="text-[9px] bg-emerald-500 text-black px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">LIVE ON SITE</span>}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 pr-4">
                                      <label className="flex items-center cursor-pointer">
                                          <div className="relative">
                                              <input 
                                                  type="checkbox" 
                                                  className="sr-only" 
                                                  checked={!!song.isInteractiveActive}
                                                  disabled={!isReady && !song.isInteractiveActive} // Prevent enabling if broken
                                                  onChange={() => handleToggleInteractive(song)}
                                              />
                                              <div className={`block w-14 h-8 rounded-full transition-colors ${song.isInteractiveActive ? 'bg-emerald-500' : 'bg-slate-700'} ${(!isReady && !song.isInteractiveActive) ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${song.isInteractiveActive ? 'transform translate-x-6' : ''}`}></div>
                                          </div>
                                      </label>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* 6. PAYMENT & QR SETTINGS (NEW) */}
      {activeTab === 'payment' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl">
                  <div className="mb-8">
                      <h3 className="text-xl font-black text-brand-gold uppercase tracking-[0.3em] mb-2">QR Code Manager</h3>
                      <p className="text-slate-500 text-xs">Upload your QR codes here. They will automatically appear in the payment modal.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Access Code Settings */}
                      <div className="col-span-full p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex flex-col md:flex-row gap-6 items-center justify-between">
                          <div>
                              <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-1">Anti-Overuse Protection</h4>
                              <p className="text-slate-400 text-[10px] leading-relaxed">Set a "Passcode" to prevent unauthorized access.<br/>Users must enter this code after transferring money.</p>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  value={accessCode} 
                                  onChange={(e) => setAccessCode(e.target.value)} 
                                  className="bg-black border border-emerald-500/50 px-4 py-2 text-white font-mono text-lg text-center w-32 rounded focus:outline-none focus:border-emerald-400"
                              />
                              <button onClick={saveAccessCode} className="px-6 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded hover:bg-emerald-500 transition-all">
                                  Set Code
                              </button>
                          </div>
                      </div>

                      {[
                          { key: 'global_payment', label: 'Universal Payment QR (Line Pay)', desc: '★ DEFAULT for all payments (if specific one is missing)' },
                          { key: 'line', label: 'LINE Official Account QR', desc: 'For user verification / Add Friend' },
                          { key: 'production', label: 'Interactive (Resonance) QR', desc: 'Specific QR for NT$ 320' },
                          { key: 'cinema', label: 'Cloud Cinema QR', desc: 'Specific QR for NT$ 2,800' },
                          { key: 'support', label: 'Support QR', desc: 'Specific QR for Donation' },
                      ].map((item) => (
                          <div key={item.key} className={`p-6 border rounded-xl transition-all ${item.key === 'global_payment' ? 'bg-brand-gold/10 border-brand-gold/50' : 'bg-black/40 border-white/5'}`}>
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <h4 className={`text-xs font-bold uppercase tracking-widest ${item.key === 'global_payment' ? 'text-brand-gold' : 'text-white'}`}>{item.label}</h4>
                                      <p className="text-[9px] text-slate-500 mt-1">{item.desc}</p>
                                  </div>
                                  {qrImages[item.key as keyof typeof qrImages] && <span className="text-[9px] text-green-500 font-bold">ACTIVE</span>}
                              </div>
                              
                              <div className="aspect-square bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden mb-4 relative group">
                                  {qrImages[item.key as keyof typeof qrImages] ? (
                                      <img src={qrImages[item.key as keyof typeof qrImages]} className="w-full h-full object-contain" alt={item.label} />
                                  ) : (
                                      <span className="text-slate-600 text-[9px] uppercase tracking-widest">No Image</span>
                                  )}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">Change</span>
                                  </div>
                              </div>

                              <label className="block w-full cursor-pointer">
                                  <div className="w-full py-3 border border-white/20 text-slate-300 font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded text-center">
                                      Upload File
                                  </div>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key as keyof typeof qrImages)} />
                              </label>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 7. SETTINGS TAB */}
      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              
              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl">
                  <h3 className="text-sm font-black text-brand-gold uppercase tracking-[0.3em] mb-6">Global Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Featured YouTube Video ID</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none rounded" 
                               value={platformConfig.youtubeFeaturedUrl} 
                               onChange={e => setPlatformConfig({...platformConfig, youtubeFeaturedUrl: e.target.value})}
                               placeholder="e.g. dQw4w9WgXcQ"
                           />
                      </div>
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Default Copyright Owner</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none rounded" 
                               value={platformConfig.defaultCompany} 
                               onChange={e => setPlatformConfig({...platformConfig, defaultCompany: e.target.value})}
                           />
                      </div>
                  </div>
                  <div className="mt-6 text-right">
                      <button onClick={savePlatformConfig} className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-brand-gold transition-all rounded shadow-lg">
                          Save Changes
                      </button>
                  </div>
              </div>

              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl">
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] mb-6">Data Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-black/40 border border-white/5 rounded-lg hover:border-brand-gold/30 transition-all">
                          <h4 className="text-white text-xs font-bold mb-2">Backup Database</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Export all song data as a JSON file for safety.</p>
                          <button onClick={downloadFullBackup} className="w-full py-3 bg-slate-800 text-white font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">
                              Download JSON
                          </button>
                      </div>
                      <div className="p-6 bg-black/40 border border-white/5 rounded-lg hover:border-red-500/30 transition-all">
                          <h4 className="text-white text-xs font-bold mb-2">Restore Database</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Overwrite current data with a backup file. <span className="text-red-500 font-bold">Irreversible.</span></p>
                          <div className="relative">
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-red-900/40 text-red-500 font-black text-[9px] uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all rounded">
                                  Upload & Replace
                              </button>
                              <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;