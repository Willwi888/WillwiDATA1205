
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, ProjectType, ReleaseCategory, Song, SongTranslation } from '../types';
import { searchSpotifyTracks, getSpotifyAlbum } from '../services/spotifyService';
import { searchMBRecordings, MBRecording } from '../services/musicbrainzService';
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
  const [activeSearchSource, setActiveSearchSource] = useState<'spotify' | 'mb'>('mb');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [mbResults, setMbResults] = useState<MBRecording[]>([]);
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
    mbid: '',
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

  const handleImportMB = (rec: MBRecording) => {
    setFormData(prev => ({
        ...prev,
        title: rec.title,
        isrc: rec.isrc || prev.isrc,
        mbid: rec.id,
        releaseDate: rec.releaseDate || prev.releaseDate,
        releaseCompany: rec.releaseCompany || prev.releaseCompany,
        releaseCategory: rec.releaseCategory || prev.releaseCategory
    }));
    showToast(`已從 MusicBrainz 導入 "${rec.title}"`);
  };

  const handleImportSpotify = async (track: any) => {
    showToast("正在獲取 Spotify 詳細資料...");
    let upc = '';
    let label = '';
    if (track.album?.id) {
        try {
            const fullAlbum = await getSpotifyAlbum(track.album.id);
            if (fullAlbum) {
                upc = fullAlbum.external_ids?.upc || fullAlbum.external_ids?.ean || '';
                label = fullAlbum.label || '';
            }
        } catch (e) {}
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
    showToast("Spotify 資料已導入");
  };

  const handleSearch = async () => {
      if (!searchQuery) return;
      setIsSearching(true);
      try {
          if (activeSearchSource === 'spotify') {
              const res = await searchSpotifyTracks(searchQuery);
              setSpotifyResults(res);
          } else {
              const res = await searchMBRecordings(searchQuery);
              setMbResults(res);
          }
      } catch (e) {
          showToast("搜尋失敗", "error");
      } finally {
          setIsSearching(false);
      }
  };

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
      translations: { ...prev.translations, [lang]: { ...(prev.translations?.[lang] || {}), [field]: value } }
    }));
  };

  const handleAutoFindYouTube = async () => {
      if (!formData.title) return showToast("請先輸入歌曲名稱", "error");
      setIsFindingYT(true);
      try {
          const link = await searchYouTubeMusicLink(formData.title, formData.isrc || '');
          if (link) {
              setFormData(prev => ({ ...prev, youtubeUrl: link }));
              showToast("已找到 YouTube Music 連結");
          }
      } catch (e) {} finally { setIsFindingYT(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.isrc) return showToast("標題與 ISRC 為必填", "error");
    setIsSubmitting(true);
    const success = editId ? await updateSong(editId, formData) : await addSong(formData as Song);
    if (success) {
        showToast("資料已儲存");
        navigate('/admin');
    } else {
        setIsSubmitting(false);
        showToast("儲存失敗", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black pt-40 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fade-in">
            
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm shadow-2xl">
                    <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                        <button onClick={() => setActiveSearchSource('mb')} className={`text-[10px] font-black uppercase tracking-widest ${activeSearchSource === 'mb' ? 'text-brand-gold' : 'text-slate-500'}`}>MusicBrainz</button>
                        <button onClick={() => setActiveSearchSource('spotify')} className={`text-[10px] font-black uppercase tracking-widest ${activeSearchSource === 'spotify' ? 'text-[#1DB954]' : 'text-slate-500'}`}>Spotify</button>
                    </div>
                    
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold transition-all" placeholder="搜尋..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                        <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-white text-black text-[10px] font-black uppercase">{isSearching ? '...' : 'Go'}</button>
                    </div>

                    <div className="mt-6 space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {activeSearchSource === 'mb' ? mbResults.map(r => (
                            <div key={r.id} onClick={() => handleImportMB(r)} className="p-4 bg-white/[0.03] border border-white/5 hover:border-brand-gold cursor-pointer group">
                                <div className="text-[11px] text-white font-bold group-hover:text-brand-gold">{r.title}</div>
                                <div className="text-[9px] text-slate-500 mt-1 font-mono">{r.isrc || 'No ISRC'} • {r.releaseDate || 'Unknown Date'}</div>
                            </div>
                        )) : spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 hover:border-[#1DB954] cursor-pointer group">
                                <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover" alt="" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-bold truncate group-hover:text-[#1DB954]">{t.name}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{t.artists[0].name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden shadow-2xl">
                    {formData.coverUrl ? <img src={formData.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center opacity-10 text-[10px] uppercase tracking-widest">Cover Preview</div>}
                </div>
            </div>

            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex border-b border-white/10 gap-8 mb-8">
                        <button type="button" onClick={() => setActiveTab('content')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] ${activeTab === 'content' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>主要資訊</button>
                        <button type="button" onClick={() => setActiveTab('storyline')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] ${activeTab === 'storyline' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>日誌故事</button>
                    </div>

                    {activeTab === 'content' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">歌曲名稱</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg outline-none" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">ISRC (核心編碼)</label>
                                    <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono outline-none" placeholder="TWUM..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-600 font-black uppercase">MBID (音樂腦 ID)</label>
                                    <input name="mbid" value={formData.mbid} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[10px] text-slate-400 font-mono outline-none" readOnly />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-600 font-black uppercase">發行日期</label>
                                    <input name="releaseDate" type="date" value={formData.releaseDate} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[10px] text-slate-400 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] text-slate-600 font-black uppercase">發行公司</label>
                                    <input name="releaseCompany" value={formData.releaseCompany} onChange={handleChange} className="w-full bg-black border border-white/5 p-4 text-[10px] text-slate-400 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase">歌詞</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[300px] bg-black border border-white/10 p-8 text-white text-sm font-mono custom-scrollbar outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-black text-[11px] uppercase">取消</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-white text-black font-black text-[12px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all">
                            {isSubmitting ? '同步中...' : '儲存作品'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;
