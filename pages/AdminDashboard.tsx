import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { useToast } from '../components/Layout';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { 
    songs, 
    updateSong, 
    deleteSong, 
    bulkAddSongs, 
    bulkAppendSongs, 
    refreshData,
    globalSettings,
    setGlobalSettings,
    uploadSettingsToCloud,
    isSyncing
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'json' | 'discovery' | 'settings' | 'backup'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  // Fix: Added missing loginError state to track authentication errors
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [upcFilter, setUpcFilter] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  
  // Selection State
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());

  // Spotify Search State
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && s.isrc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.upc && s.upc.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesUpc = !upcFilter || (s.upc && s.upc.includes(upcFilter));
      
      return matchesSearch && matchesUpc;
    });
  }, [songs, searchTerm, upcFilter]);

  const handleAdminPlay = (song: Song) => {
    if (!audioRef.current) return;
    if (adminPlayingId === song.id) {
      audioRef.current.pause();
      setAdminPlayingId(null);
    } else {
      const url = resolveDirectLink(song.audioUrl || song.dropboxUrl || '');
      if (!url) return showToast("此作品尚未配置有效音訊", "error");
      setAdminPlayingId(song.id);
      audioRef.current.src = url;
      audioRef.current.play().catch(() => showToast("播放失敗", "error"));
    }
  };

  const handleQrUpload = (key: 'qr_support' | 'qr_production' | 'qr_cinema' | 'qr_global_payment' | 'portraitUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...globalSettings, [key]: base64 };
        setGlobalSettings(newSettings);
        showToast("資產已暫存");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await uploadSettingsToCloud(globalSettings);
      showToast("全站設定已同步至雲端");
    } catch (e) {
      showToast("同步失敗", "error");
    }
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSearchingSpotify(true);
    try {
      const results = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(results);
      setSelectedSpotifyIds(new Set());
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const toggleCatalogSelection = (id: string) => {
    const next = new Set(selectedCatalogIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCatalogIds(next);
  };

  const toggleSpotifySelection = (id: string) => {
    const next = new Set(selectedSpotifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpotifyIds(next);
  };

  const toggleAllCatalog = () => {
    if (selectedCatalogIds.size === filteredSongs.length) {
      setSelectedCatalogIds(new Set());
    } else {
      setSelectedCatalogIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  const handleBulkToggleInteractive = async () => {
    if (selectedCatalogIds.size === 0) return;
    for (const song of filteredSongs.filter(s => selectedCatalogIds.has(s.id))) {
      await updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive });
    }
    showToast(`已更新 ${selectedCatalogIds.size} 首作品狀態`);
    setSelectedCatalogIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedCatalogIds.size === 0) return;
    if (window.confirm(`確定要刪除選取的 ${selectedCatalogIds.size} 首作品？`)) {
      for (const id of selectedCatalogIds) {
        await deleteSong(id);
      }
      showToast(`已刪除 ${selectedCatalogIds.size} 首作品`);
      setSelectedCatalogIds(new Set());
    }
  };

  const handleBulkImportSpotify = async () => {
    const toImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
    if (toImport.length === 0) return;
    
    const formattedSongs: Song[] = toImport.map(t => {
      const artistNames = t.artists.map(a => a.name).join(', ');
      return {
        id: t.external_ids?.isrc || t.id,
        title: t.name,
        coverUrl: t.album?.images?.[0]?.url || '',
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        // Since track search results don't include total_tracks, default to Single
        releaseCategory: ReleaseCategory.Single,
        releaseDate: t.album?.release_date || new Date().toISOString().split('T')[0],
        isEditorPick: false,
        isInteractiveActive: true,
        isrc: t.external_ids?.isrc || '',
        upc: t.album?.external_ids?.upc || '',
        spotifyLink: t.external_urls?.spotify || '',
        releaseCompany: '',
        publisher: '',
        credits: `Artist: ${artistNames} | © ${new Date().getFullYear()} Willwi Music. All rights reserved.`,
        origin: 'local'
      };
    });

    await bulkAppendSongs(formattedSongs);
    showToast(`成功匯入 ${formattedSongs.length} 首作品`);
    setSpotifyResults([]);
    setSelectedSpotifyIds(new Set());
    setActiveTab('catalog');
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return showToast("JSON 不能為空", "error");
    try {
      const data = JSON.parse(jsonInput);
      if (Array.isArray(data)) {
        if (window.confirm(`確定覆寫資料？`)) {
          await bulkAddSongs(data);
          showToast("資料庫重建完成");
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (e) { showToast("JSON 格式錯誤", "error"); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-8">
        <div className="p-16 max-w-md w-full text-center space-y-12 bg-white/[0.02] border border-white/5 rounded-sm">
          <h2 className="text-4xl font-black text-white uppercase tracking-[0.3em]">Console</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-8">
            <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border-b border-white/20 px-4 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            {/* Fix: Added display for login authentication errors */}
            {loginError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{loginError}</p>}
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-xs hover:bg-white transition-all">Identify Manager</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-40 px-10 md:px-20 animate-fade-in">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      {/* Refined Management Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-10">
        <div>
          <h1 className="text-8xl font-black text-white uppercase tracking-tighter leading-none mb-4">MANAGEMENT</h1>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
             <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">
                HEALTH: {songs.length} TRACKS SYNCHRONIZED
             </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/add')} className="h-12 px-8 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-xl">手動錄入單曲</button>
          <button onClick={logoutAdmin} className="h-12 px-6 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-900/20 transition-all">安全退出</button>
        </div>
      </div>

      {/* Overhauled Navigation Tabs */}
      <div className="flex border-b border-white/5 mb-16 gap-12 overflow-x-auto no-scrollbar">
        {[
          { id: 'catalog', label: '作品列表總庫' },
          { id: 'discovery', label: 'SPOTIFY 採集' },
          { id: 'json', label: '數據中心 (JSON)' },
          { id: 'settings', label: '環境設置' },
          { id: 'backup', label: '數據備份' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab.id ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-10 animate-fade-in">
          {/* Enhanced Controls Bar with UPC Filter */}
          <div className="flex flex-col lg:flex-row justify-between items-end border-b border-white/5 pb-8 gap-6">
            <div className="flex-1 w-full max-w-2xl">
              <input 
                type="text" 
                placeholder="SEARCH TITLE / ISRC / UPC..." 
                className="w-full bg-transparent py-4 text-3xl outline-none text-white font-black uppercase tracking-widest placeholder:text-white/10 focus:placeholder:text-white/20" 
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); setSelectedCatalogIds(new Set()); }} 
              />
            </div>
            
            <div className="flex flex-wrap gap-6 items-center mb-1">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">UPC Filter:</span>
                <input 
                  type="text" 
                  placeholder="EXACT UPC..." 
                  className="bg-white/5 border border-white/10 px-4 py-2 text-[11px] text-white font-black outline-none focus:border-brand-gold rounded-sm w-44 placeholder:text-white/20 transition-all"
                  value={upcFilter}
                  onChange={e => { setUpcFilter(e.target.value); setSelectedCatalogIds(new Set()); }}
                />
              </div>

              {selectedCatalogIds.size > 0 && (
                <div className="flex gap-3 animate-fade-in">
                  <button onClick={handleBulkToggleInteractive} className="h-10 px-5 bg-emerald-600/10 text-emerald-400 border border-emerald-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">切換互動 ({selectedCatalogIds.size})</button>
                  <button onClick={handleBulkDelete} className="h-10 px-5 bg-rose-600/10 text-rose-400 border border-rose-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">批次刪除 ({selectedCatalogIds.size})</button>
                </div>
              )}
            </div>
          </div>
          
          {/* High-Performance Catalog Table */}
          <div className="overflow-x-auto custom-scrollbar bg-[#0a0a0a] border border-white/5 rounded-sm shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                    <tr className="bg-white/[0.02] text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] border-b border-white/10">
                        <th className="p-8 w-12 text-center">
                          <input type="checkbox" className="w-4 h-4 rounded-sm bg-black border border-white/20 checked:bg-brand-gold cursor-pointer transition-all" onChange={toggleAllCatalog} checked={selectedCatalogIds.size > 0 && selectedCatalogIds.size === filteredSongs.length} />
                        </th>
                        <th className="p-8 w-24">AUDITION</th>
                        <th className="p-8">WORK INFORMATION</th>
                        <th className="p-8">RELEASE METADATA</th>
                        <th className="p-8 text-center">STUDIO ACCESS</th>
                        <th className="p-8 text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} className={`group hover:bg-white/[0.01] transition-all duration-300 ${selectedCatalogIds.has(song.id) ? 'bg-brand-gold/5' : ''}`}>
                            <td className="p-8 text-center">
                              <input type="checkbox" className="w-4 h-4 rounded-sm bg-black border border-white/20 checked:bg-brand-gold cursor-pointer transition-all" checked={selectedCatalogIds.has(song.id)} onChange={() => toggleCatalogSelection(song.id)} />
                            </td>
                            <td className="p-8">
                                <button 
                                  onClick={() => handleAdminPlay(song)}
                                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_30px_rgba(251,191,36,0.4)] scale-110' : 'border-white/10 text-white/30 hover:border-white hover:text-white hover:scale-110'}`}
                                >
                                  {adminPlayingId === song.id ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                  ) : (
                                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  )}
                                </button>
                            </td>
                            <td className="p-8">
                                <div className="flex items-center gap-8">
                                    <div className="w-16 h-16 bg-slate-900 border border-white/10 overflow-hidden shadow-2xl shrink-0 rounded-sm">
                                      <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[5s] ease-out" alt="" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black uppercase tracking-wider text-lg mb-2 group-hover:text-brand-gold transition-colors">{song.title}</h4>
                                        <div className="flex items-center gap-4">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{song.projectType || '獨立發行'}</p>
                                            {song.videoUrl && <span className="text-[8px] bg-brand-gold text-black px-2 py-0.5 font-black rounded-[1px] shadow-[0_0_10px_rgba(251,191,36,0.3)]">VIDEO ASSET</span>}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8">
                                <div className="space-y-2">
                                    <p className="text-[11px] text-slate-400 font-mono tracking-widest">{song.isrc || 'NO ISRC REGISTERED'}</p>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <p className="text-[10px] text-slate-600 font-black tracking-[0.2em] uppercase">{song.releaseDate}</p>
                                        <div className="h-3 w-[1px] bg-white/10"></div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">UPC: {song.upc || 'N/A'}</p>
                                    </div>
                                    {song.lyrics && (
                                      <div className="inline-flex items-center gap-2 px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/5 rounded-sm">
                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">LYRICS ACTIVE</span>
                                      </div>
                                    )}
                                </div>
                            </td>
                            <td className="p-8 text-center">
                                <button 
                                  onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} 
                                  className={`text-[10px] font-black uppercase py-3 px-8 rounded-[2px] border transition-all duration-500 ${song.isInteractiveActive ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400 hover:text-black hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-slate-700 border-white/5 bg-transparent hover:border-white/20 hover:text-white'}`}
                                >
                                   {song.isInteractiveActive ? 'STUDIO OPEN' : 'RESTRICTED'}
                                </button>
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex justify-end items-center gap-10">
                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[11px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-widest">EDIT</button>
                                  <button onClick={() => { if (window.confirm(`確定要移除「${song.title}」嗎？`)) deleteSong(song.id); }} className="text-[11px] font-black uppercase text-rose-900/40 hover:text-rose-500 transition-colors tracking-widest">DELETE</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discovery Tab polished */}
      {activeTab === 'discovery' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in py-12">
           <div className="relative group">
             <input 
               type="text" 
               placeholder="ENTER TRACK TITLE FOR SPOTIFY HARVEST..." 
               className="w-full bg-black border border-white/10 px-8 py-8 text-4xl outline-none focus:border-brand-gold text-white font-black uppercase tracking-widest placeholder:text-white/5 transition-all" 
               value={spotifyQuery} 
               onChange={e => setSpotifyQuery(e.target.value)} 
               onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()} 
             />
             <div className="absolute bottom-0 left-0 w-0 group-focus-within:w-full h-1 bg-brand-gold transition-all duration-700"></div>
           </div>
           <button onClick={handleSpotifySearch} className="w-full py-8 bg-brand-gold text-black font-black uppercase tracking-[0.5em] text-xs hover:bg-white transition-all shadow-2xl">INITIATE SPOTIFY SCAN</button>
           
           {spotifyResults.length > 0 && (
             <div className="space-y-8 pt-12 animate-fade-in-up">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                   <h3 className="text-white font-black text-xs uppercase tracking-widest">HARVESTED RESULTS ({spotifyResults.length})</h3>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          if (selectedSpotifyIds.size === spotifyResults.length) setSelectedSpotifyIds(new Set());
                          else setSelectedSpotifyIds(new Set(spotifyResults.map(t => t.id)));
                        }} 
                        className="px-8 py-4 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                      >
                        {selectedSpotifyIds.size === spotifyResults.length ? 'DESELECT ALL' : 'SELECT ALL'}
                      </button>
                      <button 
                        onClick={handleBulkImportSpotify} 
                        className="px-12 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-lg"
                        disabled={selectedSpotifyIds.size === 0}
                      >
                        IMPORT SELECTED ({selectedSpotifyIds.size})
                      </button>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {spotifyResults.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => toggleSpotifySelection(t.id)} 
                          className={`p-6 border flex items-center gap-6 cursor-pointer transition-all ${selectedSpotifyIds.has(t.id) ? 'border-brand-gold bg-brand-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                        >
                            <img src={t.album.images?.[0]?.url} className="w-14 h-14 object-cover shadow-xl" />
                            <div className="overflow-hidden">
                              <span className="block text-sm font-black text-white uppercase truncate mb-1">{t.name}</span>
                              <span className="block text-[10px] text-slate-500 uppercase tracking-widest truncate">{t.artists[0].name}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-[1400px] mx-auto space-y-24 animate-fade-in py-12">
          <div className="space-y-4">
            <h3 className="text-white font-black text-4xl uppercase tracking-widest mb-2">環境設置與資產</h3>
            <p className="text-slate-600 text-[11px] uppercase tracking-widest font-bold">CORE PLATFORM ASSETS & SECURITY CONTROLS</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: 'qr_support', label: '熱能贊助 ($100)' },
              { id: 'qr_production', label: '手作對時 ($320)' },
              { id: 'qr_cinema', label: '大師影視 ($2800)' },
              { id: 'qr_global_payment', label: '通用支付 (GLOBAL)' },
            ].map((qr) => (
              <div key={qr.id} className="bg-[#0f172a]/50 border border-white/5 p-10 rounded-sm text-center flex flex-col items-center group hover:border-brand-gold/30 transition-all shadow-2xl">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 group-hover:text-brand-gold transition-colors">{qr.label}</h4>
                <div className="w-full aspect-square bg-black border border-white/10 rounded-sm mb-10 flex flex-col items-center justify-center p-6 relative group-hover:border-brand-gold/20 transition-all">
                  {(globalSettings as any)[qr.id] ? (
                    <img src={(globalSettings as any)[qr.id]} className="w-full h-full object-contain" alt="" />
                  ) : (
                    <div className="text-center opacity-20 flex flex-col items-center gap-6">
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">OFFLINE</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-4 bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all cursor-pointer border border-white/10 text-center">
                  UPLOAD QR
                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(qr.id as any)} />
                </label>
              </div>
            ))}
          </div>

          <div className="bg-[#0f172a] p-20 border border-white/5 rounded-sm flex flex-col md:flex-row items-center gap-24 shadow-2xl">
             <div className="flex-1 space-y-8">
                <h4 className="text-white font-black text-3xl uppercase tracking-widest leading-none">解鎖通行碼<br/><span className="text-brand-gold text-lg">ACCESS KEY</span></h4>
                <p className="text-slate-600 text-[12px] uppercase tracking-widest font-bold leading-loose max-w-lg">
                    This code acts as the final gate for manual transaction verification. 
                    Changes are synchronized immediately across all active instances.
                </p>
             </div>
             <div className="flex flex-col items-center gap-6">
                 <div className="bg-black border border-white/10 p-12 min-w-[350px] flex flex-col items-center gap-6 group hover:border-brand-gold/50 transition-all duration-1000 shadow-inner">
                    <input 
                        type="text" 
                        className="bg-transparent text-white font-mono text-8xl text-center w-full outline-none tracking-widest selection:bg-brand-gold selection:text-black"
                        value={globalSettings.accessCode}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, accessCode: e.target.value })}
                    />
                    <div className="h-[2px] w-full bg-white/5 group-hover:bg-brand-gold/20 transition-all"></div>
                    <span className="text-[10px] text-slate-700 font-black tracking-[0.6em] uppercase">AES-256 SIMULATED ENCRYPTION</span>
                 </div>
             </div>
          </div>

          <div className="pt-24 border-t border-white/5 space-y-16">
              <div className="text-center space-y-6">
                  <h3 className="text-slate-700 font-black text-[12px] uppercase tracking-[1em]">SYSTEM STABILITY</h3>
                  <p className="text-slate-800 text-[10px] uppercase tracking-widest max-w-2xl mx-auto leading-relaxed font-bold">
                      Perform a Force Refresh if catalog data appears out of sync across devices. 
                      This wipes local IDB cache and re-fetches the master manifest from Supabase.
                  </p>
              </div>
              <div className="flex justify-center gap-8">
                 <button onClick={refreshData} className="px-20 h-16 border border-white/5 text-slate-600 font-black text-[11px] uppercase tracking-[0.5em] hover:text-white hover:border-white/30 transition-all">FORCE REFRESH</button>
                 <button onClick={handleSaveSettings} className="px-20 h-16 bg-brand-gold text-black font-black text-[11px] uppercase tracking-[0.5em] hover:bg-white transition-all shadow-[0_0_50px_rgba(251,191,36,0.1)]">COMMIT & SYNC</button>
              </div>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-12 py-12">
            <div className="bg-[#0f172a] p-12 border border-white/5 rounded-sm shadow-2xl space-y-8">
               <div className="flex justify-between items-center">
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">MASTER JSON MANIFEST</h3>
                  <span className="text-emerald-500 text-[10px] font-mono font-bold uppercase tracking-widest animate-pulse">LIVE EDITING ACTIVE</span>
               </div>
               <textarea 
                 className="w-full h-[600px] bg-black border border-white/10 p-12 text-emerald-400 text-xs font-mono outline-none resize-none custom-scrollbar leading-loose shadow-inner" 
                 value={jsonInput} 
                 onChange={e => setJsonInput(e.target.value)} 
                 placeholder="PASTE JSON DATA HERE..." 
               />
               <div className="flex justify-end gap-6 pt-4">
                  <button onClick={async () => {
                    const all = await dbService.getAllSongs();
                    setJsonInput(JSON.stringify(all, null, 2));
                    showToast("Manifest Loaded");
                  }} className="px-10 py-5 border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">LOAD CLOUD STATE</button>
                  <button onClick={handleJsonImport} className="px-16 py-5 bg-rose-900/60 text-white border border-rose-900/50 font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-xl">🚨 OVERWRITE MASTER DATABASE</button>
               </div>
            </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="max-w-3xl mx-auto text-center space-y-16 py-32 animate-fade-in">
            <div className="space-y-4">
              <h3 className="text-white font-black text-5xl uppercase tracking-tighter">ARCHIVE</h3>
              <p className="text-slate-600 text-[12px] uppercase tracking-[0.6em] font-bold">PROTECT YOUR CREATIVE ASSETS</p>
            </div>
            
            <div className="bg-[#0f172a] p-16 border border-white/5 rounded-sm flex flex-col items-center gap-12">
                <p className="text-slate-400 text-sm leading-loose max-w-md">
                   Download a portable version of your entire discography. 
                   This file includes all metadata, ISRC codes, lyrics, and asset pointers.
                </p>
                <button 
                  onClick={() => {
                      const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `WILLWI_DISCOGRAPHY_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      showToast("Backup Generated");
                  }} 
                  className="px-24 py-10 bg-white text-black font-black uppercase tracking-[0.8em] text-xs hover:bg-brand-gold transition-all shadow-[0_30px_60px_rgba(0,0,0,0.5)] scale-105"
                >
                  GENERATE EXPORT
                </button>
            </div>
        </div>
      )}
    </div>
  );
}; 

export default AdminDashboard;