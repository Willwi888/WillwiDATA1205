
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
  const [activeSearchSource, setActiveSearchSource] = useState<'spotify' | 'mb'>('mb');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [mbResults, setMbResults] = useState<MBRecording[]>([]);
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
    mbid: '',
    spotifyLink: '',
    appleMusicLink: '',
    youtubeUrl: '',
    credits: '',
    creativeNote: '',
    labLog: '',
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

  const handleImportSpotify = async (track: any) => {
    showToast("導入 Spotify 詳細資料...");
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.isrc) return showToast("標題與 ISRC 為必填欄位", "error");
    setIsSubmitting(true);
    const success = editId ? await updateSong(editId, formData) : await addSong(formData as Song);
    if (success) {
        showToast("雲端同步成功");
        navigate('/admin');
    } else {
        setIsSubmitting(false);
        showToast("同步失敗", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black pt-40 pb-60 px-6 md:px-20 flex flex-col items-center">
        <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-16 animate-fade-in">
            
            <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-8 rounded-sm shadow-2xl">
                    <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                        <button onClick={() => setActiveSearchSource('mb')} className={`text-[10px] font-medium uppercase tracking-widest ${activeSearchSource === 'mb' ? 'text-brand-gold' : 'text-slate-500'}`}>MusicBrainz</button>
                        <button onClick={() => setActiveSearchSource('spotify')} className={`text-[10px] font-medium uppercase tracking-widest ${activeSearchSource === 'spotify' ? 'text-[#1DB954]' : 'text-slate-500'}`}>Spotify</button>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-black border border-white/10 p-4 text-white text-xs outline-none" 
                            placeholder="搜尋雲端資料庫..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                        />
                        <button onClick={handleSearch} className="px-6 bg-white text-black text-[10px] font-medium uppercase tracking-widest">Go</button>
                    </div>
                    <div className="mt-6 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {activeSearchSource === 'spotify' && spotifyResults.map(t => (
                            <div key={t.id} onClick={() => handleImportSpotify(t)} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 hover:border-[#1DB954] cursor-pointer group">
                                <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover" alt="" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] text-white font-medium truncate group-hover:text-[#1DB954]">{t.name}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{t.artists[0].name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden shadow-2xl relative group rounded-sm">
                    {formData.coverUrl ? <img src={formData.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 uppercase tracking-widest text-[10px]">No Cover</div>}
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">封面網址 (Cover URL)</label>
                    <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 text-white text-xs outline-none focus:border-brand-gold" placeholder="https://..." />
                </div>
            </div>

            <div className="lg:col-span-8 bg-[#0f172a]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-sm shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex border-b border-white/10 gap-8 mb-8">
                        <button type="button" onClick={() => setActiveTab('content')} className={`pb-4 text-[10px] font-medium uppercase tracking-[0.3em] ${activeTab === 'content' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>主要資訊內容</button>
                        <button type="button" onClick={() => setActiveTab('storyline')} className={`pb-4 text-[10px] font-medium uppercase tracking-[0.3em] ${activeTab === 'storyline' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500'}`}>日誌故事與幕後</button>
                    </div>

                    {activeTab === 'content' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-medium uppercase">歌曲名稱</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white font-medium text-lg outline-none focus:border-brand-gold" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-medium uppercase">ISRC (核心唯一編碼)</label>
                                    <input name="isrc" value={formData.isrc} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono outline-none focus:border-brand-gold" placeholder="TWUM..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-medium uppercase">音訊網址 (Direct Audio Link)</label>
                                    <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold" placeholder="Dropbox / Cloud Link" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] text-slate-500 font-medium uppercase">UPC (專輯條碼)</label>
                                    <input name="upc" value={formData.upc} onChange={handleChange} className="w-full bg-black border border-white/10 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold" placeholder="199..." />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-medium uppercase">動態歌詞 / 同步對時歌詞</label>
                                <textarea name="lyrics" value={formData.lyrics} onChange={handleChange} className="w-full h-[400px] bg-black border border-white/10 p-8 text-white text-sm font-mono custom-scrollbar outline-none focus:border-brand-gold" placeholder="[00:12.34]第一句歌詞..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'storyline' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-medium uppercase">創意日誌 (Creative Note)</label>
                                <textarea name="creativeNote" value={formData.creativeNote} onChange={handleChange} className="w-full h-[200px] bg-black border border-white/10 p-8 text-white text-sm outline-none" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 font-medium uppercase">製作名單 (Credits)</label>
                                <textarea name="credits" value={formData.credits} onChange={handleChange} className="w-full h-[200px] bg-black border border-white/10 p-8 text-white text-sm outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-10 pt-16">
                        <button type="button" onClick={() => navigate('/admin')} className="text-slate-600 font-medium text-[11px] uppercase tracking-widest">取消</button>
                        <button type="submit" disabled={isSubmitting} className="px-20 py-6 bg-white text-black font-medium text-[12px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all">
                            {isSubmitting ? '同步雲端資料庫...' : '儲存並同步作品'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}; export default AddSong;
