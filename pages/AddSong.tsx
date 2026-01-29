
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotify, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { useToast } from '../components/Layout';

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUser();
  const { addSong, updateSong, getSong } = useData();
  const { showToast } = useToast();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');

  const [activeTab, setActiveTab] = useState<'content' | 'storyline'>('content');
  const [searchMode, setSearchMode] = useState<'track' | 'album'>('track');
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [spotifyAlbums, setSpotifyAlbums] = useState<SpotifyAlbum[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Preview Audio State
  const [previewTrack, setPreviewTrack] = useState<SpotifyTrack | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseDate: new Date().toISOString().split('T')[0],
    coverUrl: '',
    lyrics: '',
    audioUrl: '',
    isrc: '',
    upc: '',
    spotifyLink: '',
    releaseCompany: 'Willwi Music',
    creativeNote: '',
    credits: '',
    isInteractiveActive: true,
  });

  useEffect(() => {
    if (!isAdmin) navigate('/admin');
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (editId) {
      const existing = getSong(editId);
      if (existing) setFormData(existing);
    }
  }, [editId, getSong]);

  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          const { tracks, albums } = await searchSpotify(searchQuery, searchMode === 'track' ? 'track' : 'album');
          setSpotifyTracks(tracks);
          setSpotifyAlbums(albums);
      } catch (e) {
          showToast("Spotify 搜尋失敗", "error");
      } finally {
          setIsSearching(false);
      }
  };

  const handleImportTrack = (track: SpotifyTrack) => {
    setFormData(prev => ({
      ...prev,
      title: track.name,
      isrc: track.external_ids?.isrc || prev.isrc,
      upc: track.album?.external_ids?.upc || prev.upc,
      coverUrl: track.album?.images?.[0]?.url || prev.coverUrl,
      releaseDate: track.album?.release_date || prev.releaseDate,
      spotifyLink: track.external_urls?.spotify || prev.spotifyLink,
      releaseCompany: track.album?.label || prev.releaseCompany || 'Willwi Music',
      releaseCategory: track.album?.album_type === 'album' ? ReleaseCategory.Album : ReleaseCategory.Single
    }));
    showToast(`已導入：${track.name}`);
  };

  const handleLoadAlbumTracks = async (album: SpotifyAlbum) => {
      setIsSearching(true);
      try {
          const tracks = await getSpotifyAlbumTracks(album.id);
          setSpotifyTracks(tracks);
          setSearchMode('track');
          showToast(`已載入專輯曲目：${album.name}`);
      } catch (e) {
          showToast("無法載入專輯曲目", "error");
      } finally {
          setIsSearching(false);
      }
  };

  const togglePreview = (track: SpotifyTrack) => {
      if (previewTrack?.id === track.id) {
          previewAudioRef.current?.pause();
          setPreviewTrack(null);
      } else {
          if (!track.preview_url) {
              showToast("此曲目不提供預覽音檔", "info");
              return;
          }
          if (previewAudioRef.current) previewAudioRef.current.pause();
          const audio = new Audio(track.preview_url);
          previewAudioRef.current = audio;
          audio.play();
          setPreviewTrack(track);
          audio.onended = () => setPreviewTrack(null);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.isrc) return showToast("請至少填寫標題與 ISRC", "error");
    setIsSubmitting(true);
    const success = editId ? await updateSong(editId, formData) : await addSong(formData as Song);
    if (success) {
        showToast("作品已同步至雲端庫");
        navigate('/admin');
    } else {
        setIsSubmitting(false);
        showToast("同步失敗", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black pt-32 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1500px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
            
            {/* Left: Spotify Integration Toolkit */}
            <div className="lg:col-span-4 space-y-8">
                <div className="bg-[#0f172a] border border-white/10 p-8 rounded-sm shadow-2xl">
                    <h3 className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] mb-6">Spotify Data Finder</h3>
                    <div className="flex gap-4 mb-6">
                        <button onClick={() => setSearchMode('track')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border ${searchMode === 'track' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10'}`}>Track</button>
                        <button onClick={() => setSearchMode('album')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border ${searchMode === 'album' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10'}`}>Album</button>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-black border border-white/10 px-4 py-3 text-white text-xs outline-none focus:border-brand-accent" 
                            placeholder={searchMode === 'track' ? "搜尋單曲名稱..." : "搜尋專輯名稱..."}
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                        />
                        <button onClick={handleSearch} disabled={isSearching} className="px-5 bg-brand-accent text-black text-[10px] font-black uppercase tracking-widest">
                            {isSearching ? '...' : 'Go'}
                        </button>
                    </div>

                    <div className="mt-8 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {searchMode === 'track' && spotifyTracks.map(t => (
                            <div key={t.id} className="group p-3 bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-brand-accent transition-all">
                                <img src={t.album?.images?.[0]?.url} className="w-10 h-10 object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-white font-bold truncate">{t.name}</div>
                                    <div className="text-[8px] text-slate-500 truncate">{t.album?.name}</div>
                                </div>
                                <div className="flex gap-2">
                                    {t.preview_url && (
                                        <button onClick={() => togglePreview(t)} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${previewTrack?.id === t.id ? 'bg-brand-gold border-brand-gold text-black' : 'border-white/10 text-white hover:border-white'}`}>
                                            {previewTrack?.id === t.id ? '■' : '▶'}
                                        </button>
                                    )}
                                    <button onClick={() => handleImportTrack(t)} className="px-3 py-1 bg-white text-black text-[8px] font-black uppercase rounded-sm">Import</button>
                                </div>
                            </div>
                        ))}

                        {searchMode === 'album' && spotifyAlbums.map(a => (
                            <div key={a.id} className="group p-3 bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-brand-gold transition-all">
                                <img src={a.images?.[0]?.url} className="w-10 h-10 object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-white font-bold truncate">{a.name}</div>
                                    <div className="text-[8px] text-slate-500 truncate">{a.release_date} • {a.total_tracks} Tracks</div>
                                </div>
                                <button onClick={() => handleLoadAlbumTracks(a)} className="px-3 py-1 border border-brand-gold text-brand-gold text-[8px] font-black uppercase rounded-sm hover:bg-brand-gold hover:text-black">Tracks</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/10 overflow-hidden relative">
                    {formData.coverUrl ? (
                        <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Cover Preview" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-700 uppercase tracking-widest">Image Preview</div>
                    )}
                </div>
            </div>

            {/* Right: Master Editor Form */}
            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="flex border-b border-white/10 gap-10 mb-6">
                        <button type="button" onClick={() => setActiveTab('content')} className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] ${activeTab === 'content' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>核心數據與串流</button>
                        <button type="button" onClick={() => setActiveTab('storyline')} className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] ${activeTab === 'storyline' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>歌詞日誌與名單</button>
                    </div>

                    {activeTab === 'content' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">作品名稱 (Title)</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white font-bold text-lg outline-none focus:border-brand-gold" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">ISRC 編碼</label>
                                    <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-brand-gold font-mono outline-none focus:border-brand-gold" placeholder="TWUM..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">發行公司 / 廠牌</label>
                                    <input name="releaseCompany" value={formData.releaseCompany} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">UPC (條碼)</label>
                                    <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-slate-400 font-mono text-xs outline-none" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">音訊直連網址 (用於互動對時)</label>
                                <div className="flex gap-2">
                                    <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="flex-1 bg-black border border-white/10 p-5 text-brand-accent text-[10px] font-mono outline-none focus:border-brand-accent" placeholder="Dropbox raw=1 / Google Drive / Cloud Link" />
                                    {formData.audioUrl && (
                                        <button type="button" onClick={() => window.open(formData.audioUrl, '_blank')} className="px-6 border border-white/10 text-white text-[9px] font-black uppercase">Test Link</button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">發行日期</label>
                                    <input type="date" name="releaseDate" value={formData.releaseDate} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Spotify Link</label>
                                    <input name="spotifyLink" value={formData.spotifyLink} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none" placeholder="https://open.spotify..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'storyline' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">動態歌詞 / 同步歌詞</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[400px] bg-black border border-white/10 p-6 text-white text-xs font-mono custom-scrollbar outline-none focus:border-brand-gold" placeholder="[00:00.00] 歌詞內容..." />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">製作名單 (Credits)</label>
                                <textarea name="credits" value={formData.credits} onChange={handleChange} className="w-full h-[150px] bg-black border border-white/10 p-6 text-slate-400 text-xs outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-10 border-t border-white/5">
                        <div className="flex items-center gap-4">
                            <input type="checkbox" id="isInteractive" checked={formData.isInteractiveActive} onChange={(e) => setFormData(prev => ({...prev, isInteractiveActive: e.target.checked}))} className="w-4 h-4 accent-brand-gold" />
                            <label htmlFor="isInteractive" className="text-[10px] text-white font-black uppercase tracking-widest cursor-pointer">開放互動對時功能</label>
                        </div>
                        <div className="flex gap-6">
                            <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[10px] uppercase tracking-widest hover:text-white">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-16 py-5 bg-white text-black font-black text-[11px] uppercase tracking-[0.3em] hover:bg-brand-gold transition-all shadow-2xl">
                                {isSubmitting ? 'Syncing to Cloud...' : 'Save & Deploy'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default AddSong;
