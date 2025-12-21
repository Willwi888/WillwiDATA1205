import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, Language, ProjectType } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, addSong, deleteSong } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          youtubeUrl: '',
          audioUrl: ''
      };
      if (await addSong(newSong)) {
          alert(`《${track.name}》已同步至作品庫。`);
          setTrackResults([]);
          setSearchQuery('');
      }
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
            
            // Scenario 1: Interactive Studio Archive (Single Object Sync)
            if (data.id && (data.id.startsWith('PROD-') || data.id.startsWith('archive-'))) {
                const existing = songs.find(s => s.title === data.title);
                if (existing) {
                    if (window.confirm(`檢測到聽眾對《${data.title}》的參與數據，是否合併至現有作品？`)) {
                        await updateSong(existing.id, {
                            description: data.description || existing.description, 
                            credits: `${existing.credits || ''}\n[聽眾參與: ${data.listener_info?.name || '匿名'}]`
                        });
                        alert("聽眾數據同步成功！(User Session Merged)");
                    }
                } else {
                    alert("找不到對應歌曲，無法同步。");
                }
            } 
            // Scenario 2: Full Database Backup (Array of Songs)
            else if (Array.isArray(data)) {
                const isValidBackup = data.length > 0 && data.every((item: any) => 
                    typeof item === 'object' && 
                    'id' in item && 
                    'title' in item
                );

                if (!isValidBackup) {
                    alert("錯誤：檔案格式不符。請確認這是 Willwi DB 的標準備份檔 (JSON Array)。");
                    return;
                }

                const confirmMsg = `【危險操作】\n\n即將匯入 ${data.length} 筆作品資料。\n這將會「清空並覆寫」目前的資料庫。\n\n確定要執行嗎？`;
                
                if (window.confirm(confirmMsg)) {
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

  // Helper to extract Spotify ID for embedding
  const getSpotifyEmbedId = (link?: string, id?: string) => {
      if (id) return id;
      if (!link) return null;
      try {
          const url = new URL(link);
          const parts = url.pathname.split('/');
          const trackIndex = parts.indexOf('track');
          if (trackIndex !== -1 && parts[trackIndex + 1]) {
              return parts[trackIndex + 1];
          }
      } catch (e) { return null; }
      return null;
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in pb-40">
      <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Command Center</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Manage Assets & Financials</p>
          </div>
          <button onClick={logoutAdmin} className="text-[10px] font-bold text-red-500 border border-red-900/40 px-6 py-2 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">
              Log Out / 登出
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: STATS & TOOLS */}
        <div className="lg:col-span-4 space-y-10">
            {/* FINANCIAL STATS */}
            <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                 <div className="bg-white/5 px-8 py-6 border-b border-white/5">
                     <h2 className="text-xs font-black text-brand-gold uppercase tracking-[0.3em]">Performance Data</h2>
                 </div>
                 <div className="p-8 grid grid-cols-1 gap-8">
                      <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Participants / 總參與人數</p>
                          <p className="text-4xl font-black text-white font-mono">{stats.totalUsers}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                          <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Donation (Thermal)</p>
                              <p className="text-xl font-black text-white font-mono">NT$ {stats.incomeDonation.toLocaleString()}</p>
                          </div>
                          <div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Production (Lyrics)</p>
                              <p className="text-xl font-black text-brand-accent font-mono">NT$ {stats.incomeProduction.toLocaleString()}</p>
                          </div>
                      </div>
                      <div className="pt-6 border-t border-white/5">
                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                           <p className="text-2xl font-black text-white font-mono">NT$ {(stats.incomeDonation + stats.incomeProduction).toLocaleString()}</p>
                      </div>
                 </div>
            </div>

            {/* SEARCH & IMPORT */}
            <div className="bg-slate-900 p-8 border border-white/10 rounded-xl shadow-2xl">
                 <h2 className="text-xs font-black text-brand-accent mb-6 uppercase tracking-[0.3em]">作品檢索同步 (Spotify)</h2>
                 <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="輸入關鍵字..." className="flex-1 bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                    <button onClick={handleSearch} className="px-4 py-3 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded">{isSearching ? '...' : '搜尋'}</button>
                 </div>
                 <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                     {trackResults.map(t => (
                         <div key={t.id} onClick={() => handleSpotifyImport(t)} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all rounded">
                             <img src={t.album.images[2]?.url} className="w-8 h-8 rounded" alt="" />
                             <div className="flex-1 overflow-hidden">
                                 <div className="text-white text-[10px] font-bold truncate">{t.name}</div>
                                 <div className="text-slate-500 text-[9px] truncate">{t.album.name}</div>
                             </div>
                             <div className="text-brand-accent text-[8px] font-black">IMPORT</div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* GLOBAL CONFIG & BACKUP */}
            <div className="bg-slate-900 p-8 border border-white/5 rounded-xl shadow-2xl">
                <h2 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">System Config</h2>
                <div className="space-y-6">
                    <div>
                         <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">Home Video ID</label>
                         <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" placeholder="YouTube ID" value={platformConfig.youtubeFeaturedUrl} onChange={e => setPlatformConfig({...platformConfig, youtubeFeaturedUrl: e.target.value})} />
                    </div>
                    <button onClick={savePlatformConfig} className="w-full py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                        Update Config (更新設定)
                    </button>
                    
                    <div className="pt-6 border-t border-white/10 space-y-4">
                        <div className="bg-brand-gold/10 p-4 border border-brand-gold/20">
                            <p className="text-[9px] text-brand-gold mb-3 font-bold uppercase tracking-widest">Database Backup</p>
                            <button onClick={downloadFullBackup} className="w-full py-3 bg-brand-gold text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all mb-3">
                                下載完整備份 (Backup JSON)
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-brand-gold/30 text-brand-gold font-black text-[10px] uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all">
                                還原資料庫 (Restore DB)
                            </button>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                        </div>
                        <div className="text-[9px] text-slate-600 leading-relaxed text-center space-y-1">
                            <p>⚠️ 上線前建議：</p>
                            <p>1. 完成所有歌曲資料輸入。</p>
                            <p>2. 點擊「下載完整備份」保存至您的電腦。</p>
                            <p>3. 若更換裝置或瀏覽器，可使用還原功能。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: CATALOG LIST */}
        <div className="lg:col-span-8 space-y-10">
            <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Catalog Management</h2>
                    <span className="text-[10px] text-slate-500 font-mono">TRACKS: {songs.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Audio (Monitor)</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {songs.map(song => {
                                const spotifyEmbedId = getSpotifyEmbedId(song.spotifyLink, song.spotifyId);
                                return (
                                <tr key={song.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 flex items-center gap-4 min-w-[200px]">
                                        <div className="relative w-10 h-10 group cursor-pointer" onClick={() => navigate(`/song/${song.id}`)}>
                                            <img src={song.coverUrl} className="w-full h-full object-cover border border-white/10" alt="" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-bold">EDIT</div>
                                        </div>
                                        <div>
                                            <div className="text-white text-xs font-bold">{song.title}</div>
                                            <div className="text-slate-500 text-[9px]">{song.isrc || 'NO_ISRC'}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 min-w-[250px]">
                                        {song.audioUrl ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></div>
                                                     <span className="text-[8px] text-brand-gold font-bold uppercase tracking-widest">Raw Source</span>
                                                </div>
                                                <audio controls src={song.audioUrl} className="w-full h-6 block rounded bg-slate-800" />
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest border border-red-900/50 px-2 py-1">Missing Audio</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {song.lyrics ? (
                                                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">● Lyrics OK</span>
                                            ) : (
                                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">○ No Lyrics</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => navigate(`/song/${song.id}`)} className="text-[9px] border border-white/10 px-3 py-1 hover:bg-white hover:text-black transition-all font-bold">EDIT</button>
                                            <button onClick={() => { if(window.confirm('Delete this track?')) deleteSong(song.id); }} className="text-[9px] border border-red-900/30 text-red-500 px-3 py-1 hover:bg-red-500 hover:text-white transition-all font-bold">DEL</button>
                                        </div>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;