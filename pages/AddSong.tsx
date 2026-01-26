
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
    videoUrl: '', // 補回影片資產欄位
    lyrics: '',
    audioUrl: '',
    isrc: '',
    upc: '',
    spotifyLink: '',
    youtubeUrl: '',
    credits: '',
    releaseCompany: '',
    publisher: '',
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
      releaseCompany: track.album?.label || prev.releaseCompany,
    }));
    setSpotifyResults([]);
    setSpotifySearch('');
    showToast("已從 Spotify 匯入基礎資料");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return showToast("標題為必填", "error");
    
    setIsSubmitting(true);
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
            {/* Left Side: Spotify and Cover */}
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm space-y-6 shadow-2xl">
                    <h3 className="text-[11px] text-brand-gold font-black uppercase tracking-[0.2em]">快速匯入數據 (SPOTIFY)</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold" placeholder="輸入歌名搜尋 Spotify..." value={spotifySearch} onChange={(e) => setSpotifySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()} />
                        <button onClick={handleSpotifySearch} disabled={isSearching} className="px-6 bg-brand-gold text-black text-[10px] font-black uppercase hover:bg-white transition-all">
                            {isSearching ? '...' : '搜尋'}
                        </button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        {spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer rounded-sm border border-white/5 group">
                                <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover rounded-sm" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-bold truncate group-hover:text-brand-gold">{t.name}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{t.artists[0].name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-2xl relative group">
                    {formData.coverUrl ? <img src={formData.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center text-slate-800 font-black">NO COVER</div>}
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">封面網址 URL</label>
                        <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 text-[10px] text-slate-400 outline-none focus:border-brand-gold" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] text-brand-gold font-black uppercase tracking-widest">影片網址 URL (MP4 底圖)</label>
                        <input name="videoUrl" value={formData.videoUrl} onChange={handleChange} className="w-full bg-black border border-brand-gold/20 p-4 text-[10px] text-brand-gold outline-none focus:border-brand-gold" placeholder="https://...&raw=1" />
                    </div>
                </div>
            </div>

            {/* Right Side: Main Editor Area */}
            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="flex border-b border-white/10 gap-10">
                        {['original', 'en', 'jp', 'zh'].map(tab => (
                            <button key={tab} type="button" onClick={() => setActiveLangTab(tab as any)} className={`pb-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeLangTab === tab ? 'text-brand-gold' : 'text-slate-500 hover:text-white'}`}>
                                {tab === 'original' ? '原文內容' : tab.toUpperCase() + ' 翻譯'}
                                {activeLangTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-gold"></div>}
                            </button>
                        ))}
                    </div>

                    {activeLangTab === 'original' ? (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">作品標題 (Title)</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg focus:border-brand-gold outline-none shadow-inner" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行類別 (Category)</label>
                                    <select name="releaseCategory" value={formData.releaseCategory} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold outline-none cursor-pointer">
                                        {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">正式歌詞 (Lyrics)</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[350px] bg-black border border-white/10 p-8 text-white text-sm font-mono leading-relaxed resize-none custom-scrollbar outline-none focus:border-brand-gold shadow-inner" placeholder="在此貼上正式歌詞內容..." />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 譯名</label>
                                <input value={formData.translations?.[activeLangTab]?.title || ''} onChange={(e) => handleTranslationChange(activeLangTab, 'title', e.target.value)} className="w-full bg-black border border-white/10 p-6 text-brand-gold font-bold text-lg outline-none" placeholder={`輸入 ${activeLangTab} 翻譯標題...`} />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{activeLangTab.toUpperCase()} 歌詞翻譯</label>
                                <textarea value={formData.translations?.[activeLangTab]?.lyrics || ''} onChange={(e) => handleTranslationChange(activeLangTab, 'lyrics', e.target.value)} className="w-full h-[350px] bg-black border border-white/10 p-8 text-brand-gold text-sm font-mono leading-relaxed resize-none custom-scrollbar outline-none focus:border-brand-gold shadow-inner" placeholder={`在此貼上 ${activeLangTab} 歌詞翻譯...`} />
                            </div>
                        </div>
                    )}

                    <div className="pt-12 border-t border-white/5 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">發行公司 (Release Company)</label>
                                <input name="releaseCompany" value={formData.releaseCompany} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-white font-bold outline-none focus:border-brand-gold" placeholder="e.g. Willwi Music" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">版權代理 (Publisher)</label>
                                <input name="publisher" value={formData.publisher} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-white font-bold outline-none focus:border-brand-gold" placeholder="e.g. Universal Music Publishing" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">發行日期 (Release Date)</label>
                                <input type="date" name="releaseDate" value={formData.releaseDate} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-white font-bold outline-none focus:border-brand-gold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">UPC (專輯代碼)</label>
                                <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">ISRC</label>
                                <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 font-mono outline-none focus:border-brand-gold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">音訊 URL (Dropbox)</label>
                                <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" placeholder="...&raw=1" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">YouTube 網址</label>
                                <input name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[11px] text-slate-400 outline-none focus:border-brand-gold" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">製作名單 (Credits)</label>
                            <textarea name="credits" value={formData.credits} onChange={handleChange} className="w-full h-32 bg-black border border-white/10 p-6 text-white text-[11px] font-mono leading-relaxed resize-none custom-scrollbar outline-none focus:border-brand-gold shadow-inner" placeholder="© 2025 Willwi Music. All rights reserved. Composer: ..., Producer: ..." />
                        </div>
                    </div>

                    <div className="flex justify-end gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">取消返回</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-brand-gold text-black font-black text-[12px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-2xl rounded-sm">
                            {isSubmitting ? '處理中...' : (editId ? '更新數據' : '發佈作品')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;
