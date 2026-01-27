
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song, SongTranslation } from '../types';
import { searchSpotifyTracks, getSpotifyAlbum } from '../services/spotifyService';
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

  const [activeTab, setActiveTab] = useState<'content' | 'storyline'>('content');
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
    soundcloudUrl: '',
    tidalUrl: '',
    credits: '',
    creativeNote: '',
    labLog: '',
    isInteractiveActive: true,
    translations: {}
  });

  useEffect(() => {
    if (!isAdmin) navigate('/admin');
  }, [isAdmin, navigate]);

  const handleImportSpotify = async (track: any) => {
    showToast("正在從 Spotify 獲取詳細資料...", "success");
    
    let upc = '';
    let label = '';
    
    if (track.album?.id) {
        try {
            const fullAlbum = await getSpotifyAlbum(track.album.id);
            if (fullAlbum) {
                upc = fullAlbum.external_ids?.upc || fullAlbum.external_ids?.ean || '';
                label = fullAlbum.label || '';
            }
        } catch (e) {
            console.error("Failed to fetch full album details", e);
        }
    }

    setFormData(prev => ({
      ...prev,
      title: track.name,
      isrc: track.external_ids?.isrc || prev.isrc,
      upc: upc || track.album?.external_ids?.upc || prev.upc,
      coverUrl: track.album?.images?.[0]?.url || prev.coverUrl,
      releaseDate: track.album?.release_date || prev.releaseDate,
      spotifyLink: track.external_urls?.spotify || prev.spotifyLink,
      releaseCompany: label || track.album?.label || prev.releaseCompany
    }));
    
    setSpotifyResults([]);
    setSpotifySearch('');
    showToast("資料已自動填入！");
  };

  useEffect(() => {
    if (editId) {
      const existing = getSong(editId);
      if (existing) setFormData(existing);
    } else if (location.state?.spotifyTrack) {
      handleImportSpotify(location.state.spotifyTrack);
      window.history.replaceState({}, document.title);
    }
  }, [editId, getSong, location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let finalValue = value;
    if (name === 'audioUrl') {
        const val = value.trim();
        if (val.includes('dropbox.com') && !val.includes('raw=1')) {
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
        if (tracks.length === 0) showToast("找不到相關歌曲", "error");
    } catch (e) {
        showToast("Spotify 搜尋發生錯誤", "error");
    } finally {
        setIsSearching(false);
    }
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

  // YouTube URL Validation Helper
  const isValidYouTubeUrl = (url: string) => {
      if (!url) return true; // Optional field
      const pattern = /^(https?:\/\/)?(www\.|music\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)?([a-zA-Z0-9_-]+)/;
      return pattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Basic Mandatory Check
    if (!formData.title || !formData.isrc) {
        return showToast("必須填寫歌名與 ISRC", "error");
    }

    // 2. YouTube URL Validation
    if (formData.youtubeUrl && !isValidYouTubeUrl(formData.youtubeUrl)) {
        return showToast("無效的 YouTube 連結格式", "error");
    }
    
    setIsSubmitting(true);
    const success = editId ? await updateSong(editId, formData) : await addSong(formData as Song);
    
    if (success) {
        showToast(editId ? "作品已更新" : "作品已建立");
        setTimeout(() => navigate('/admin'), 800);
    } else {
        setIsSubmitting(false);
        showToast("儲存失敗", "error");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black pt-40 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fade-in">
            {/* Left Sidebar: Spotify Search & Auto-Fill */}
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm space-y-6 shadow-2xl">
                    <h3 className="text-[11px] text-brand-gold font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#1DB954] rounded-full"></span>
                        SPOTIFY 自動填寫
                    </h3>
                    <p className="text-[10px] text-slate-400">輸入關鍵字搜尋，點擊結果將自動填入歌名、ISRC、封面、日期與連結。</p>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold transition-all" 
                            placeholder="搜尋 Spotify..." 
                            value={spotifySearch} 
                            onChange={(e) => setSpotifySearch(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()} 
                        />
                        <button onClick={handleSpotifySearch} disabled={isSearching} className="px-6 bg-white text-black text-[10px] font-black uppercase hover:bg-brand-gold transition-all disabled:opacity-50">
                            {isSearching ? '...' : '搜尋'}
                        </button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer rounded-sm group transition-all border border-white/5 hover:border-brand-gold/30">
                                <img src={t.album.images?.[0]?.url} className="w-12 h-12 object-cover rounded-sm shadow-lg" alt="" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-bold truncate group-hover:text-brand-gold">{t.name}</div>
                                    <div className="text-[9px] text-slate-500 truncate mt-1">{t.artists.map((a:any)=>a.name).join(', ')}</div>
                                </div>
                                <div className="text-[9px] text-slate-600 font-mono">→ 匯入</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-2xl relative group">
                    {formData.coverUrl ? (
                        <img src={formData.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]" alt="" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 font-black gap-4">
                            <span className="text-[10px] uppercase tracking-widest opacity-20">封面預覽</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Editor: Main Form */}
            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 relative rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Top Tabs */}
                    <div className="flex border-b border-white/10 gap-8 mb-8">
                        <button type="button" onClick={() => setActiveTab('content')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'content' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>基本資料</button>
                        <button type="button" onClick={() => setActiveTab('storyline')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'storyline' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>故事與日誌</button>
                    </div>

                    {activeTab === 'content' && (
                        <>
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
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">歌曲名稱 (Title)</label>
                                        <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg focus:border-brand-gold outline-none" placeholder="輸入歌名..." />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">主要語言 (Language)</label>
                                        <select name="language" value={formData.language} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold focus:border-brand-gold outline-none appearance-none">
                                            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">歌詞 (Lyrics)</label>
                                    <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[350px] bg-black border border-white/10 p-8 text-white text-sm font-mono resize-none custom-scrollbar outline-none focus:border-brand-gold" placeholder="輸入歌詞..." />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-fade-in">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 標題翻譯</label>
                                    <input 
                                        value={formData.translations?.[activeLangTab]?.title || ''} 
                                        onChange={(e) => handleTranslationChange(activeLangTab, 'title', e.target.value)}
                                        className="w-full bg-black border border-white/10 p-6 text-brand-gold font-bold text-lg outline-none focus:border-brand-gold" 
                                        placeholder={`輸入 ${activeLangTab.toUpperCase()} 歌名...`}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 歌詞翻譯</label>
                                    <textarea 
                                        value={formData.translations?.[activeLangTab]?.lyrics || ''} 
                                        onChange={(e) => handleTranslationChange(activeLangTab, 'lyrics', e.target.value)}
                                        className="w-full h-[350px] bg-black border border-white/10 p-8 text-brand-gold text-sm font-mono resize-none custom-scrollbar outline-none focus:border-brand-gold"
                                        placeholder={`輸入 ${activeLangTab.toUpperCase()} 歌詞...`}
                                    />
                                </div>
                            </div>
                        )}
                        </>
                    )}

                    {activeTab === 'storyline' && (
                        <div className="space-y-10 animate-fade-in">
                             <div className="space-y-4">
                                <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Creative Note (創作筆記)</label>
                                <textarea name="creativeNote" value={formData.creativeNote} onChange={handleChange} className="w-full h-[200px] bg-black border border-white/10 p-8 text-white text-sm font-medium resize-none custom-scrollbar outline-none focus:border-brand-gold" placeholder="關於這首歌的起源、靈感或故事..." />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Lab Log (實驗室日誌)</label>
                                <textarea name="labLog" value={formData.labLog} onChange={handleChange} className="w-full h-[200px] bg-black border border-white/10 p-8 text-slate-400 font-mono text-xs resize-none custom-scrollbar outline-none focus:border-brand-gold" placeholder="技術筆記、錄音細節或混音心得..." />
                            </div>
                        </div>
                    )}

                    <div className="pt-12 border-t border-white/5 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">ISRC (必要)</label>
                                <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" placeholder="QZZ7P..." />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">UPC</label>
                                <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-brand-gold font-black uppercase tracking-widest">原始音檔 (Admin Only)</label>
                                <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-brand-gold/20 p-4 text-[11px] text-brand-gold outline-none focus:border-brand-gold" placeholder="Dropbox / Google Drive Link" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Spotify (Public)</label>
                                <input name="spotifyLink" value={formData.spotifyLink} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-emerald-500" placeholder="https://open.spotify.com/..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="col-span-1 md:col-span-2 space-y-3 relative">
                                <label className="text-[9px] text-red-500 font-black uppercase tracking-widest">YouTube Music</label>
                                <div className="flex gap-2">
                                    <input 
                                        name="youtubeUrl" 
                                        value={formData.youtubeUrl} 
                                        onChange={handleChange} 
                                        className={`flex-1 bg-black border p-4 text-[11px] text-slate-400 outline-none transition-all ${formData.youtubeUrl && !isValidYouTubeUrl(formData.youtubeUrl) ? 'border-rose-500 focus:border-rose-500' : 'border-white/5 focus:border-red-500'}`} 
                                        placeholder="https://music.youtube.com/..." 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAutoFindYouTube} 
                                        disabled={isFindingYT}
                                        className="px-6 bg-[#FF0000] text-white text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50"
                                    >
                                        {isFindingYT ? "..." : "AI"}
                                    </button>
                                </div>
                                {formData.youtubeUrl && !isValidYouTubeUrl(formData.youtubeUrl) && (
                                    <p className="text-[8px] text-rose-500 font-bold uppercase tracking-widest absolute -bottom-5">格式不正確</p>
                                )}
                            </div>
                             <div className="space-y-3">
                                <label className="text-[9px] text-pink-500 font-black uppercase tracking-widest">Apple Music</label>
                                <input name="appleMusicLink" value={formData.appleMusicLink} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-pink-500" placeholder="https://music.apple.com/..." />
                            </div>
                             <div className="space-y-3">
                                <label className="text-[9px] text-white font-black uppercase tracking-widest">TIDAL</label>
                                <input name="tidalUrl" value={formData.tidalUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-white" placeholder="https://tidal.com/..." />
                            </div>
                        </div>

                        <div className="pt-8">
                            <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-4">互動實驗室 (Studio Status)</label>
                            <button 
                                type="button" 
                                onClick={() => setFormData(p => ({ ...p, isInteractiveActive: !p.isInteractiveActive }))}
                                className={`w-full py-4 text-[10px] font-black border transition-all ${formData.isInteractiveActive ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'border-white/5 text-slate-700'}`}
                            >
                                {formData.isInteractiveActive ? '開放中 (ACTIVE)' : '已關閉 (CLOSED)'}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">取消</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-white text-black font-black text-[12px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-[0_20px_40px_rgba(251,191,36,0.15)] disabled:opacity-50">
                            {isSubmitting ? '處理中...' : (editId ? '更新資料' : '發佈新歌')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default AddSong;
