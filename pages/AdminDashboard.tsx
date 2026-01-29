
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { searchSpotify, getSpotifyAlbumTracks, SpotifyAlbum, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud,
    uploadSongsToCloud, syncSuccess, playSong, bulkAppendSongs, currentSong, isPlaying
  } = useData();
  const { isAdmin, logoutAdmin, enableAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'discovery' | 'curation'>('discovery');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Spotify Discovery State
  const [spotifyQuery, setSpotifyQuery] = useState('Willwi');
  const [spotifyResults, setSpotifyResults] = useState<{ tracks: SpotifyTrack[], albums: SpotifyAlbum[] }>({ tracks: [], albums: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<SpotifyTrack[]>([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isAdmin && activeTab === 'discovery' && spotifyResults.albums.length === 0) {
      handleSpotifySearch();
    }
  }, [isAdmin, activeTab]);

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchSpotify(spotifyQuery);
      setSpotifyResults(res);
      showToast(`找到 ${res.albums.length} 張專輯與 ${res.tracks.length} 首單曲`);
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAlbum = async (album: SpotifyAlbum) => {
    setSelectedAlbum(album);
    setIsLoadingAlbum(true);
    try {
      const tracks = await getSpotifyAlbumTracks(album.id);
      setAlbumTracks(tracks);
    } catch (e) {
      showToast("讀取專輯曲目失敗", "error");
    } finally {
      setIsLoadingAlbum(false);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedAlbum || albumTracks.length === 0) return;
    setIsImporting(true);
    showToast(`正在導入 ${albumTracks.length} 首曲目...`);
    
    const newSongs: Song[] = albumTracks.map(t => ({
      id: t.external_ids?.isrc || t.id,
      title: t.name,
      coverUrl: selectedAlbum.images?.[0]?.url || '',
      language: Language.Mandarin,
      projectType: ProjectType.Indie,
      releaseCategory: selectedAlbum.album_type === 'album' ? ReleaseCategory.Album : (selectedAlbum.album_type === 'single' ? ReleaseCategory.Single : ReleaseCategory.EP),
      releaseDate: selectedAlbum.release_date,
      releaseCompany: selectedAlbum.label || 'Willwi Music',
      isEditorPick: false,
      isInteractiveActive: true,
      isrc: t.external_ids?.isrc || '',
      upc: selectedAlbum.external_ids?.upc || '',
      spotifyLink: t.external_urls.spotify,
      origin: 'local'
    }));

    try {
      await bulkAppendSongs(newSongs);
      showToast(`匯入完成！ 本地寫入: ${newSongs.length} 筆`, "success");
      setSelectedAlbum(null);
      setActiveTab('catalog');
    } catch (e) {
      showToast("導入失敗", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const groupedByAlbum = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || `未分類發行`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || (s.isrc && s.isrc.includes(searchTerm)))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-950 border border-white/5 p-16 max-w-md w-full shadow-2xl text-center rounded-sm">
          <h2 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-xs mb-10">Manager Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); } else { showToast("密碼錯誤", "error"); } }} className="space-y-6">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[1em] outline-none focus:border-brand-gold text-4xl font-mono" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <button type="submit" className="w-full py-5 bg-white text-black font-medium uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-24 gap-12">
          <div>
            <h1 className="text-7xl font-medium text-white uppercase tracking-tighter leading-none mb-4">指揮中心</h1>
            <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.5em]">CLOUD: {syncSuccess ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-10 py-5 bg-brand-gold text-black text-[11px] font-medium uppercase tracking-widest shadow-xl">新增作品</button>
            <button onClick={() => uploadSongsToCloud()} className="px-10 py-5 bg-white text-black text-[11px] font-medium uppercase tracking-widest shadow-xl">備份雲端</button>
            <button onClick={logoutAdmin} className="px-10 py-5 border border-white/10 text-slate-500 text-[11px] font-medium uppercase tracking-widest hover:text-white transition-all">登出系統</button>
          </div>
      </div>

      <div className="flex gap-16 border-b border-white/5 mb-16">
          {(['discovery', 'catalog', 'curation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[12px] font-medium uppercase tracking-[0.5em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                  {tab === 'discovery' ? 'Spotify 導入' : tab === 'catalog' ? '作品目錄' : '策展工具'}
              </button>
          ))}
      </div>

      {activeTab === 'discovery' && (
          <div className="space-y-16 animate-fade-in">
              <div className="flex gap-4 max-w-2xl">
                  <input 
                    type="text" 
                    placeholder="搜尋 Spotify 專輯或單曲..." 
                    className="flex-1 bg-slate-900 border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold"
                    value={spotifyQuery}
                    onChange={(e) => setSpotifyQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                  />
                  <button onClick={handleSpotifySearch} disabled={isSearching} className="px-10 bg-[#1DB954] text-black font-medium uppercase text-[10px] tracking-widest hover:bg-white transition-all">
                      {isSearching ? 'SEARCHING...' : 'SEARCH'}
                  </button>
              </div>

              {selectedAlbum ? (
                  <div className="bg-[#050a14] border border-white/10 p-12 rounded-sm animate-blur-in shadow-2xl">
                      <div className="flex justify-between items-start mb-12">
                          <button onClick={() => setSelectedAlbum(null)} className="text-slate-500 hover:text-white uppercase text-[10px] font-medium tracking-widest">← 返回搜尋結果</button>
                          <button 
                            onClick={handleBulkImport} 
                            disabled={isImporting || albumTracks.length === 0}
                            className="px-12 py-5 bg-[#1DB954] text-black font-medium uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-xl"
                          >
                            {isImporting ? 'IMPORTING...' : `導入整張專輯 (${albumTracks.length} 首)`}
                          </button>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row gap-16">
                          <div className="w-full lg:w-80 shrink-0">
                              <img src={selectedAlbum.images?.[0]?.url} className="w-full aspect-square object-cover shadow-2xl rounded-sm border border-white/5" alt="" />
                              <div className="mt-8 space-y-4 text-[10px] uppercase tracking-widest">
                                  <div className="flex justify-between"><span className="text-slate-500">Label</span><span className="text-white">{selectedAlbum.label}</span></div>
                                  <div className="flex justify-between"><span className="text-slate-500">UPC</span><span className="text-brand-gold">{selectedAlbum.external_ids?.upc || 'N/A'}</span></div>
                                  <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="text-white">{selectedAlbum.release_date}</span></div>
                              </div>
                          </div>
                          <div className="flex-1 space-y-2">
                              <h3 className="text-5xl text-white font-medium uppercase tracking-tighter mb-8">{selectedAlbum.name}</h3>
                              {isLoadingAlbum ? (
                                  <div className="py-20 text-center text-slate-700 animate-pulse text-[10px] uppercase tracking-widest">正在獲取音軌與 ISRC...</div>
                              ) : (
                                  albumTracks.map((t, idx) => {
                                      const isCurPlaying = currentSong?.isrc === t.external_ids?.isrc && isPlaying;
                                      return (
                                          <div key={t.id} className="flex items-center justify-between py-4 border-b border-white/[0.03] hover:bg-white/[0.02] px-4 group">
                                              <div className="flex items-center gap-6">
                                                  <span className="text-slate-700 font-mono text-[10px] w-6">{idx + 1}</span>
                                                  <span className="text-white font-medium text-sm uppercase tracking-widest">{t.name}</span>
                                                  <button 
                                                      onClick={() => playSong({ ...t, id: t.id, title: t.name, coverUrl: selectedAlbum.images?.[0]?.url, audioUrl: t.preview_url || '' } as any)}
                                                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isCurPlaying ? 'bg-[#1DB954] border-[#1DB954] text-black' : 'border-white/20 text-white hover:border-[#1DB954] hover:text-[#1DB954]'}`}
                                                  >
                                                      {isCurPlaying ? '■' : '▶'}
                                                  </button>
                                              </div>
                                              <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">ISRC: {t.external_ids?.isrc}</span>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                      {spotifyResults.albums.map(album => (
                          <div key={album.id} className="group cursor-pointer" onClick={() => handleSelectAlbum(album)}>
                              <div className="aspect-square relative overflow-hidden bg-slate-900 border border-white/5 rounded-sm transition-all group-hover:border-[#1DB954]/40">
                                  <img src={album.images?.[0]?.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 opacity-80 group-hover:opacity-100" alt="" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                      <span className="text-[9px] text-white font-medium uppercase tracking-widest border border-white/20 px-4 py-2">Select Album</span>
                                  </div>
                              </div>
                              <div className="mt-4">
                                  <h4 className="text-[13px] font-medium text-white uppercase tracking-widest group-hover:text-[#1DB954] transition-colors truncate">{album.name}</h4>
                                  <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">{album.release_date.split('-')[0]} • {album.album_type}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-16 animate-fade-in">
              <input type="text" placeholder="搜尋標題、ISRC 或 UPC..." className="w-full bg-slate-900/30 border border-white/5 p-6 text-white text-xs font-medium tracking-widest outline-none focus:border-white/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {groupedByAlbum.map(([upc, items]) => (
                  <div key={upc} className="border-b border-white/5 pb-16">
                      <div className="flex items-center gap-4 mb-10">
                          <h3 className="text-white font-medium uppercase tracking-widest text-xl">{upc}</h3>
                          <span className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">({items.length} TRACKS)</span>
                      </div>
                      <div className="space-y-4">
                          {items.map(song => {
                              const isCurPlaying = currentSong?.id === song.id && isPlaying;
                              return (
                                  <div key={song.id} className="flex items-center justify-between py-5 border-b border-white/[0.03] group hover:bg-white/[0.02] px-4 transition-all">
                                      <div className="flex items-center gap-8">
                                          <img src={song.coverUrl} className="w-12 h-12 object-cover border border-white/10" alt="" />
                                          <div>
                                              <span className={`font-medium text-sm uppercase tracking-widest transition-colors ${isCurPlaying ? 'text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}>{song.title}</span>
                                              <p className="text-[10px] text-slate-600 font-mono mt-1 uppercase tracking-widest">ISRC: {song.isrc || 'N/A'}</p>
                                          </div>
                                          {song.audioUrl && (
                                              <button 
                                                  onClick={() => playSong(song)}
                                                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isCurPlaying ? 'bg-brand-gold border-brand-gold text-black' : 'border-white/20 text-white hover:border-brand-gold hover:text-brand-gold'}`}
                                              >
                                                  {isCurPlaying ? '■' : '▶'}
                                              </button>
                                          )}
                                      </div>
                                      <div className="flex gap-8">
                                          <button onClick={() => navigate(`/interactive`, { state: { targetSongId: song.id } })} className="px-6 py-2 bg-white text-black text-[10px] font-medium uppercase tracking-widest rounded-sm hover:bg-brand-gold transition-all">START LAB</button>
                                          <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-white/60 font-medium uppercase tracking-widest hover:text-brand-gold">EDIT</button>
                                          <button onClick={() => deleteSong(song.id)} className="text-[10px] text-rose-900 font-medium uppercase tracking-widest hover:text-rose-500">DEL</button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'curation' && (
          <div className="space-y-24 animate-fade-in">
              <section className="space-y-12">
                  <h3 className="text-brand-gold font-medium uppercase tracking-widest text-xs border-l border-brand-gold pl-6">金流 QR Code 設置</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {['qr_global_payment', 'qr_production', 'qr_cinema', 'qr_support', 'qr_line'].map(key => (
                          <div key={key} className="p-8 bg-white/5 border border-white/5 text-center group">
                              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mb-6 block">{key.replace('qr_', '').toUpperCase()}</span>
                              <div className="aspect-square bg-black border border-white/10 mb-6 flex items-center justify-center overflow-hidden">
                                  {globalSettings[key as keyof typeof globalSettings] ? (
                                      <img src={globalSettings[key as keyof typeof globalSettings] as string} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                      <span className="text-slate-700 text-[9px]">NO IMAGE</span>
                                  )}
                              </div>
                              <label className="block w-full cursor-pointer py-4 border border-white/10 text-white/40 text-[9px] font-medium uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                  UPLOAD NEW
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                              const newSettings = { ...globalSettings, [key]: reader.result as string };
                                              setGlobalSettings(newSettings);
                                              uploadSettingsToCloud(newSettings);
                                              showToast("QR Code 已更新並同步至雲端", "success");
                                          };
                                          reader.readAsDataURL(file);
                                      }
                                  }} />
                              </label>
                          </div>
                      ))}
                  </div>
              </section>

              <section className="space-y-12">
                  <h3 className="text-brand-accent font-medium uppercase tracking-widest text-xs border-l border-brand-accent pl-6">全站視覺管理</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Global Background (全站背景)</span>
                          <div className="aspect-video bg-black border border-white/10 overflow-hidden relative group">
                              <img src={globalSettings.portraitUrl} className="w-full h-full object-cover opacity-60" alt="" />
                              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-[10px] text-white font-medium uppercase tracking-widest">Replace Background</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                              const newSettings = { ...globalSettings, portraitUrl: reader.result as string };
                                              setGlobalSettings(newSettings);
                                              uploadSettingsToCloud(newSettings);
                                              showToast("背景已更新", "success");
                                          };
                                          reader.readAsDataURL(file);
                                      }
                                  }} />
                              </label>
                          </div>
                      </div>
                      <div className="space-y-12">
                          <div className="space-y-4">
                              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">系統解鎖通行碼 (Access Code)</span>
                              <input 
                                type="text" 
                                className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono tracking-widest outline-none focus:border-brand-gold" 
                                value={globalSettings.accessCode} 
                                onChange={(e) => {
                                    const newSettings = { ...globalSettings, accessCode: e.target.value };
                                    setGlobalSettings(newSettings);
                                    uploadSettingsToCloud(newSettings);
                                }}
                              />
                          </div>
                      </div>
                  </div>
              </section>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
