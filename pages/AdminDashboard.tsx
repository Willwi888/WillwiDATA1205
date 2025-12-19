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
    alert("全局品牌設定已更新。"); 
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            // Handle Interactive Studio Sync JSON (PROD- ID)
            if (data.id && (data.id.startsWith('PROD-') || data.id.startsWith('archive-'))) {
                const existing = songs.find(s => s.title === data.title);
                if (existing) {
                    if (window.confirm(`檢測到聽眾對《${data.title}》的參與數據，是否合併至現有作品？`)) {
                        await updateSong(existing.id, {
                            description: data.description, 
                            credits: `${existing.credits || ''}\n[聽眾參與: ${data.listener_info?.name || '匿名'}]`
                        });
                        alert("聽眾數據同步成功！");
                    }
                }
            } else if (Array.isArray(data)) {
                if (window.confirm("偵測到完整備份檔，這將會清空目前所有資料。確定嗎？")) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    window.location.reload();
                }
            }
          } catch (e) { alert("讀取同步檔失敗。"); }
          finally { setIsProcessing(false); }
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
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8888' || passwordInput === 'eloveg2026') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
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

            {/* GLOBAL IDENTITY */}
            <div className="bg-slate-900 p-8 border border-white/5 rounded-xl shadow-2xl">
                <h2 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">Global Config</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">預設發行公司</label>
                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs" value={platformConfig.defaultCompany} onChange={e => setPlatformConfig({...platformConfig, defaultCompany: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">預設專案類型</label>
                        <select className="w-full bg-black border border-white/10 p-3 text-white text-xs" value={platformConfig.defaultProject} onChange={e => setPlatformConfig({...platformConfig, defaultProject: e.target.value as ProjectType})}>
                             {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">首頁 Youtube 影片 ID</label>
                         <input className="w-full bg-black border border-white/10 p-3 text-white text-xs" placeholder="e.g. dQw4w9WgXcQ" value={platformConfig.youtubeFeaturedUrl} onChange={e => setPlatformConfig({...platformConfig, youtubeFeaturedUrl: e.target.value})} />
                    </div>
                    <button onClick={savePlatformConfig} className="w-full py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">更新設定</button>
                    
                    <div className="pt-6 border-t border-white/10">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-white/10 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white transition-all">
                            匯入備份 (JSON)
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: CATALOG LIST */}
        <div className="lg:col-span-8 space-y-10">
            <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">目錄作品管理</h2>
                    <span className="text-[10px] text-slate-500 font-mono">TRACKS: {songs.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Audio (Admin)</th>
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
                                        <img src={song.coverUrl} className="w-10 h-10 object-cover border border-white/10" alt="" />
                                        <div>
                                            <div className="text-white text-xs font-bold">{song.title}</div>
                                            <div className="text-slate-500 text-[9px]">{song.isrc || 'NO_ISRC'}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 min-w-[250px]">
                                        {spotifyEmbedId ? (
                                            <iframe 
                                                src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`} 
                                                width="100%" 
                                                height="80" 
                                                frameBorder="0" 
                                                allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                                loading="lazy"
                                                className="rounded opacity-70 hover:opacity-100 transition-opacity"
                                            ></iframe>
                                        ) : (
                                            <span className="text-[8px] text-slate-600 font-mono uppercase">NO SPOTIFY SOURCE</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded ${song.isEditorPick ? 'bg-brand-accent text-black' : 'bg-slate-800 text-slate-500'}`}>
                                            {song.isEditorPick ? 'Featured' : 'Standard'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => navigate(`/song/${song.id}`)} className="text-[9px] bg-white text-black px-3 py-1 hover:bg-brand-gold uppercase font-bold tracking-widest transition-colors rounded">
                                            Edit
                                        </button>
                                        <button onClick={() => updateSong(song.id, { isEditorPick: !song.isEditorPick })} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold tracking-widest">
                                            {song.isEditorPick ? 'Unfeat' : 'Feat'}
                                        </button>
                                        <button onClick={() => { if(window.confirm('Delete this track?')) deleteSong(song.id); }} className="text-[9px] text-red-900 hover:text-red-500 uppercase font-bold tracking-widest">
                                            Del
                                        </button>
                                    </td>
                                </tr>
                            )})}
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