
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song, SongTranslation } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';
import { searchYouTubeMusicLink } from '../services/geminiService';
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
  const [isFindingYT, setIsFindingYT] = useState(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 連結自動檢測與修復
    let finalValue = value;
    if (name === 'audioUrl') {
        const val = value.trim();
        // 偵測 Showcase 連結 (這是不支援直接播放的)
        if (val.includes('dropbox.com/sc/')) {
            showToast("⚠️ 此為 Dropbox Showcase 連結，無法直接播放。請使用檔案分享連結 (s/ 或 scl/)", "error");
        } 
        // 偵測並修復為 raw=1 格式
        else if (val.includes('dropbox.com') && !val.includes('raw=1')) {
            const base = val.split('?')[0];
            finalValue = `${base}?raw=1`;
            showToast("Dropbox 連結已自動優化為「原始音訊流」格式 (raw=1)");
        }
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
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
    try {
        const tracks = await searchSpotifyTracks(spotifySearch);
        setSpotifyResults(tracks);
        if (tracks.length === 0) showToast("NO TRACKS FOUND", "error");
    } catch (e) {
        showToast("SEARCH ERROR", "error");
    } finally {
        setIsSearching(false);
    }
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

  const handleAutoFindYouTube = async () => {
      if (!formData.title) return showToast("請先輸入歌曲名稱", "error");
      setIsFindingYT(true);
      showToast("正在搜尋 YouTube Music 官方連結...");
      try {
          const link = await searchYouTubeMusicLink(formData.title, formData.isrc || '');
          if (link) {
              setFormData(prev => ({ ...prev, youtubeUrl: link }));
              showToast("已找到 YouTube Music 連結並填入");
          } else {
              showToast("未找到精確匹配，請手動填寫", "error");
          }
      } catch (e) {
          showToast("搜尋失敗", "error");
      } finally {
          setIsFindingYT(false);
      }
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
            {/* Left Sidebar: Spotify & Cover */}
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm space-y-6 shadow-2xl">
                    <h3 className="text-[11px] text-brand-gold font-black uppercase tracking-[0.2em]">SPOTIFY 快速導入</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold transition-all" placeholder="搜尋歌曲..." value={spotifySearch} onChange={(e) => setSpotifySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()} />
                        <button onClick={handleSpotifySearch} disabled={isSearching} className="px-6 bg-brand-gold text-black text-[10px] font-black uppercase hover:bg-white transition-all disabled:opacity-50">搜尋</button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer rounded-sm group transition-all border border-white/5">
                                <img src={t.album.images?.[0]?.url} className="w-12 h-12 object-cover rounded-sm shadow-lg" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-bold truncate">{t.name}</div>
                                    <div className="text-[9px] text-slate-500 truncate mt-1">{t.artists.map((a:any)=>a.name).join(', ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-2xl relative group">
                    {formData.coverUrl ? (
                        <img src={formData.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]" alt="" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 font-black gap-4">
                            <svg className="w-20 h-20 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-7c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"/></svg>
                            <span className="text-[10px] uppercase tracking-widest opacity-20">NO COVER</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Editor: Main Form */}
            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 relative rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="flex border-b border-white/10 gap-10">
                        {[
                            { id: 'original', label: '原文 (CORE)' },
                            { id: 'en', label: 'EN 翻譯' },
                            { id: 'jp', label: 'JP 翻譯' },
                            { id: 'zh', label: 'ZH 翻譯' }
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                type="button" 
                                onClick={() => setActiveLangTab(tab.id as any)}
                                className={`pb-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeLangTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeLangTab === 'original' ? (
                        <div className="space-y-10 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">歌曲名稱</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg focus:border-brand-gold outline-none" placeholder="If I could" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">主要語言</label>
                                    <select name="language" value={formData.language} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold focus:border-brand-gold outline-none appearance-none">
                                        {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">歌詞</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[350px] bg-black border border-white/10 p-8 text-white text-sm font-mono resize-none custom-scrollbar outline-none focus:border-brand-gold" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 標題</label>
                                <input 
                                    value={formData.translations?.[activeLangTab]?.title || ''} 
                                    onChange={(e) => handleTranslationChange(activeLangTab, 'title', e.target.value)}
                                    className="w-full bg-black border border-white/10 p-6 text-brand-gold font-bold text-lg outline-none focus:border-brand-gold" 
                                    placeholder={`Enter ${activeLangTab.toUpperCase()} Title`}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 歌詞翻譯</label>
                                <textarea 
                                    value={formData.translations?.[activeLangTab]?.lyrics || ''} 
                                    onChange={(e) => handleTranslationChange(activeLangTab, 'lyrics', e.target.value)}
                                    className="w-full h-[350px] bg-black border border-white/10 p-8 text-brand-gold text-sm font-mono resize-none custom-scrollbar outline-none focus:border-brand-gold"
                                    placeholder={`Enter ${activeLangTab.toUpperCase()} Lyrics`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div className="pt-12 border-t border-white/5 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">ISRC</label>
                                <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" placeholder="QZZ7P2515943" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">UPC</label>
                                <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">音訊網址 (AUDIO URL)</label>
                                <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" placeholder="Dropbox link (raw=1)" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">工作室狀態 (STUDIO)</label>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(p => ({ ...p, isInteractiveActive: !p.isInteractiveActive }))}
                                    className={`w-full py-4 text-[10px] font-black border transition-all ${formData.isInteractiveActive ? 'bg-white/5 text-white border-white/20' : 'border-white/5 text-slate-700'}`}
                                >
                                    {formData.isInteractiveActive ? '實驗已開啟' : '實驗關閉'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3 relative">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">YouTube Music 連結</label>
                                <div className="flex gap-2">
                                    <input name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} className="flex-1 bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" placeholder="https://music.youtube.com/..." />
                                    <button 
                                        type="button" 
                                        onClick={handleAutoFindYouTube} 
                                        disabled={isFindingYT}
                                        className="px-6 bg-[#FF0000] text-white text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50"
                                    >
                                        {isFindingYT ? "尋找中..." : "✨ 自動尋找"}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Spotify 連結</label>
                                <input name="spotifyLink" value={formData.spotifyLink} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">取消</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-white text-black font-black text-[12px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-[0_20px_40px_rgba(251,191,36,0.15)] disabled:opacity-50">
                            {isSubmitting ? '同步中...' : (editId ? '更新數據' : '發佈作品')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;
