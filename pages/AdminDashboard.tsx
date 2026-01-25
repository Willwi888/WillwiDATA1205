import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { dbService } from '../services/db';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';

type AdminTab = 'catalog' | 'settings' | 'payment' | 'system';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, updateSong, isSyncing, syncProgress, 
    bulkAddSongs, bulkAppendSongs, setCurrentSong, setIsPlaying, isPlaying, currentSong
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localImporting, setLocalImporting] = useState(false);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  // Spotify Bulk Search State
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);

  // 專輯分組邏輯
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    const filtered = songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm))) ||
      (s.upc && normalizeIdentifier(s.upc).includes(normalizeIdentifier(searchTerm)))
    );

    filtered.forEach(song => {
      const groupKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });

    return Object.values(groups).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm]);

  const toggleAlbum = (id: string) => {
    const next = new Set(expandedAlbums);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedAlbums(next);
  };

  const handlePlayTrack = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (currentSong?.id === song.id && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleSaveSettings = async () => {
    await uploadSettingsToCloud(globalSettings);
    showToast("全站設定已同步");
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast("資料備份已下載");
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
                if (window.confirm(`確定要匯入並還原備份嗎？此動作將覆寫現有數據。`)) {
                    setLocalImporting(true);
                    const success = await bulkAddSongs(data);
                    if (success) {
                        showToast("備份還原成功！");
                        setTimeout(() => window.location.reload(), 1500);
                    }
                }
            }
          } catch (e) { showToast("還原失敗", "error"); }
          finally { setLocalImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
      };
      reader.readAsText(file);
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSpotifySearching(true);
    try {
      const tracks = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(tracks);
      setSelectedSpotifyIds(new Set());
      if (tracks.length === 0) showToast("未找到任何曲目", "error");
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSpotifySearching(false);
    }
  };

  const toggleSpotifySelection = (id: string) => {
    const next = new Set(selectedSpotifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpotifyIds(next);
  };

  const toggleAllSpotify = () => {
      if (selectedSpotifyIds.size === spotifyResults.length) {
          setSelectedSpotifyIds(new Set());
      } else {
          setSelectedSpotifyIds(new Set(spotifyResults.map(t => t.id)));
      }
  };

  const handleBulkImportSpotify = async () => {
    if (selectedSpotifyIds.size === 0) return;
    setLocalImporting(true);
    const tracksToImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
    const newSongs: Song[] = tracksToImport.map(t => ({
      id: normalizeIdentifier(t.external_ids?.isrc || t.id),
      title: t.name,
      coverUrl: t.album?.images?.[0]?.url || '',
      language: Language.Mandarin,
      projectType: ProjectType.Indie,
      releaseDate: t.album?.release_date || new Date().toISOString().split('T')[0],
      isrc: t.external_ids?.isrc || '',
      upc: t.album?.external_ids?.upc || '',
      spotifyLink: t.external_urls?.spotify || '',
      isInteractiveActive: true,
      isEditorPick: false,
      origin: 'local'
    }));
    const success = await bulkAppendSongs(newSongs);
    if (success) {
      showToast(`成功導入 ${tracksToImport.length} 首曲目`);
      setShowSpotifySearch(false);
      setSpotifyResults([]);
      setSelectedSpotifyIds(new Set());
    }
    setLocalImporting(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-16 max-w-md w-full text-center space-y-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.4em]">Manager</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="••••" className="w-full bg-black border-b border-white/20 px-4 py-6 text-white text-center tracking-[1em] font-mono text-3xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-widest text-xs">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-48 animate-fade-in pb-40">
      
      {/* 核心進度顯示優化 */}
      {(isSyncing || localImporting) && (
        <div className="fixed top-0 left-0 w-full z-[1000]">
           <div className="h-1.5 bg-white/5 w-full">
              <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_20px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
           </div>
           <div className="bg-brand-gold text-black text-[10px] font-black px-6 py-2 uppercase tracking-[0.3em] inline-block shadow-2xl">
              PROCESSING DATA: {syncProgress}%
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">
            {isSyncing ? `SYNCING ${syncProgress}%` : 'Pure Data Management'}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowSpotifySearch(!showSpotifySearch)} 
            className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${showSpotifySearch ? 'bg-emerald-500 text-black border-emerald-500' : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}
          >
            {showSpotifySearch ? '關閉搜尋' : '從 SPOTIFY 導入'}
          </button>
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">新條目</button>
          <button onClick={logoutAdmin} className="h-14 px-12 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">註銷</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings', 'payment', 'system'].map(id => (
          <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {id === 'catalog' ? '庫存清單' : id === 'settings' ? '影音設置' : id === 'payment' ? '付款更新' : '系統管理'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          {/* Spotify 批量搜尋導入區塊 */}
          {showSpotifySearch && (
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-10 space-y-8 animate-fade-in-up mb-12 rounded-sm shadow-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.302c-.223.367-.703.483-1.07.259-2.914-1.782-6.582-2.185-10.903-1.196-.418.096-.836-.168-.933-.587-.096-.418.168-.836.587-.933 4.737-1.082 8.8-1.545 12.06 1.396.367.224.483.704.259 1.071zm1.472-3.257c-.28.455-.877.6-1.33.32-3.337-2.05-8.423-2.645-12.37-1.447-.512.155-1.053-.133-1.208-.644-.155-.512.133-1.053.644-1.208 4.512-1.368 10.125-.701 13.944 1.648.455.28.6.877.32 1.331zm.126-3.393c-4.002-2.376-10.598-2.595-14.417-1.436-.615.187-1.26-.168-1.447-.783-.187-.615.168-1.26.783-1.447 4.394-1.333 11.66-1.078 16.273 1.66.554.328.74 1.04.412 1.594-.328.554-1.04.74-1.594.412z"/></svg>
                  </div>
                  <h3 className="text-emerald-500 font-black text-xs uppercase tracking-[0.4em]">Spotify Bulk Search</h3>
                </div>
                <div className="flex gap-4 items-center">
                    {spotifyResults.length > 0 && (
                      <button onClick={toggleAllSpotify} className="text-[10px] text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20 px-3 py-1 hover:bg-emerald-500/10 transition-all">
                          {selectedSpotifyIds.size === spotifyResults.length ? '取消全選' : '全選曲目'}
                      </button>
                    )}
                    <span className="text-[10px] text-emerald-500/50 font-bold uppercase tracking-widest">{selectedSpotifyIds.size} TRACKS SELECTED</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="輸入關鍵字或 ISRC 搜尋曲目..." 
                  className="flex-1 bg-black border border-emerald-500/20 px-6 py-5 text-white outline-none focus:border-emerald-500 transition-all" 
                  value={spotifyQuery} 
                  onChange={e => setSpotifyQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()}
                />
                <button onClick={handleSpotifySearch} disabled={isSpotifySearching} className="px-10 bg-emerald-500 text-black font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50">
                  {isSpotifySearching ? '搜尋中...' : '執行搜尋'}
                </button>
              </div>

              {spotifyResults.length > 0 && (
                <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-4">
                  {spotifyResults.map(track => (
                    <div 
                      key={track.id} 
                      onClick={() => toggleSpotifySelection(track.id)} 
                      className={`flex items-center gap-6 p-4 border transition-all cursor-pointer group ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500/10 border-emerald-500' : 'bg-black/40 border-white/5 hover:border-emerald-500/40'}`}
                    >
                      <div className={`w-5 h-5 border flex items-center justify-center transition-all ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 group-hover:border-emerald-500'}`}>
                        {selectedSpotifyIds.has(track.id) && <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                      </div>
                      <img src={track.album?.images?.[0]?.url} className="w-12 h-12 object-cover rounded shadow-lg" />
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-white uppercase truncate">{track.name}</h4>
                        <p className="text-[9px] text-slate-500 uppercase truncate mt-1">
                          {track.album.name} • {track.artists.map((a:any)=>a.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono shrink-0 px-4">
                        {track.external_ids?.isrc || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSpotifyIds.size > 0 && (
                <button 
                  onClick={handleBulkImportSpotify} 
                  className="w-full py-6 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.2)] hover:bg-white hover:scale-[1.01] transition-all active:scale-95"
                >
                  批量導入所選的 {selectedSpotifyIds.size} 首曲目
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <input type="text" placeholder="搜尋標題 / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 px-0 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest placeholder:text-white/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="space-y-8">
            {groupedAlbums.map((album) => {
              const main = album[0];
              const isExpanded = expandedAlbums.has(main.id);
              return (
                <div key={main.id} className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all overflow-hidden rounded-sm">
                  <div 
                    onClick={() => toggleAlbum(main.id)}
                    className="flex items-center gap-10 p-8 cursor-pointer group"
                  >
                    <div className="relative w-24 h-24 shadow-2xl shrink-0">
                      <img src={main.coverUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{isExpanded ? 'CLOSE' : 'OPEN'}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-black text-white uppercase tracking-wider">{main.title}</h4>
                      <div className="flex gap-8 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        <span className="text-brand-gold">{album.length} TRACKS</span>
                        <span>{main.releaseDate}</span>
                        {main.upc && <span className="text-white/30">UPC: {main.upc}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                       <div className={`w-10 h-10 border border-white/10 flex items-center justify-center transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                       </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/40 animate-fade-in-up">
                      {album.map((track) => (
                        <div key={track.id} className={`flex items-center gap-10 p-8 border-b border-white/5 last:border-0 hover:bg-brand-gold/5 transition-all ${currentSong?.id === track.id ? 'bg-brand-gold/10 border-l-4 border-l-brand-gold' : ''}`}>
                          <button 
                            onClick={(e) => handlePlayTrack(e, track)}
                            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${isPlaying && currentSong?.id === track.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_20px_#fbbf24]' : 'border-white/20 text-white hover:border-brand-gold hover:text-brand-gold'}`}
                          >
                            {isPlaying && currentSong?.id === track.id ? 
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : 
                              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            }
                          </button>
                          
                          <div className="flex-1">
                            <p className="text-base font-black text-white uppercase tracking-wider">{track.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-widest">{track.isrc}</p>
                            
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
                                {/* YouTube 快速連結編輯區 */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] text-brand-gold/50 font-black uppercase tracking-widest">YouTube URL</label>
                                    <input 
                                      type="text" 
                                      placeholder="PASTE YOUTUBE MUSIC LINK..." 
                                      className="w-full bg-black/40 border border-white/10 px-4 py-2 text-[11px] text-brand-gold outline-none focus:border-brand-gold font-mono"
                                      value={track.youtubeUrl || ''}
                                      onChange={(e) => updateSong(track.id, { youtubeUrl: e.target.value })}
                                    />
                                </div>
                                {/* SoundCloud 快速連結編輯區 */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] text-orange-500/50 font-black uppercase tracking-widest">SoundCloud URL</label>
                                    <input 
                                      type="text" 
                                      placeholder="PASTE SOUNDCLOUD LINK..." 
                                      className="w-full bg-black/40 border border-white/10 px-4 py-2 text-[11px] text-orange-500 outline-none focus:border-orange-500 font-mono"
                                      value={track.soundcloudUrl || ''}
                                      onChange={(e) => updateSong(track.id, { soundcloudUrl: e.target.value })}
                                    />
                                </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateSong(track.id, { isInteractiveActive: !track.isInteractiveActive }); }}
                              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${track.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-600 border-white/10 hover:border-white/30'}`}
                            >
                              {track.isInteractiveActive ? 'ACTIVE' : 'PRIVATE'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/add?edit=${track.id}`); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">EDIT</button>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('確定要刪除這首歌嗎？此動作不可撤銷。')) deleteSong(track.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-all">DEL</button>
                          </div>
                        </div>
                      ))}
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
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">網站視覺背景</h3>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => setGlobalSettings(prev => ({ ...prev, portraitUrl: e.target.value }))} />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">環境背景音樂</h3>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.qr_global_payment} onChange={(e) => setGlobalSettings(prev => ({ ...prev, qr_global_payment: e.target.value }))} />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">獨家音樂 YT 串連</h3>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.exclusiveYoutubeUrl || ''} onChange={(e) => setGlobalSettings(prev => ({ ...prev, exclusiveYoutubeUrl: e.target.value }))} placeholder="在此貼上 YouTube 連結..." />
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">保存並同步</button>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="animate-fade-in space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {['qr_production', 'qr_cinema', 'qr_support', 'qr_line'].map(key => (
              <div key={key} className="p-6 bg-white/[0.01] border border-white/5 text-center space-y-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace('qr_', '').toUpperCase()}</h4>
                <div className="aspect-square bg-white/5 flex items-center justify-center relative group overflow-hidden">
                  {(globalSettings as any)[key] && <img src={(globalSettings as any)[key]} className="w-full h-full object-contain" />}
                  <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[9px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    上傳圖片
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setGlobalSettings(prev => ({ ...prev, [key]: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">同步資源</button>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-16 animate-fade-in">
          <div className="space-y-8 bg-white/[0.02] p-10 border border-white/5">
            <h3 className="text-sm font-black text-brand-gold uppercase tracking-widest">數據管理中心</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={downloadFullBackup} className="w-full py-5 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">導出 JSON 備份</button>
               <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 border border-rose-500/30 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">匯入 JSON 備份</button>
               <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
            </div>
          </div>
          <div className="space-y-8 bg-white/[0.02] p-10 border border-white/5">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">工作室解鎖碼</h3>
            <div className="flex gap-6">
              <input className="w-40 bg-black border border-white/10 p-6 text-white text-4xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => setGlobalSettings(prev => ({ ...prev, accessCode: e.target.value }))} />
              <button onClick={handleSaveSettings} className="px-12 bg-brand-gold text-black font-black uppercase text-xs hover:bg-white transition-all">更新</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;