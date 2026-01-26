import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song, SongTranslation } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';
// Fix: Removed non-existent export searchYouTubeMusicLink from geminiService
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
    try {
        const tracks = await searchSpotifyTracks(spotifySearch);
        setSpotifyResults(tracks);
    } catch (e) {
        showToast("搜尋失敗", "error");
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
    }));
    setSpotifyResults([]);
    setSpotifySearch('');
    showToast("已從 Spotify 匯入基礎資料");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return showToast("標題為必填", "error");
    
    setIsSubmitting(true);
    // 如果沒有 ID，生成一個
    const finalId = formData.id || (formData.isrc ? formData.isrc : `WILLWI_${Date.now()}`);
    const success = editId ? await updateSong(editId, formData) : await addSong({ ...formData, id: finalId } as Song);
    
    if (success) {
        showToast("資料已儲存");
        setTimeout(() => navigate('/admin'), 1000);
    } else {
        setIsSubmitting(false);
        showToast("儲存失敗", "error");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black pt-40 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fade-in">
            {/* 左側：Spotify 與封面 */}
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm space-y-6 shadow-2xl">
                    <h3 className="text-[11px] text-brand-gold font-black uppercase tracking-[0.2em]">快速匯入數據</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold" placeholder="輸入歌名搜尋 Spotify..." value={spotifySearch} onChange={(e) => setSpotifySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()} />
                        <button onClick={handleSpotifySearch} className="px-6 bg-brand-gold text-black text-[10px] font-black uppercase hover:bg-white transition-all">搜尋</button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        {spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer rounded-sm border border-white/5">
                                <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-bold truncate">{t.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-2xl">
                    {formData.coverUrl ? <img src={formData.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-800 font-black">NO COVER</div>}
                </div>
                <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 text-[10px] text-slate-400 outline-none" placeholder="封面連結 URL..." />
            </div>

            {/* 右側：主編輯區 */}
            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-sm">
                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="flex border-b border-white/10 gap-10">
                        {['original', 'en', 'jp', 'zh'].map(tab => (
                            <button key={tab} type="button" onClick={() => setActiveLangTab(tab as any)} className={`pb-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeLangTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
                                {tab === 'original' ? '原文' : tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {activeLangTab === 'original' ? (
                        <div className="space-y-10">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">歌曲名稱</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg focus:border-brand-gold outline-none" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行類別</label>
                                    <select name="releaseCategory" value={formData.releaseCategory} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold outline-none">
                                        {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">正式歌詞 (Lyrics)</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[400px] bg-black border border-white/10 p-8 text-white text-sm font-mono leading-relaxed resize-none custom-scrollbar outline-none focus:border-brand-gold" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 譯名</label>
                                <input value={formData.translations?.[activeLangTab]?.title || ''} onChange={(e) => handleTranslationChange(activeLangTab, 'title', e.target.value)} className="w-full bg-black border border-white/10 p-6 text-brand-gold font-bold text-lg outline-none" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 歌詞翻譯</label>
                                <textarea value={formData.translations?.[activeLangTab]?.lyrics || ''} onChange={(e) => handleTranslationChange(activeLangTab, 'lyrics', e.target.value)} className="w-full h-[400px] bg-black border border-white/10 p-8 text-brand-gold text-sm font-mono leading-relaxed resize-none custom-scrollbar outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="pt-12 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">UPC (專輯代碼)</label>
                            <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">ISRC</label>
                            <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">音訊 URL (Dropbox)</label>
                            <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" placeholder="...&raw=1" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] text-slate-600 font-black uppercase">YouTube 網址</label>
                            <input name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">取消返回</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-brand-gold text-black font-black text-[12px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-2xl">
                            {isSubmitting ? '儲存中...' : (editId ? '更新數據' : '發佈作品')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;