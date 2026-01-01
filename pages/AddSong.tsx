
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { 
    searchSpotifyTracks, 
    searchSpotifyAlbums, 
    getFullSpotifyAlbum, 
    getSpotifyAlbumTracks, 
    SpotifyTrack, 
    SpotifyAlbum 
} from '../services/spotifyService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

const formatCreditsFromSpotify = (track: SpotifyTrack, album?: SpotifyAlbum) => {
    const artistList = track.artists.map(a => a.name).join(', ');
    const label = album?.label || track.album.name || 'Willwi Music';
    return `© 2025 Willwi Music\n℗ 2025 Willwi Music\n\nMain Artist : ${artistList}\nComposer : Tsung Yu Chen\nLyricist : Tsung Yu Chen\nArranger : Willwi\nProducer : Will Chen\nLabel : ${label}`;
};

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'track' | 'album'>('track');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [searchError, setSearchError] = useState('');
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

  const validateForm = () => {
      const errors: Record<string, string> = {};
      if (!formData.title?.trim()) errors.title = "作品標題為必填 (Title Required)";
      if (!formData.releaseDate) errors.releaseDate = "發行日期為必填 (Date Required)";
      if (!formData.coverUrl?.trim()) errors.coverUrl = "封面圖片為必填 (Cover Required)";
      if (formData.isInteractiveActive && !formData.audioUrl?.trim()) {
          errors.audioUrl = "互動模式需提供音檔網址 (Audio Required for Lab)";
      }
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setSearchError('');
    if (!searchQuery.trim()) return setSearchError('Please enter a query');
    
    setIsSearching(true);
    try {
        const token = await searchSpotifyTracks(searchQuery); // Refresh token
        if (searchType === 'track') {
            const results = await searchSpotifyTracks(searchQuery);
            setTrackResults(results);
        } else {
            const results = await searchSpotifyAlbums(searchQuery);
            setAlbumResults(results);
        }
    } catch (err) { setSearchError('Spotify Search Failed'); } 
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
      alert(`已帶入單曲: ${track.name}`);
  };

  const importSpotifyAlbum = async (album: SpotifyAlbum) => {
      if (!window.confirm(`確定匯入專輯《${album.name}》的所有曲目？`)) return;
      setIsSearching(true);
      try {
          const fullAlbum = await getFullSpotifyAlbum(album.id);
          const tracks = await getSpotifyAlbumTracks(album.id);
          const newSongs: Song[] = tracks.map(track => ({
              id: `spotify-${track.id}`,
              title: track.name,
              coverUrl: album.images[0]?.url,
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseDate: album.release_date,
              releaseCompany: fullAlbum?.label || album.name,
              isrc: track.external_ids.isrc,
              upc: fullAlbum?.external_ids?.upc,
              spotifyId: track.id,
              spotifyLink: track.external_urls.spotify,
              credits: formatCreditsFromSpotify(track, fullAlbum || undefined),
              isEditorPick: false,
              isInteractiveActive: false,
              isOfficialExclusive: false,
          }));
          await bulkAddSongs(newSongs);
          alert(`批次匯入 ${newSongs.length} 首作品完成！`);
          navigate('/database');
      } catch (e) { alert("專輯匯入失敗"); }
      finally { setIsSearching(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
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
                   <button onClick={() => passwordInput === '8520' ? enableAdmin() : setLoginError('Error')} className="w-full py-4 bg-brand-gold text-black font-black uppercase tracking-widest text-xs">Unlock</button>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-32 px-6">
      <div className="mb-10 flex justify-between items-end border-b border-white/10 pb-6">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter text-shadow-gold">作品登錄系統</h2>
          <div className="flex gap-2">
              <button onClick={() => setImportMode('spotify')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'spotify' ? 'bg-brand-accent text-black' : 'bg-slate-800 text-slate-500'}`}>Spotify 搜尋</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'manual' ? 'bg-brand-accent text-black' : 'bg-slate-800 text-slate-500'}`}>手動輸入</button>
          </div>
      </div>

      {importMode === 'spotify' && (
          <div className="mb-12 bg-slate-900/50 p-6 border border-white/5 rounded-xl">
             <div className="flex gap-4 mb-6">
                 <select className="bg-slate-800 text-white text-[10px] font-black uppercase px-4 py-2" value={searchType} onChange={e => setSearchType(e.target.value as any)}>
                     <option value="track">Track (單曲)</option>
                     <option value="album">Album (專輯)</option>
                 </select>
                 <input 
                    type="text" placeholder="搜尋關鍵字或貼上 Spotify 連結..." 
                    className="flex-grow bg-black border border-white/10 px-4 py-3 text-white text-sm outline-none"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                 />
                 <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-brand-accent text-black font-black text-xs uppercase tracking-widest">
                    {isSearching ? '...' : 'Search'}
                 </button>
             </div>
             
             <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                 {trackResults.map(track => (
                     <div key={track.id} onClick={() => importSpotifyTrack(track)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/5 cursor-pointer border border-white/5">
                         <img src={track.album.images[0]?.url} className="w-10 h-10 object-cover" alt="" />
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{track.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{track.artists[0].name} • {track.album.name}</div>
                         </div>
                         <div className="text-brand-accent text-[9px] font-black uppercase tracking-widest">Import</div>
                     </div>
                 ))}
                 {albumResults.map(album => (
                     <div key={album.id} onClick={() => importSpotifyAlbum(album)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-brand-accent/20 cursor-pointer border border-brand-accent/30">
                         <img src={album.images[0]?.url} className="w-10 h-10 object-cover" alt="" />
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{album.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{album.album_type} • {album.release_date}</div>
                         </div>
                         <div className="text-brand-accent text-[9px] font-black uppercase tracking-widest">Import Album</div>
                     </div>
                 ))}
             </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                 <label className={`text-[10px] font-black uppercase tracking-widest ${formErrors.title ? 'text-red-500' : 'text-slate-500'}`}>作品名稱 *</label>
                 <input name="title" className={`w-full bg-slate-900 border px-4 py-3 text-white text-sm outline-none ${formErrors.title ? 'border-red-500' : 'border-white/10'}`} value={formData.title} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">版本標記 (e.g. Acoustic, Remix)</label>
                 <input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm outline-none" value={formData.versionLabel} onChange={handleChange} />
             </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">語系</label><select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs" value={formData.language} onChange={handleChange}>{Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
             <div className="space-y-2">
                 <label className={`text-[10px] font-black uppercase tracking-widest ${formErrors.releaseDate ? 'text-red-500' : 'text-slate-500'}`}>發行日期 *</label>
                 <input type="date" name="releaseDate" className={`w-full bg-slate-900 border px-4 py-3 text-white text-xs ${formErrors.releaseDate ? 'border-red-500' : 'border-white/10'}`} value={formData.releaseDate} onChange={handleChange} />
             </div>
             <div className="flex items-center gap-3 pt-8"><input type="checkbox" name="isOfficialExclusive" checked={formData.isOfficialExclusive} onChange={handleChange} className="w-4 h-4 accent-brand-gold" /><label className="text-[9px] text-brand-gold font-black uppercase">官網獨家</label></div>
             <div className="flex items-center gap-3 pt-8"><input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="w-4 h-4 accent-emerald-500" /><label className="text-[9px] text-emerald-500 font-black uppercase">互動實驗室</label></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                 <label className={`text-[10px] font-black uppercase tracking-widest ${formErrors.coverUrl ? 'text-red-500' : 'text-slate-500'}`}>封面網址 *</label>
                 <input name="coverUrl" className={`w-full bg-slate-900 border px-4 py-3 text-white text-xs font-mono ${formErrors.coverUrl ? 'border-red-500' : 'border-white/10'}`} value={formData.coverUrl} onChange={handleChange} />
             </div>
             <div className="space-y-2">
                 <label className={`text-[10px] font-black uppercase tracking-widest ${formErrors.audioUrl ? 'text-red-500' : 'text-brand-accent'}`}>互動模式專用音檔網址</label>
                 <input name="audioUrl" className={`w-full bg-slate-900 border px-4 py-3 text-brand-accent text-xs font-mono ${formErrors.audioUrl ? 'border-red-500' : 'border-white/10'}`} value={formData.audioUrl} onChange={handleChange} placeholder="Dropbox ?raw=1" />
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ISRC</label><input name="isrc" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs font-mono" value={formData.isrc} onChange={handleChange} /></div>
            <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">UPC</label><input name="upc" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs font-mono" value={formData.upc} onChange={handleChange} /></div>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">製作團隊 (Credits)</label><textarea name="credits" className="w-full h-32 bg-slate-900 border border-white/10 px-4 py-3 text-white text-[10px] font-mono" value={formData.credits} onChange={handleChange} /></div>

        <div className="pt-10 flex justify-end gap-6">
            <button type="button" onClick={() => navigate('/database')} className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-10 py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.2em] shadow-2xl">
                {isSaving ? 'Saving...' : '儲存作品'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddSong;
