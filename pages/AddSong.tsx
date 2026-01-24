
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song, SongTranslation } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';
import { useToast } from '../components/Layout';

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUser();
  const { addSong, updateSong, getSong } = useData();
  const { showToast } = useToast();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');

  const [activeLangTab, setActiveLangTab] = useState<'original' | 'en' | 'jp' | 'zh'>('original');
  const [spotifySearch, setSpotifySearch] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    appleMusicLink: '',
    youtubeUrl: '',
    credits: '',
    isInteractiveActive: true,
    translations: {}
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

  // Handle data from Spotify discovery tab
  useEffect(() => {
    if (location.state?.spotifyImport) {
        const track = location.state.spotifyImport;
        handleImportSpotify(track);
        // Clear state to avoid re-triggering
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTranslationChange = (lang: string, field: keyof SongTranslation, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: {
          ...(prev.translations?.[lang] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSpotifySearch = async () => {
    if (!spotifySearch) return;
    setIsSearching(true);
    const tracks = await searchSpotifyTracks(spotifySearch);
    setSpotifyResults(tracks);
    setIsSearching(false);
    if (tracks.length === 0) showToast("NO TRACKS FOUND", "error");
  };

  const handleImportSpotify = (track: any) => {
    setFormData(prev => ({
      ...prev,
      title: track.name,
      isrc: track.external_ids?.isrc || prev.isrc,
      upc: track.album?.external_ids?.upc || prev.upc,
      coverUrl: track.album?.images?.[0]?.url || prev.coverUrl,
      releaseDate: track.album?.release_date || prev.releaseDate,
      spotifyLink: track.external_urls?.spotify || prev.spotifyLink,
      releaseCompany: track.album?.label || prev.releaseCompany
    }));
    setSpotifyResults([]);
    setSpotifySearch('');
    showToast("SPOTIFY DATA IMPORTED");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.isrc) return showToast("TITLE AND ISRC REQUIRED", "error");
    
    setIsSubmitting(true);
    const success = editId ? await updateSong(editId, formData) : await addSong(formData as Song);
    
    if (success) {
        showToast(editId ? "TRACK UPDATED" : "NEW TRACK CREATED");
        setTimeout(() => navigate('/admin'), 800);
    } else {
        setIsSubmitting(false);
        showToast("SAVE FAILED", "error");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black pt-40 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fade-in">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-slate-900 border border-white/10 p-6 rounded-sm space-y-6">
                    <h3 className="text-[11px] text-brand-gold font-black uppercase tracking-widest">Spotify 快速導入</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-white/20 p-3 text-white text-xs" placeholder="搜尋歌曲..." value={spotifySearch} onChange={(e) => setSpotifySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()} />
                        <button onClick={handleSpotifySearch} className="px-4 bg-brand-gold text-black text-[10px] font-black uppercase">搜尋</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 cursor-pointer rounded-sm group transition-all">
                                <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[10px] text-white font-bold truncate">{t.name}</div>
                                    <div className="text-[8px] text-slate-500 truncate">{t.artists.map((a:any)=>a.name).join(', ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/10 rounded-sm overflow-hidden shadow-2xl relative group">
                    {formData.coverUrl ? <img src={formData.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-800 font-black">NO COVER</div>}
                </div>
            </div>

            {/* Right Editor */}
            <div className="lg:col-span-8 bg-slate-900/50 border border-white/10 p-10 relative rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="flex border-b border-white/10 gap-6">
                        {['original', 'en', 'jp', 'zh'].map(lang => (
                            <button 
                                key={lang} 
                                type="button" 
                                onClick={() => setActiveLangTab(lang as any)}
                                className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeLangTab === lang ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}
                            >
                                {lang === 'original' ? '原文 (CORE)' : `${lang.toUpperCase()} 翻譯`}
                            </button>
                        ))}
                    </div>

                    {activeLangTab === 'original' ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">歌曲名稱</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white font-bold" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">主要語言</label>
                                    <select name="language" value={formData.language} onChange={handleChange} className="w-full bg-black border border-white/10 p-5 text-white">
                                        {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 font-black uppercase">歌詞</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-80 bg-black border border-white/10 p-6 text-white text-xs font-mono resize-none custom-scrollbar" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 font-black uppercase">{activeLangTab.toUpperCase()} 標題</label>
                                <input 
                                    value={formData.translations?.[activeLangTab]?.title || ''} 
                                    onChange={(e) => handleTranslationChange(activeLangTab, 'title', e.target.value)}
                                    className="w-full bg-black border border-white/10 p-5 text-brand-gold font-bold" 
                                    placeholder={`Enter ${activeLangTab.toUpperCase()} Title`}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 font-black uppercase">{activeLangTab.toUpperCase()} 歌詞翻譯</label>
                                <textarea 
                                    value={formData.translations?.[activeLangTab]?.lyrics || ''} 
                                    onChange={(e) => handleTranslationChange(activeLangTab, 'lyrics', e.target.value)}
                                    className="w-full h-80 bg-black border border-white/10 p-6 text-brand-gold text-xs font-mono resize-none custom-scrollbar"
                                    placeholder={`Enter ${activeLangTab.toUpperCase()} Lyrics`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Metadata Section (Always Visible) */}
                    <div className="pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">ISRC</label>
                            <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/5 p-3 text-xs text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">UPC</label>
                            <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/5 p-3 text-xs text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">Audio URL</label>
                            <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-3 text-xs text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">Studio Status</label>
                            <button 
                                type="button" 
                                onClick={() => setFormData(p => ({ ...p, isInteractiveActive: !p.isInteractiveActive }))}
                                className={`w-full py-3 text-[10px] font-black border ${formData.isInteractiveActive ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-slate-600'}`}
                            >
                                {formData.isInteractiveActive ? 'EXPERIMENTAL ON' : 'EXPERIMENTAL OFF'}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-10">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-500 font-black text-xs uppercase hover:text-white">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-16 py-6 bg-white text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-gold transition-all shadow-xl disabled:opacity-50">
                            {isSubmitting ? 'SAVING...' : (editId ? 'UPDATE DATA' : 'PUBLISH DATA')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;
