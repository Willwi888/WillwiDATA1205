import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, Language, ProjectType } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

type Tab = 'dashboard' | 'catalog' | 'import' | 'settings';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, addSong, deleteSong } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Stats
  const [stats, setStats] = useState({
      totalUsers: 0,
      incomeProduction: 0,
      incomeDonation: 0
  });

  // Search & Import
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);

  // Catalog Filter
  const [catalogFilter, setCatalogFilter] = useState('');

  // Global Brand Configuration
  const [platformConfig, setPlatformConfig] = useState({
    defaultCompany: 'Willwi Music',
    defaultProject: ProjectType.Indie,
    youtubeFeaturedUrl: '',
    homeTitle: ''
  });

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_platform_config');
      if (savedConfig) setPlatformConfig(JSON.parse(savedConfig));
      
      if (isAdmin) {
          const users = getAllUsers();
          const txs = getAllTransactions();
          const prodIncome = txs.filter(t => t.type === 'production').reduce((acc, t) => acc + t.amount, 0);
          const donaIncome = txs.filter(t => t.type === 'donation').reduce((acc, t) => acc + t.amount, 0);
          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions]);

  const handleSpotifyImport = async (track: SpotifyTrack) => {
      const newSong: Song = {
          id: Date.now().toString(),
          title: track.name,
          coverUrl: track.album.images[0]?.url || '',
          language: Language.Mandarin,
          projectType: platformConfig.defaultProject,
          releaseCompany: platformConfig.defaultCompany,
          releaseDate: track.album.release_date,
          isrc: track.external_ids.isrc,
          upc: track.album.external_ids?.upc,
          spotifyLink: track.external_urls.spotify,
          isEditorPick: false,
          isInteractiveActive: false,
          youtubeUrl: '',
          audioUrl: ''
      };
      if (await addSong(newSong)) {
          alert(`《${track.name}》已同步至作品庫。`);
          setTrackResults([]);
          setSearchQuery('');
          setActiveTab('catalog'); // Switch to catalog to see result
      }
  };

  const handleToggleInteractive = async (song: Song) => {
      if (!song.audioUrl && !song.isInteractiveActive) {
          alert("無法啟用：此作品尚未設定音源 (Missing Audio)。請先編輯並加入 MP3 連結。");
          return;
      }
      const newValue = !song.isInteractiveActive;
      await updateSong(song.id, { isInteractiveActive: newValue });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchSpotifyTracks(searchQuery);
    setTrackResults(results);
    setIsSearching(false);
  };

  const savePlatformConfig = () => { 
    localStorage.setItem('willwi_platform_config', JSON.stringify(platformConfig)); 
    localStorage.setItem('willwi_home_player_config', JSON.stringify({
        title: platformConfig.homeTitle,
        youtubeUrl: platformConfig.youtubeFeaturedUrl
    }));
    alert("全局品牌設定已更新 (Global Config Saved)。"); 
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_FULL_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          try {
            const jsonStr = event.target?.result as string;
            if (!jsonStr) throw new Error("Empty file content");

            const data = JSON.parse(jsonStr);
            
            if (Array.isArray(data)) {
                const isValidBackup = data.length > 0 && data.every((item: any) => 
                    typeof item === 'object' && 'id' in item && 'title' in item
                );

                if (!isValidBackup) {
                    alert("錯誤：檔案格式不符。請確認這是 Willwi DB 的標準備份檔 (JSON Array)。");
                    return;
                }

                if (window.confirm(`【危險操作】\n\n即將匯入 ${data.length} 筆作品資料。\n這將會「清空並覆寫」目前的資料庫。\n\n確定要執行嗎？`)) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    alert("資料庫還原成功！頁面將重新載入。");
                    window.location.reload();
                }
            } else {
                alert("無法識別的 JSON 格式。");
            }
          } catch (e) { 
            console.error(e);
            alert("讀取或是解析檔案失敗 (JSON Parse Error)。"); 
          }
          finally { 
              setIsProcessing(false); 
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-accent transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(251,191,36,0.2)]">Unlock System</button>
                   </form>
               </div>
          </div>
      );
  }

  const filteredSongs = songs.filter(s => 
      s.title.toLowerCase().includes(catalogFilter.toLowerCase()) || 
      (s.isrc && s.isrc.includes(catalogFilter))
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Database Manager</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-6 py-3 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all">
                + New Song
            </button>
            <button onClick={logoutAdmin} className="px-6 py-3 border border-red-900/40 text-red-500 text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-900/20 transition-all">
                Log Out
            </button>
          </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex overflow-x-auto border-b border-white/10 mb-10 gap-8">
          {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'catalog', label: 'Catalog Manager' },
              { id: 'import', label: 'Smart Import' },
              { id: 'settings', label: 'System Settings' }
          ].map(tab => (
              <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-brand-gold text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* --- TAB CONTENT --- */}

      {/* 1. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl relative overflow-hidden group">
                  <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-brand-gold/5 rounded-full blur-2xl group-hover:bg-brand-gold/10 transition-all"></div>
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Participants</h3>
                  <p className="text-5xl font-black text-white font-mono">{stats.totalUsers}</p>
                  <p className="text-[9px] text-slate-600 mt-4 uppercase tracking-widest">Registered Users</p>
              </div>

              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl relative overflow-hidden group">
                  <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-all"></div>
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Production Revenue</h3>
                  <p className="text-5xl font-black text-brand-accent font-mono">NT$ {stats.incomeProduction.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-600 mt-4 uppercase tracking-widest">Interactive Sessions</p>
              </div>

              <div className="bg-slate-900 border border-white/10 p-8 rounded-xl relative overflow-hidden group">
                  <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all"></div>
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Thermal Support</h3>
                  <p className="text-5xl font-black text-orange-400 font-mono">NT$ {stats.incomeDonation.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-600 mt-4 uppercase tracking-widest">Pure Donations</p>
              </div>
          </div>
      )}

      {/* 2. CATALOG MANAGER */}
      {activeTab === 'catalog' && (
          <div className="animate-fade-in space-y-6">
              <div className="flex gap-4">
                  <input 
                      type="text" 
                      placeholder="Filter by Title or ISRC..." 
                      className="flex-1 bg-slate-900 border border-white/10 px-6 py-4 text-white text-xs outline-none focus:border-white/30 font-mono uppercase" 
                      value={catalogFilter} 
                      onChange={e => setCatalogFilter(e.target.value)} 
                  />
                  <div className="bg-slate-900 border border-white/10 px-6 py-4 text-white text-xs font-mono uppercase">
                      Total: {songs.length}
                  </div>
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-black/50 border-b border-white/10">
                          <tr>
                              <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Release Info</th>
                              <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Interactive</th>
                              <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Assets Check</th>
                              <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="p-6">
                                      <div className="flex items-center gap-6">
                                          <div className="w-16 h-16 bg-slate-800 flex-shrink-0 relative overflow-hidden rounded shadow-lg border border-white/5 group-hover:border-white/20 transition-all">
                                              <img src={song.coverUrl} className="w-full h-full object-cover" alt="" />
                                          </div>
                                          <div>
                                              <div className="text-white font-black text-sm mb-1">{song.title}</div>
                                              <div className="flex flex-col gap-0.5">
                                                  <span className="text-[9px] text-slate-500 font-mono tracking-wider">{song.isrc || 'NO ISRC'}</span>
                                                  <span className="text-[9px] text-slate-600 tracking-wider">{song.releaseDate}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                                  
                                  <td className="p-6 text-center">
                                      <button 
                                          onClick={() => handleToggleInteractive(song)}
                                          className={`inline-flex flex-col items-center justify-center w-32 py-2 rounded border transition-all ${song.isInteractiveActive ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-800/50 border-white/5'}`}
                                      >
                                          <div className={`w-2 h-2 rounded-full mb-1.5 ${song.isInteractiveActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                                          <span className={`text-[8px] font-black uppercase tracking-widest ${song.isInteractiveActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                              {song.isInteractiveActive ? 'Active' : 'Closed'}
                                          </span>
                                      </button>
                                  </td>

                                  <td className="p-6">
                                      <div className="flex justify-center gap-2">
                                          <span className={`px-2 py-1 text-[8px] font-bold border rounded uppercase ${song.audioUrl ? 'border-brand-accent/30 text-brand-accent' : 'border-red-900 text-red-700'}`}>
                                              {song.audioUrl ? 'Audio OK' : 'No Audio'}
                                          </span>
                                          <span className={`px-2 py-1 text-[8px] font-bold border rounded uppercase ${song.lyrics ? 'border-brand-gold/30 text-brand-gold' : 'border-slate-700 text-slate-600'}`}>
                                              {song.lyrics ? 'Lyrics OK' : 'No Text'}
                                          </span>
                                      </div>
                                  </td>

                                  <td className="p-6 text-right">
                                      <div className="flex justify-end gap-3">
                                          <button onClick={() => navigate(`/song/${song.id}`)} className="text-[9px] font-black uppercase tracking-widest text-white border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all rounded">
                                              Edit
                                          </button>
                                          <button onClick={() => { if(window.confirm(`Delete "${song.title}"?`)) deleteSong(song.id); }} className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-900/30 px-4 py-2 hover:bg-red-500 hover:text-white transition-all rounded">
                                              Del
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 3. IMPORT CENTER */}
      {activeTab === 'import' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Spotify Quick Import</h3>
                  <div className="space-y-4">
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              placeholder="Search Spotify Tracks..." 
                              className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs outline-none focus:border-brand-accent"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSearch()}
                          />
                          <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest">
                              {isSearching ? '...' : 'Search'}
                          </button>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 mt-4">
                          {trackResults.map(t => (
                              <div key={t.id} className="flex items-center gap-4 p-3 border border-white/5 hover:bg-white/5 transition-all cursor-pointer group" onClick={() => handleSpotifyImport(t)}>
                                  <img src={t.album.images[2]?.url} className="w-10 h-10 shadow-sm" alt="" />
                                  <div className="flex-1 min-w-0">
                                      <div className="text-white text-xs font-bold truncate">{t.name}</div>
                                      <div className="text-slate-500 text-[9px] truncate">{t.album.name} • {t.album.release_date}</div>
                                  </div>
                                  <span className="text-[8px] font-black text-brand-accent border border-brand-accent/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">IMPORT</span>
                              </div>
                          ))}
                          {trackResults.length === 0 && !isSearching && searchQuery && (
                              <p className="text-center text-slate-600 text-[10px] py-4">No results found.</p>
                          )}
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl flex flex-col justify-center items-center text-center">
                   <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6 text-2xl">⚡️</div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Smart Full Import</h3>
                   <p className="text-slate-500 text-xs mb-8 max-w-xs leading-loose">
                       Need to add details manually or import from YouTube/MusicBrainz? Use the advanced editor.
                   </p>
                   <button onClick={() => navigate('/add')} className="px-8 py-4 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">
                       Open Advanced Editor
                   </button>
              </div>
          </div>
      )}

      {/* 4. SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto animate-fade-in space-y-10">
              
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-sm font-black text-brand-gold uppercase tracking-[0.3em] mb-8">Global Configuration</h3>
                  <div className="space-y-6">
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Home Featured Video (YouTube ID)</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none" 
                               value={platformConfig.youtubeFeaturedUrl} 
                               onChange={e => setPlatformConfig({...platformConfig, youtubeFeaturedUrl: e.target.value})}
                               placeholder="e.g. dQw4w9WgXcQ"
                           />
                      </div>
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Default Copyright Holder</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none" 
                               value={platformConfig.defaultCompany} 
                               onChange={e => setPlatformConfig({...platformConfig, defaultCompany: e.target.value})}
                           />
                      </div>
                      <button onClick={savePlatformConfig} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all rounded">
                          Save Configuration
                      </button>
                  </div>
              </div>

              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] mb-8">Database Maintenance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-black/40 border border-white/5 rounded">
                          <h4 className="text-white text-xs font-bold mb-2">Backup</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Download a complete JSON snapshot of your current database.</p>
                          <button onClick={downloadFullBackup} className="w-full py-3 bg-slate-800 text-white font-black text-[9px] uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all rounded">
                              Download JSON
                          </button>
                      </div>
                      <div className="p-6 bg-black/40 border border-white/5 rounded">
                          <h4 className="text-white text-xs font-bold mb-2">Restore</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Overwrite current database with a backup file. <span className="text-red-500">Irreversible.</span></p>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-red-900/40 text-red-500 font-black text-[9px] uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all rounded">
                              Upload & Restore
                          </button>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                      </div>
                  </div>
              </div>

          </div>
      )}

    </div>
  );
};

export default AdminDashboard;