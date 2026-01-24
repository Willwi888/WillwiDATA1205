
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { useToast } from '../components/Layout';
import { Song } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

type AdminTab = 'catalog' | 'spotify' | 'settings' | 'payment' | 'data';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, refreshData, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, currentSong, setCurrentSong, isPlaying, setIsPlaying 
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSaving, setLocalSaving] = useState(false);
  
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  const toggleAlbum = (upc: string) => {
    const newSet = new Set(expandedAlbums);
    if (newSet.has(upc)) newSet.delete(upc);
    else newSet.add(upc);
    setExpandedAlbums(newSet);
  };

  // 以 UPC 分組專輯邏輯
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    const filtered = songs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm))) ||
        (s.upc && normalizeIdentifier(s.upc).includes(normalizeIdentifier(searchTerm)))
    );

    filtered.forEach(song => {
      const upcKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[upcKey]) groups[upcKey] = [];
      groups[upcKey].push(song);
    });

    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].releaseDate).getTime();
      const dateB = new Date(b[1][0].releaseDate).getTime();
      return dateB - dateA; // 預設新到舊
    });
  }, [songs, searchTerm]);

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id) setIsPlaying(!isPlaying);
    else { setCurrentSong(song); setIsPlaying(true); }
  };

  const handleSpotifySearch = async () => {
      if (!spotifyQuery.trim()) return;
      setIsSearchingSpotify(true);
      try {
          const results = await searchSpotifyTracks(spotifyQuery);
          setSpotifyResults(results);
          if (results.length === 0) showToast("查無結果", "error");
      } catch (err) { showToast("檢索失敗", "error"); }
      finally { setIsSearchingSpotify(false); }
  };

  const handleSaveSettings = async () => {
      setLocalSaving(true);
      const success = await uploadSettingsToCloud(globalSettings);
      setLocalSaving(false);
      if (success) showToast("雲端同步成功");
      else showToast("同步失敗", 'error');
  };

  const updateSettings = (key: string, value: string) => {
      setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleQrUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateSettings(key, reader.result as string);
            showToast("QR 預覽更新 (請儲存以同步)");
        };
        reader.readAsDataURL(file);
    }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black px-4">
               <div className="bg-[#0f172a] border border-white/5 backdrop-blur-3xl rounded-sm p-14 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-10 uppercase tracking-[0.4em]">Manager Vault</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); showToast("權限已解鎖"); } else setLoginError('密碼不正確'); }} className="space-y-8">
                       <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[0.8em] font-mono text-2xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase">{loginError}</p>}
                       <button className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-sm uppercase tracking-widest text-xs">Unlock Console</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1900px] mx-auto px-6 md:px-20 py-48 animate-fade-in pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-10">
          <div>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none">Management</h1>
            <p className="text-white text-[12px] font-black uppercase tracking-[0.5em] mt-6 underline decoration-brand-gold/30 underline-offset-8">Internal Data Station</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl active:scale-95">New Entry</button>
            <button onClick={logoutAdmin} className="h-14 px-12 border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Logout</button>
          </div>
      </div>

      <div className="flex border-b border-white/10 mb-12 gap-10 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {[
              { id: 'catalog', label: '作品管理' },
              { id: 'spotify', label: 'SPOTIFY 檢索' },
              { id: 'settings', label: '全站設定' },
              { id: 'payment', label: '金流 QR 更新' },
              { id: 'data', label: '資料備份' }
          ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-400 hover:text-white'}`}>
                  {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-10">
                <input type="text" placeholder="SEARCH CATALOG / ISRC / UPC..." className="flex-1 bg-white/[0.03] border border-white/20 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={refreshData} className="px-10 bg-white/5 border border-white/20 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10">Pull Latest</button>
            </div>

            <div className="space-y-6">
                {groupedAlbums.map(([upc, albumSongs]) => {
                    const main = albumSongs[0];
                    const isExpanded = expandedAlbums.has(upc);
                    const isSingle = upc.startsWith('SINGLE_');

                    return (
                        <div key={upc} className="bg-white/[0.02] border border-white/10 rounded-sm overflow-hidden transition-all hover:border-white/20">
                            <div className="flex items-center gap-8 p-8 cursor-pointer group" onClick={() => toggleAlbum(upc)}>
                                <img src={main.coverUrl} className="w-24 h-24 object-cover shadow-2xl border border-white/5" alt="" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-wider group-hover:text-brand-gold transition-colors">{main.title}</h3>
                                        <span className="text-[10px] font-black text-brand-gold border border-brand-gold/30 px-2 py-0.5 rounded-sm">{isSingle ? 'SINGLE' : 'ALBUM'}</span>
                                    </div>
                                    <div className="flex gap-6 mt-3 text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">
                                        <span>UPC: {main.upc || 'N/A'}</span>
                                        <span>RELEASE: {main.releaseDate}</span>
                                        <span className="text-brand-gold">{albumSongs.length} TRACKS</span>
                                    </div>
                                </div>
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-white/5 bg-black/40 animate-fade-in-up">
                                    <table className="w-full text-left">
                                        <thead className="text-[9px] text-slate-600 font-black uppercase tracking-widest border-b border-white/5">
                                            <tr>
                                                <th className="px-8 py-4 w-16">#</th>
                                                <th className="px-8 py-4">Track Title</th>
                                                <th className="px-8 py-4">ISRC</th>
                                                <th className="px-8 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {albumSongs.sort((a,b) => (a.isrc||'').localeCompare(b.isrc||'')).map((track, idx) => (
                                                <tr key={track.id} className="border-b border-white/5 hover:bg-white/5 group/row">
                                                    <td className="px-8 py-6 text-[11px] font-mono text-slate-600">{idx + 1}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={() => handlePlaySong(track)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${currentSong?.id === track.id && isPlaying ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white hover:border-brand-gold'}`}>
                                                                {currentSong?.id === track.id && isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                            </button>
                                                            <div className="font-bold text-white text-sm uppercase tracking-wide">{track.title}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6"><span className="text-[11px] font-mono text-slate-500">{track.isrc}</span></td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <button onClick={() => navigate(`/add?edit=${track.id}`)} className="h-8 px-4 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">Edit</button>
                                                            <button onClick={() => { if(confirm('確定刪除？')) deleteSong(track.id); }} className="h-8 px-4 border border-rose-500 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Del</button>
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

      {activeTab === 'spotify' && (
          <div className="space-y-12 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 mb-16">
                  <input type="text" placeholder="SEARCH SPOTIFY TRACKS TO IMPORT..." className="flex-1 bg-white/[0.03] border border-white/20 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={spotifyQuery} onChange={e => setSpotifyQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()} />
                  <button onClick={handleSpotifySearch} disabled={isSearchingSpotify} className="px-16 bg-brand-gold text-black text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">{isSearchingSpotify ? 'SEARCHING...' : 'DISCOVER'}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {spotifyResults.map(track => (
                      <div key={track.id} className="bg-slate-900/60 border border-white/10 p-8 rounded-sm hover:border-brand-gold transition-all group">
                          <img src={track.album.images[0]?.url} className="w-full aspect-square object-cover mb-6 shadow-2xl group-hover:scale-105 transition-all duration-500" alt="" />
                          <h4 className="text-2xl font-black text-white uppercase truncate">{track.name}</h4>
                          <p className="text-brand-gold text-[10px] font-black uppercase tracking-widest mt-4">ISRC: {track.external_ids.isrc}</p>
                          <button onClick={() => navigate(`/add`, { state: { spotifyImport: track } })} className="w-full py-4 mt-8 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">IMPORT TRACK</button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-fade-in">
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">網站動態背景 (Portrait URL)</h3>
                  <input className="w-full bg-white/[0.03] border border-white/20 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => updateSettings('portraitUrl', e.target.value)} />
              </div>
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">錄音室通行碼 (Access Code)</h3>
                  <input className="w-40 bg-white/[0.03] border border-white/20 p-6 text-white text-3xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => updateSettings('accessCode', e.target.value)} />
              </div>
              <button onClick={handleSaveSettings} disabled={localSaving} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all disabled:opacity-50">{localSaving ? 'SAVING...' : 'SAVE & SYNC'}</button>
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="animate-fade-in space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                  {[
                      { key: 'qr_global_payment', label: '主要收款 (GLOBAL)' },
                      { key: 'qr_production', label: '製作體驗 (STUDIO)' },
                      { key: 'qr_cinema', label: '影院模式 (CINEMA)' },
                      { key: 'qr_support', label: '創作贊助 (SUPPORT)' },
                      { key: 'qr_line', label: 'LINE 官方 (COMM)' }
                  ].map(item => (
                      <div key={item.key} className="bg-white/[0.02] border border-white/10 p-6 rounded-sm text-center">
                          <h4 className="text-[11px] font-black text-white uppercase mb-6 tracking-widest">{item.label}</h4>
                          <div className="w-full aspect-square bg-white flex items-center justify-center relative group overflow-hidden border border-white/5">
                              { (globalSettings as any)[item.key] ? <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain" alt="" /> : <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No QR</div> }
                              <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  UPLOAD NEW
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                              </label>
                          </div>
                      </div>
                  ))}
              </div>
              <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all">SYNC ALL QR ASSETS</button>
          </div>
      )}

      {activeTab === 'data' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/10 p-10 space-y-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest">導出本地數據 (JSON)</h3>
                  <button onClick={async () => {
                      const allSongs = await dbService.getAllSongs();
                      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `WILLWI_DB_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      showToast("備份下載中");
                  }} className="w-full py-6 bg-white text-black font-black text-[11px] uppercase tracking-widest hover:bg-brand-gold transition-all">DOWNLOAD BACKUP</button>
              </div>
          </div>
      )}
    </div>
  );
}; export default AdminDashboard;
