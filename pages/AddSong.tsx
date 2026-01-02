
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { 
    getSpotifyToken,
    searchSpotifyTracks, 
    searchSpotifyAlbums, 
    getFullSpotifyAlbum, 
    getSpotifyAlbumTracks, 
    SpotifyTrack, 
    SpotifyAlbum 
} from '../services/spotifyService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const formatCreditsFromSpotify = (track: SpotifyTrack, album?: SpotifyAlbum) => {
    const artistList = track.artists.map(a => a.name).join(', ');
    const label = album?.label || track.album.name || 'Willwi Music';
    return `© 2025 Willwi Music\n℗ 2025 Willwi Music\n\nMain Artist : ${artistList}\nComposer : Tsung Yu Chen\nLyricist : Tsung Yu Chen\nArranger : Willwi\nProducer : Will Chen\nLabel : ${label}`;
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-900/30 border border-white/5 p-8 rounded-xl space-y-6">
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] border-b border-white/5 pb-4 mb-2">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {children}
        </div>
    </div>
);

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [importMode, setImportMode] = useState<'spotify' | 'manual'>('spotify'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'track' | 'album'>('track');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music', 
    publisher: 'Willwi Music', 
    releaseDate: new Date().toISOString().split('T')[0],
    isInteractiveActive: false,
    isOfficialExclusive: false,
    coverUrl: '', 
    lyrics: '',
    description: '',
    credits: '', 
    spotifyId: '',
    audioUrl: '',
    youtubeUrl: '',
    videoUrl: '',
    cloudVideoUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (formErrors[name]) {
          setFormErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[name];
              return newErrors;
          });
      }
    }
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); 
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
        await getSpotifyToken(); 
        if (searchType === 'track') {
            const results = await searchSpotifyTracks(searchQuery);
            setTrackResults(results);
        } else {
            const results = await searchSpotifyAlbums(searchQuery);
            setAlbumResults(results);
        }
    } catch (err) { alert('Spotify Search Failed'); } 
    finally { setIsSearching(false); }
  };

  const importSpotifyTrack = async (track: SpotifyTrack) => {
      setIsSearching(true);
      const fullAlbum = await getFullSpotifyAlbum(track.album.id);
      setFormData(prev => ({
          ...prev,
          title: track.name,
          coverUrl: track.album.images[0]?.url,
          releaseDate: track.album.release_date,
          spotifyId: track.id,
          spotifyLink: track.external_urls.spotify,
          isrc: track.external_ids.isrc,
          upc: fullAlbum?.external_ids?.upc,
          releaseCompany: fullAlbum?.label || track.album.name,
          credits: formatCreditsFromSpotify(track, fullAlbum || undefined)
      }));
      setTrackResults([]);
      setIsSearching(false);
      setImportMode('manual'); // 自動切換到編輯模式以便確認
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) { alert("作品標題為必填欄位。"); return; }
    setIsSaving(true);
    const newSong: Song = {
      id: Date.now().toString(),
      title: formData.title!.trim(),
      versionLabel: formData.versionLabel?.trim() || '',
      coverUrl: formData.coverUrl?.trim() || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseCompany: formData.releaseCompany?.trim() || '',
      releaseDate: formData.releaseDate!,
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      isOfficialExclusive: !!formData.isOfficialExclusive,
      isrc: formData.isrc?.trim(),
      upc: formData.upc?.trim(),
      audioUrl: formData.audioUrl?.trim(),
      youtubeUrl: formData.youtubeUrl?.trim(),
      videoUrl: formData.videoUrl?.trim(),
      cloudVideoUrl: formData.cloudVideoUrl?.trim(),
      spotifyId: formData.spotifyId?.trim(),
      lyrics: formData.lyrics?.trim(),
      description: formData.description?.trim(),
      credits: formData.credits?.trim()
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center">
               <div className="bg-slate-900 border border-slate-800 p-10 rounded-xl text-center shadow-2xl">
                   <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest">Admin Access</h2>
                   <input type="password" placeholder="Passcode" className="w-full bg-black border border-slate-700 p-4 text-center tracking-[0.5em] mb-4 text-white" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                   <button onClick={() => passwordInput === '8520' ? enableAdmin() : alert('Error')} className="w-full py-4 bg-brand-gold text-black font-black uppercase tracking-widest text-xs">Unlock</button>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto pb-60 px-6 pt-10">
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter text-shadow-gold">作品登錄系統</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Central Catalog Engine</p>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
              <button onClick={() => setImportMode('spotify')} className={`px-6 py-2.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'spotify' ? 'bg-brand-accent text-black' : 'text-slate-500 hover:text-white'}`}>Spotify 智慧搜尋</button>
              <button onClick={() => setImportMode('manual')} className={`px-6 py-2.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'manual' ? 'bg-brand-accent text-black' : 'text-slate-500 hover:text-white'}`}>手動登錄模式</button>
          </div>
      </div>

      {importMode === 'spotify' && (
          <div className="mb-16 space-y-6">
             <div className="flex gap-px bg-white/5 p-px border border-white/10 shadow-2xl">
                 <select className="bg-black text-white text-[10px] font-black uppercase px-6 py-5 outline-none border-r border-white/10" value={searchType} onChange={e => setSearchType(e.target.value as any)}>
                     <option value="track">單曲 (Track)</option>
                     <option value="album">專輯 (Album)</option>
                 </select>
                 <input 
                    type="text" placeholder="搜尋威威的作品名稱或貼上 Spotify 連結..." 
                    className="flex-grow bg-black px-6 py-5 text-white text-sm outline-none focus:bg-slate-900 transition-all font-bold"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                 />
                 <button onClick={handleSearch} disabled={isSearching} className="px-10 bg-brand-accent text-black font-black text-xs uppercase tracking-widest transition-all hover:bg-white active:scale-95">
                    {isSearching ? '...' : 'Search'}
                 </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {trackResults.map(track => (
                     <div key={track.id} onClick={() => importSpotifyTrack(track)} className="flex items-center gap-4 p-4 bg-slate-900/40 hover:bg-brand-accent/10 cursor-pointer border border-white/5 rounded-xl transition-all group">
                         <img src={track.album.images[0]?.url} className="w-12 h-12 object-cover rounded shadow-lg group-hover:scale-110 transition-transform" alt="" />
                         <div className="flex-grow overflow-hidden">
                             <div className="text-white text-xs font-black truncate">{track.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase tracking-wider truncate">{track.artists[0].name} • {track.album.name}</div>
                         </div>
                         <div className="text-brand-accent text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Import</div>
                     </div>
                 ))}
             </div>
             {trackResults.length > 0 && <div className="text-center"><button onClick={() => {setTrackResults([]); setSearchQuery('');}} className="text-[10px] text-slate-600 font-black uppercase tracking-widest hover:text-white">Clear Results</button></div>}
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in">
        <FormSection title="01. 基本作品資訊 (Core Identity)">
             <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">作品名稱 (Title) *</label>
                 <input name="title" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-sm outline-none focus:border-brand-accent transition-all font-bold" value={formData.title} onChange={handleChange} required />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">版本標記 (Version Label)</label>
                 <input name="versionLabel" placeholder="e.g. Acoustic, Remix, Live" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-sm outline-none focus:border-brand-accent transition-all" value={formData.versionLabel} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行類別</label>
                <select name="releaseCategory" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs outline-none" value={formData.releaseCategory} onChange={handleChange}>
                    {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">語系</label>
                <select name="language" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs outline-none" value={formData.language} onChange={handleChange}>
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
             </div>
        </FormSection>

        <FormSection title="02. 技術規格與發行 (Technical & Release)">
             <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行專案 (Project)</label>
                <select name="projectType" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs outline-none" value={formData.projectType} onChange={handleChange}>
                    {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行日期 *</label>
                 <input type="date" name="releaseDate" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs outline-none" value={formData.releaseDate} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ISRC</label>
                 <input name="isrc" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs font-mono outline-none" value={formData.isrc} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">UPC</label>
                 <input name="upc" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs font-mono outline-none" value={formData.upc} onChange={handleChange} />
             </div>
        </FormSection>

        <FormSection title="03. 媒體資源連結 (Media Resources)">
             <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">封面圖片網址</label>
                 <input name="coverUrl" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-xs font-mono outline-none" value={formData.coverUrl} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">互動對位用音檔 (Audio Direct Link)</label>
                 <input name="audioUrl" className="w-full bg-black border border-brand-accent/20 px-4 py-4 text-brand-accent text-xs font-mono outline-none focus:border-brand-accent" value={formData.audioUrl} onChange={handleChange} placeholder="Dropbox ?raw=1" />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">YouTube 影音連結</label>
                 <input name="youtubeUrl" className="w-full bg-black border border-brand-gold/20 px-4 py-4 text-white text-xs font-mono outline-none" value={formData.youtubeUrl} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">獨家影片直連 (Cloud Video)</label>
                 <input name="videoUrl" className="w-full bg-black border border-brand-gold/20 px-4 py-4 text-white text-xs font-mono outline-none" value={formData.videoUrl} onChange={handleChange} />
             </div>
        </FormSection>

        <div className="bg-slate-900/30 border border-white/5 p-8 rounded-xl space-y-8">
            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] border-b border-white/5 pb-4">04. 致謝與內容 (Content & Credits)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">動態歌詞 (LRC Format)</label>
                    <textarea name="lyrics" className="w-full h-80 bg-black border border-white/10 px-4 py-4 text-brand-accent text-[11px] font-mono outline-none focus:border-brand-accent" value={formData.lyrics} onChange={handleChange} placeholder="[00:10.00] 歌詞內容..." />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">製作團隊 (Credits)</label>
                    <textarea name="credits" className="w-full h-80 bg-black border border-white/10 px-4 py-4 text-slate-400 text-[10px] font-mono outline-none focus:border-brand-accent" value={formData.credits} onChange={handleChange} />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">創作故事 (Background Story)</label>
                <textarea name="description" className="w-full h-32 bg-black border border-white/10 px-6 py-4 text-white text-sm font-light outline-none focus:border-brand-accent leading-relaxed" value={formData.description} onChange={handleChange} />
            </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-brand-gold/5 p-8 border border-brand-gold/10 rounded-xl">
             <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex items-center gap-3">
                    <input type="checkbox" name="isOfficialExclusive" checked={formData.isOfficialExclusive} onChange={handleChange} className="w-5 h-5 accent-brand-gold" />
                    <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">官網獨家發行 (Exclusive)</label>
                 </div>
                 <div className="flex items-center gap-3">
                    <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="w-5 h-5 accent-emerald-500" />
                    <label className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">開放互動實驗室 (Active Lab)</label>
                 </div>
             </div>
             <div className="flex gap-4">
                <button type="button" onClick={() => navigate('/database')} className="px-8 py-4 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-14 py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:bg-white active:scale-95 transition-all">
                    {isSaving ? 'Saving...' : '儲存作品資料'}
                </button>
             </div>
        </div>
      </form>
    </div>
  );
};

export default AddSong;
