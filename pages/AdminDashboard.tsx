import React, { useRef, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, Language, ProjectType } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, addSong, deleteSong } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

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
  }, []);

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
          isEditorPick: false
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

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Management Access</h2>
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
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Manage Assets & Identity</p>
          </div>
          <button onClick={logoutAdmin} className="text-[10px] font-bold text-red-500 border border-red-900/40 px-6 py-2 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Exit</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-10">
            {/* SEARCH & IMPORT */}
            <div className="bg-slate-900 p-8 border border-brand-accent/20 rounded shadow-2xl">
                 <h2 className="text-xs font-black text-brand-accent mb-6 uppercase tracking-[0.3em]">作品檢索同步 (Spotify)</h2>
                 <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="輸入關鍵字..." className="flex-1 bg-black border border-white/10 rounded px-4 py-3 text-white text-xs outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                    <button onClick={handleSearch} className="px-4 py-3 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded">{isSearching ? '...' : '搜尋'}</button>
                 </div>
                 <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                     {trackResults.map(t => (
                         <div key={t.id} onClick={() => handleSpotifyImport(t)} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all rounded">
                             <img src={t.album.images[2]?.url} className="w-8 h-8 rounded" />
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
            <div className="bg-slate-900 p-8 border border-white/5 rounded shadow-2xl">
                <h2 className="text-xs font-black text-brand-gold mb-8 uppercase tracking-[0.3em]">全局品牌設定</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">預設發行公司 (Company)</label>
                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs" value={platformConfig.defaultCompany} onChange={e => setPlatformConfig({...platformConfig, defaultCompany: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 mb-2 uppercase font-bold tracking-widest">預設專案類型 (Type)</label>
                        <select className="w-full bg-black border border-white/10 p-3 text-white text-xs" value={platformConfig.defaultProject} onChange={e => setPlatformConfig({...platformConfig, defaultProject: e.target.value as ProjectType})}>
                             {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <button onClick={savePlatformConfig} className="w-full py-4 bg-brand-gold text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">更新設定</button>
                </div>
            </div>

            {/* SYNC IMPORT */}
            <div className="bg-slate-900 p-8 border border-white/5 rounded shadow-2xl">
                <h2 className="text-xs font-black text-white mb-6 uppercase tracking-[0.3em]">聽眾數據同步</h2>
                <p className="text-[10px] text-slate-500 mb-6 leading-relaxed uppercase tracking-widest">匯入由「互動實驗室」產出的 JSON 同步檔案，將聽眾觀點帶入作品敘事。</p>
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">選擇同步檔案</button>
                <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
            </div>
        </div>

        {/* SONG MANAGEMENT LIST */}
        <div className="lg:col-span-8 space-y-10">
            <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">目錄作品管理</h2>
                    <span className="text-[10px] text-slate-500 font-mono">TRACKS: {songs.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/40">
                                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Title / Meta</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Project</th>
                                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {songs.map(song => (
                                <tr key={song.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <img src={song.coverUrl} className="w-8 h-8 object-cover border border-white/10" />
                                            <div>
                                                <div className="text-white text-xs font-bold">{song.title}</div>
                                                <div className="text-slate-500 text-[9px] font-mono">{song.isrc || 'No ISRC'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">{song.releaseCompany || '--'}</span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{song.projectType}</span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => deleteSong(song.id)} className="text-red-900 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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