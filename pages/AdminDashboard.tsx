
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { useToast } from '../components/Layout';
import { Song, Language, ProjectType, ReleaseCategory } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

type AdminTab = 'catalog' | 'settings' | 'payment' | 'data';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, refreshData, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, currentSong, setCurrentSong, isPlaying, setIsPlaying,
    bulkAddSongs, updateSong, dbStatus, lastSyncTime, isSyncing
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());

  const [localSaving, setLocalSaving] = useState(false);

  const existingIsres = useMemo(() => new Set(songs.map(s => normalizeIdentifier(s.isrc || ''))), [songs]);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm))) ||
        (s.upc && normalizeIdentifier(s.upc).includes(normalizeIdentifier(searchTerm)));
      
      const matchesLang = filterLang === 'All' || s.language === filterLang;
      const matchesProject = filterProject === 'All' || s.projectType === filterProject;
      const matchesCategory = filterCategory === 'All' || s.releaseCategory === filterCategory;

      return matchesSearch && matchesLang && matchesProject && matchesCategory;
    });
  }, [songs, searchTerm, filterLang, filterProject, filterCategory]);

  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    filteredSongs.forEach(song => {
      const upcKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[upcKey]) groups[upcKey] = [];
      groups[upcKey].push(song);
    });

    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].releaseDate).getTime();
      const dateB = new Date(b[1][0].releaseDate).getTime();
      return dateB - dateA;
    });
  }, [filteredSongs]);

  const toggleAlbum = (upc: string) => {
    const newSet = new Set(expandedAlbums);
    if (newSet.has(upc)) newSet.delete(upc);
    else newSet.add(upc);
    setExpandedAlbums(newSet);
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkToggleStudio = async () => {
    if (selectedIds.size === 0) return;
    const firstSongId = Array.from(selectedIds)[0];
    const firstSong = songs.find(s => s.id === firstSongId);
    if (!firstSong) return;
    
    const targetStatus = !firstSong.isInteractiveActive;
    for (const id of selectedIds) {
      await updateSong(id, { isInteractiveActive: targetStatus });
    }
    showToast(`批量切換 ${selectedIds.size} 首歌曲為 ${targetStatus ? '開啟' : '關閉'}`);
    setSelectedIds(new Set());
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSearchingSpotify(true);
    setSelectedSpotifyIds(new Set());
    try {
      const results = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(results);
      if (results.length === 0) showToast("查無 Spotify 結果", "error");
    } catch (err) {
      showToast("檢索失敗", "error");
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handleSpotifySelectAll = () => {
    const nonExistingTracks = spotifyResults.filter(t => !existingIsres.has(normalizeIdentifier(t.external_ids.isrc || '')));
    if (selectedSpotifyIds.size === nonExistingTracks.length && nonExistingTracks.length > 0) {
      setSelectedSpotifyIds(new Set());
    } else {
      setSelectedSpotifyIds(new Set(nonExistingTracks.map(t => t.id)));
    }
  };

  const toggleSpotifySelection = (id: string, isAlreadyInLibrary: boolean) => {
    if (isAlreadyInLibrary) {
        showToast("作品已存在於庫存中", "error");
        return;
    }
    const newSet = new Set(selectedSpotifyIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSpotifyIds(newSet);
  };

  const handleBulkSpotifyImport = async () => {
    const tracksToImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
    if (tracksToImport.length === 0) return;
    if (!window.confirm(`確定要批量導入 ${tracksToImport.length} 首選取的作品嗎？`)) return;

    const newSongs: Song[] = tracksToImport.map(track => ({
      id: normalizeIdentifier(track.external_ids.isrc || track.id),
      title: track.name,
      coverUrl: track.album.images[0]?.url || '',
      language: Language.Mandarin,
      projectType: ProjectType.Indie,
      releaseCategory: track.album.album_type === 'single' ? ReleaseCategory.Single : ReleaseCategory.Album,
      releaseDate: track.album.release_date || new Date().toISOString().split('T')[0],
      isEditorPick: false,
      isInteractiveActive: true,
      isrc: track.external_ids.isrc,
      spotifyLink: track.external_urls.spotify,
      origin: 'local' as const
    }));

    const success = await bulkAddSongs(newSongs); 
    if (success) {
      showToast(`成功批量導入 ${newSongs.length} 首作品，已同步雲端`);
      setSelectedSpotifyIds(new Set());
      setSpotifyResults([]);
      setShowSpotifySearch(false);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          if (window.confirm(`確認導入 ${data.length} 筆備份資料？現有數據將被覆蓋並同步至雲端。`)) {
            await bulkAddSongs(data);
            showToast("數據備份導入成功");
            setActiveTab('catalog');
          }
        } else {
          showToast("無效的 JSON 格式", "error");
        }
      } catch (err) {
        showToast("解析失敗", "error");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = async () => {
    setLocalSaving(true);
    const success = await uploadSettingsToCloud(globalSettings);
    setLocalSaving(false);
    if (success) showToast("全站設定同步成功");
    else showToast("同步失敗", 'error');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="bg-[#0f172a] border border-white/5 backdrop-blur-3xl rounded-sm p-14 max-w-md w-full shadow-2xl text-center">
          <h2 className="text-2xl font-black text-white mb-10 uppercase tracking-[0.4em]">Manager Vault</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); showToast("權限已解鎖"); } else setLoginError('密碼不正確'); }} className="space-y-8">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[1em] font-mono text-2xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
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

      {/* SYNC & ACTION PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-4 block">雲端同步狀態 (SYNC)</span>
              <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-brand-gold animate-pulse' : dbStatus === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`}></div>
                  <span className="text-sm font-bold text-white uppercase tracking-widest">{isSyncing ? 'SYNCING...' : dbStatus === 'ONLINE' ? 'CONNECTED' : 'OFFLINE'}</span>
              </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-4 block">最後操作紀錄 (LAST ACTION)</span>
              <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-brand-gold uppercase tracking-widest">{globalSettings.lastAction?.type || 'N/A'}</span>
                  <span className="text-[10px] text-white/40 truncate flex-1">{globalSettings.lastAction?.target || ''}</span>
              </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-4 block">最後更新時間 (TIMESTAMP)</span>
              <span className="text-xs font-mono text-white/60">{globalSettings.lastAction?.timestamp ? new Date(globalSettings.lastAction.timestamp).toLocaleString() : 'N/A'}</span>
          </div>
      </div>

      <div className="flex border-b border-white/10 mb-12 gap-10 overflow-x-auto custom-scrollbar whitespace-nowrap">
        {[
          { id: 'catalog', label: '作品管理' },
          { id: 'settings', label: '全站設定' },
          { id: 'payment', label: '金流 QR 更新' },
          { id: 'data', label: '資料備份 (BACKUP)' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white/[0.02] border border-white/10 p-8 rounded-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 relative">
                <input type="text" placeholder="SEARCH TITLE / ISRC / UPC..." className="w-full bg-black border border-white/10 px-8 py-5 text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px] font-black">CLEAR</button>}
              </div>
              <select className="bg-black border border-white/10 text-white text-[11px] font-black px-6 py-5 outline-none focus:border-brand-gold appearance-none uppercase tracking-widest" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
                <option value="All">All Languages</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-black border border-white/10 text-white text-[11px] font-black px-4 py-5 outline-none focus:border-brand-gold appearance-none uppercase tracking-widest" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                  <option value="All">Project</option>
                  {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="bg-black border border-white/10 text-white text-[11px] font-black px-4 py-5 outline-none focus:border-brand-gold appearance-none uppercase tracking-widest" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="All">Category</option>
                  {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-white/5 gap-6">
              <div className="flex gap-4">
                <button onClick={() => setShowSpotifySearch(!showSpotifySearch)} className={`px-10 py-4 border transition-all text-[10px] font-black uppercase tracking-widest ${showSpotifySearch ? 'bg-emerald-500 text-black border-emerald-500' : 'text-emerald-500 border-emerald-500/30'}`}>
                  {showSpotifySearch ? 'CLOSE SPOTIFY' : 'SPOTIFY SEARCH'}
                </button>
                <button onClick={refreshData} className="px-10 py-4 bg-white/5 border border-white/20 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10">Force Pull Cloud</button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-6 animate-fade-in">
                  <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{selectedIds.size} SELECTED</span>
                  <button onClick={handleBulkToggleStudio} className="px-8 py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">Toggle Studio Mode</button>
                  <button onClick={() => { if (confirm('確定刪除選取的項目？此動作將同步至雲端。')) selectedIds.forEach(id => deleteSong(id)); setSelectedIds(new Set()); }} className="px-8 py-3 border border-rose-500 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Bulk Delete</button>
                </div>
              )}
            </div>

            {showSpotifySearch && (
              <div className="pt-8 border-t border-white/5 space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full relative">
                    <input type="text" placeholder="DISCOVER NEW RELEASES ON SPOTIFY..." className="w-full bg-black border border-emerald-500/20 px-6 py-4 text-white text-xs outline-none focus:border-emerald-500 pr-24" value={spotifyQuery} onChange={e => setSpotifyQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()} />
                    {spotifyQuery && <button onClick={() => setSpotifyQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[9px] font-black hover:text-white">CLEAR</button>}
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={handleSpotifySearch} disabled={isSearchingSpotify} className="flex-1 md:flex-none px-10 h-14 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50">
                      {isSearchingSpotify ? 'SEARCHING...' : 'DISCOVER'}
                    </button>
                    {spotifyResults.length > 0 && (
                      <button onClick={handleSpotifySelectAll} className="flex-1 md:flex-none px-10 h-14 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        {selectedSpotifyIds.size === spotifyResults.filter(t => !existingIsres.has(normalizeIdentifier(t.external_ids.isrc || ''))).length && selectedSpotifyIds.size > 0 ? 'DESELECT NEW' : 'SELECT ALL NEW'}
                      </button>
                    )}
                    {selectedSpotifyIds.size > 0 && (
                      <button onClick={handleBulkSpotifyImport} className="flex-1 md:flex-none px-10 h-14 bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl border border-white hover:bg-brand-gold hover:border-brand-gold transition-all animate-pulse">
                        IMPORT SELECTED ({selectedSpotifyIds.size})
                      </button>
                    )}
                  </div>
                </div>

                {spotifyResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {spotifyResults.map(track => {
                      const isrc = normalizeIdentifier(track.external_ids.isrc || '');
                      const isInLibrary = existingIsres.has(isrc);
                      const isSelected = selectedSpotifyIds.has(track.id);

                      return (
                        <div 
                          key={track.id} 
                          onClick={() => toggleSpotifySelection(track.id, isInLibrary)} 
                          className={`bg-black/60 border p-4 rounded-sm transition-all group flex flex-col gap-4 relative ${isInLibrary ? 'opacity-50 grayscale cursor-not-allowed border-white/5' : 'cursor-pointer'} ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/50'}`}
                        >
                          <div className="absolute top-2 right-2 z-10">
                            {isInLibrary ? (
                                <div className="bg-slate-800 text-white text-[8px] px-2 py-1 rounded-sm font-black uppercase tracking-widest border border-white/10">In Library</div>
                            ) : (
                                <div className={`w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500' : 'bg-transparent'}`}>
                                    {isSelected && <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                                </div>
                            )}
                          </div>
                          <div className="aspect-square w-full overflow-hidden rounded-sm relative">
                             <img src={track.album.images[0]?.url} className={`w-full h-full object-cover transition-transform duration-500 ${!isInLibrary && 'group-hover:scale-110'}`} alt="" />
                             <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-emerald-500/10 opacity-100' : 'opacity-0'}`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white text-[11px] font-black uppercase truncate pr-6">{track.name}</h4>
                            <p className="text-emerald-500 text-[9px] font-mono mt-1">{track.external_ids.isrc || 'No ISRC'}</p>
                            <p className="text-slate-500 text-[8px] mt-1 font-bold truncate">{track.artists.map(a => a.name).join(', ')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {groupedAlbums.map(([upc, albumSongs]) => {
              const main = albumSongs[0];
              const isExpanded = expandedAlbums.has(upc);
              const isSingle = upc.startsWith('SINGLE_');

              return (
                <div key={upc} className="bg-white/[0.02] border border-white/10 rounded-sm overflow-hidden transition-all hover:border-white/20">
                  <div className="flex items-center gap-8 p-8 cursor-pointer group" onClick={() => toggleAlbum(upc)}>
                    <div className="relative">
                      <img src={main.coverUrl} className="w-24 h-24 object-cover shadow-2xl border border-white/5" alt="" />
                      {albumSongs.some(s => selectedIds.has(s.id)) && <div className="absolute -top-2 -left-2 w-5 h-5 bg-brand-gold rounded-full flex items-center justify-center text-black font-black text-[9px]">!</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider group-hover:text-brand-gold transition-colors">{main.title}</h3>
                        <span className="text-[10px] font-black text-brand-gold border border-brand-gold/30 px-2 py-0.5 rounded-sm">{isSingle ? 'SINGLE' : 'ALBUM'}</span>
                      </div>
                      <div className="flex gap-6 mt-3 text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">
                        <span>UPC: {main.upc || 'N/A'}</span>
                        <span>RELEASE: {main.releaseDate}</span>
                        <span>{main.projectType}</span>
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
                            <th className="px-8 py-4 w-16">
                              <input type="checkbox" onChange={(e) => {
                                const newSet = new Set(selectedIds);
                                albumSongs.forEach(s => e.target.checked ? newSet.add(s.id) : newSet.delete(s.id));
                                setSelectedIds(newSet);
                              }} checked={albumSongs.every(s => selectedIds.has(s.id))} />
                            </th>
                            <th className="px-8 py-4">Track Info</th>
                            <th className="px-8 py-4">ISRC</th>
                            <th className="px-8 py-4">Language</th>
                            <th className="px-8 py-4">Project</th>
                            <th className="px-8 py-4">Category</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {albumSongs.sort((a, b) => (a.isrc || '').localeCompare(b.isrc || '')).map((track, idx) => (
                            <tr key={track.id} className={`border-b border-white/5 hover:bg-white/5 group/row ${selectedIds.has(track.id) ? 'bg-brand-gold/5' : ''}`}>
                              <td className="px-8 py-6"><input type="checkbox" checked={selectedIds.has(track.id)} onChange={() => handleSelectOne(track.id)} /></td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <button onClick={() => { if (currentSong?.id === track.id) setIsPlaying(!isPlaying); else { setCurrentSong(track); setIsPlaying(true); } }} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${currentSong?.id === track.id && isPlaying ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white hover:border-brand-gold'}`}>
                                    {currentSong?.id === track.id && isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                  </button>
                                  <div className="font-bold text-white text-sm uppercase tracking-wide">{track.title}</div>
                                </div>
                              </td>
                              <td className="px-8 py-6"><span className="text-[11px] font-mono text-slate-500">{track.isrc}</span></td>
                              <td className="px-8 py-6"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{track.language}</span></td>
                              <td className="px-8 py-6"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{track.projectType}</span></td>
                              <td className="px-8 py-6"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{track.releaseCategory}</span></td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-3">
                                  <button onClick={() => updateSong(track.id, { isInteractiveActive: !track.isInteractiveActive })} className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest border ${track.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>{track.isInteractiveActive ? 'Studio On' : 'Studio Off'}</button>
                                  <button onClick={() => navigate(`/add?edit=${track.id}`)} className="h-8 px-4 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">Edit</button>
                                  <button onClick={() => { if (confirm('確定刪除？此動作將同步至雲端。')) deleteSong(track.id); }} className="h-8 px-4 border border-rose-500 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Del</button>
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
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">網站動態背景 (Portrait URL)</h3>
            <input className="w-full bg-white/[0.03] border border-white/20 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => setGlobalSettings(prev => ({ ...prev, portraitUrl: e.target.value }))} />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">錄音室通行碼 (Access Code)</h3>
            <input className="w-40 bg-white/[0.03] border border-white/20 p-6 text-white text-3xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => setGlobalSettings(prev => ({ ...prev, accessCode: e.target.value }))} />
          </div>
          <button onClick={handleSaveSettings} disabled={localSaving} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all disabled:opacity-50">{localSaving ? 'SAVING...' : 'SAVE & AUTO SYNC'}</button>
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
                  {(globalSettings as any)[item.key] ? <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain" alt="" /> : <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No QR</div>}
                  <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    UPLOAD NEW
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setGlobalSettings(prev => ({ ...prev, [item.key]: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all">SYNC ALL ASSETS TO CLOUD</button>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
          <div className="bg-white/[0.02] border border-white/10 p-10 space-y-6 rounded-sm shadow-2xl">
            <h3 className="text-2xl font-black text-white uppercase tracking-widest">手動導出本地數據 (Local Export)</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">雖然系統會自動同步雲端，但您仍可以下載 JSON 作為離線備份。</p>
            <button onClick={async () => {
              const allSongs = await dbService.getAllSongs();
              const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `WILLWI_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              showToast("本地備份下載中...");
            }} className="w-full py-6 bg-white text-black font-black text-[11px] uppercase tracking-widest hover:bg-brand-gold transition-all">DOWNLOAD LOCAL JSON</button>
          </div>

          <div className="bg-white/[0.02] border border-brand-gold/30 p-10 space-y-6 rounded-sm shadow-2xl">
            <h3 className="text-2xl font-black text-brand-gold uppercase tracking-widest">手動導入數據並同步</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">上傳 JSON 檔案將會覆蓋當前資料並立即推播至雲端。</p>
            <div className="relative">
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-xl">
                SELECT JSON & FORCE SYNC
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportJson} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
