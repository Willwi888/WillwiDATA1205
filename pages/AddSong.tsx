
import React, { useState, useEffect, useRef } from 'react';
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
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

const DEFAULT_CREDITS = `© 2025 Willwi Music
℗ 2025 Willwi Music

Main Artist : Willwi 陳威兒
Composer : Tsung Yu Chen
Lyricist : Tsung Yu Chen
Arranger : Willwi
Producer : Will Chen
Recording Engineer | Will Chen
Mixing Engineer | Will Chen
Mastering Engineer | Will Chen
Recording Studio | Willwi Studio, Taipei
Label | Willwi Music`;

const formatCreditsFromSpotify = (track: SpotifyTrack, album?: SpotifyAlbum) => {
    const artistList = track.artists.map(a => a.name).join(', ');
    const label = album?.label || track.album.name || 'Willwi Music';
    return `© 2025 Willwi Music\n℗ 2025 Willwi Music\n\nMain Artist : ${artistList}\nComposer : Tsung Yu Chen\nLyricist : Tsung Yu Chen\nArranger : Willwi\nProducer : Will Chen\nLabel : ${label}\nRecording Studio | Willwi Studio, Taipei`;
};

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify' | 'mb'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'track' | 'album'>('track');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music', 
    publisher: 'Willwi Music', 
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    isInteractiveActive: false,
    isOfficialExclusive: false,
    coverUrl: '', 
    lyrics: '',
    description: '',
    credits: DEFAULT_CREDITS, 
    spotifyId: '',
    audioUrl: '',
    customAudioLink: '',
    youtubeUrl: '',
    cloudVideoUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
      if (passwordInput === correctPwd) { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setMbResults([]); setSearchError('');
    if (!searchQuery.trim() && importMode !== 'mb') return setSearchError('Please enter a query');
    
    setIsSearching(true);
    try {
        if (importMode === 'smart') {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const bridgeResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Search Spotify for: "${searchQuery}". Detect if it's a track or album.`,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { spotifyUrl: { type: Type.STRING }, isAlbum: { type: Type.BOOLEAN } } }
                }
            });
            const bridgeData = JSON.parse(bridgeResponse.text);
            if (bridgeData.spotifyUrl) {
                const id = bridgeData.spotifyUrl.split('/track/')[1]?.split('?')[0] || bridgeData.spotifyUrl.split('/album/')[1]?.split('?')[0];
                if (id) {
                    if (bridgeData.isAlbum) {
                        const album = await getFullSpotifyAlbum(id);
                        if (album) setAlbumResults([album]);
                    } else {
                        const tracks = await searchSpotifyTracks(id);
                        setTrackResults(tracks);
                    }
                }
            } else { setSearchError("AI could not find exact match."); }
        } else if (importMode === 'spotify') {
            if (searchType === 'track') {
                const results = await searchSpotifyTracks(searchQuery);
                setTrackResults(results);
            } else {
                const results = await searchSpotifyAlbums(searchQuery);
                setAlbumResults(results);
            }
        } else if (importMode === 'mb') {
            const results = await getWillwiReleases();
            setMbResults(results);
        }
    } catch (err) { setSearchError('Search failed.'); } 
    finally { setIsSearching(false); }
  };

  const importSpotifyTrack = async (track: SpotifyTrack) => {
      const fullAlbum = await getFullSpotifyAlbum(track.album.id);
      setFormData(prev => ({
          ...prev,
          title: track.name,
          coverUrl: track.album.images[0]?.url,
          releaseDate: track.album.release_date,
          spotifyId: track.id,
          isrc: track.external_ids.isrc,
          upc: fullAlbum?.external_ids?.upc,
          releaseCompany: fullAlbum?.label || track.album.name,
          publisher: fullAlbum?.label || track.album.name,
          credits: formatCreditsFromSpotify(track, fullAlbum || undefined)
      }));
      setTrackResults([]);
      setAlbumResults([]);
      alert(`已帶入歌曲: ${track.name}`);
  };

  const importSpotifyAlbum = async (album: SpotifyAlbum) => {
      if (!window.confirm(`確定要導入整張專輯《${album.name}》嗎？`)) return;
      setIsSearching(true);
      try {
          const fullAlbum = await getFullSpotifyAlbum(album.id);
          const tracks = await getSpotifyAlbumTracks(album.id);
          
          const newSongs: Song[] = tracks.map((track) => ({
              id: `spotify-${track.id}`,
              title: track.name,
              coverUrl: album.images[0]?.url,
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseDate: album.release_date,
              releaseCompany: fullAlbum?.label || album.name,
              publisher: fullAlbum?.label || album.name,
              isrc: track.external_ids.isrc,
              upc: fullAlbum?.external_ids?.upc,
              spotifyId: track.id,
              credits: formatCreditsFromSpotify(track, fullAlbum || undefined),
              isEditorPick: false,
              isInteractiveActive: false,
              isOfficialExclusive: false,
          }));

          await bulkAddSongs(newSongs);
          alert(`成功批次導入 ${newSongs.length} 首歌曲！`);
          navigate('/database');
      } catch (e) {
          alert("批次導入失敗");
      } finally {
          setIsSearching(false);
      }
  };

  const importMBRelease = async (group: MBReleaseGroup) => {
      setIsSearching(true);
      const details = await getReleaseGroupDetails(group.id, group['primary-type']);
      const cover = await getCoverArtUrl(group.id);
      if (details) {
          setFormData(prev => ({
              ...prev,
              title: group.title,
              releaseDate: details.releaseDate,
              coverUrl: cover || prev.coverUrl,
              releaseCompany: details.releaseCompany,
              publisher: details.releaseCompany,
              releaseCategory: details.category,
          }));
      }
      setMbResults([]);
      setIsSearching(false);
      alert(`已從 MusicBrainz 填入: ${group.title}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Please enter a Title.");
    setIsSaving(true);
    const newSong: Song = {
      id: Date.now().toString(),
      title: formData.title!,
      versionLabel: formData.versionLabel || '',
      coverUrl: formData.coverUrl || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseCompany: formData.releaseCompany || '',
      publisher: formData.publisher || '',
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      isOfficialExclusive: !!formData.isOfficialExclusive,
      isrc: formData.isrc,
      upc: formData.upc,
      audioUrl: convertToDirectStream(formData.audioUrl || ''),
      customAudioLink: formData.customAudioLink || '',
      youtubeUrl: formData.youtubeUrl,
      cloudVideoUrl: formData.cloudVideoUrl,
      spotifyId: formData.spotifyId,
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('nav_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">管理員驗證</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input type="password" placeholder="Access Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-gold text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">作品登錄系統</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('smart')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'smart' ? 'bg-white text-black' : 'text-slate-500'}`}>Smart AI</button>
              <button onClick={() => setImportMode('spotify')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'spotify' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Spotify</button>
              <button onClick={() => setImportMode('mb')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'mb' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>MB</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Manual</button>
          </div>
      </div>

      {importMode !== 'manual' && (
          <div className="mb-12 bg-slate-900/50 p-6 border border-white/5 rounded-xl">
             <div className="flex flex-col md:flex-row gap-4 mb-4">
                 {importMode === 'spotify' && (
                     <select className="bg-slate-800 text-white text-[10px] font-black uppercase border border-white/10 px-4 py-2 rounded" value={searchType} onChange={(e) => setSearchType(e.target.value as any)}>
                         <option value="track">Track (單曲)</option>
                         <option value="album">Album (專輯)</option>
                     </select>
                 )}
                 <div className="flex-grow flex gap-2">
                    <input 
                        type="text" 
                        placeholder={importMode === 'smart' ? "輸入作品名稱或貼上 Spotify 連結..." : `搜尋 ${searchType === 'track' ? '單曲' : '專輯'}...`} 
                        className="flex-grow bg-black border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-brand-accent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-widest disabled:opacity-50">
                        {isSearching ? '...' : 'Search'}
                    </button>
                 </div>
             </div>
             
             <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                 {trackResults.map(track => (
                     <div key={track.id} onClick={() => importSpotifyTrack(track)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                         <img src={track.album.images[0]?.url} className="w-10 h-10 object-cover" alt="" />
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{track.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{track.artists[0].name} • {track.album.name}</div>
                         </div>
                         <div className="text-emerald-500 text-[9px] font-bold uppercase tracking-widest">Import</div>
                     </div>
                 ))}
                 {albumResults.map(album => (
                     <div key={album.id} onClick={() => importSpotifyAlbum(album)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/10 cursor-pointer border border-emerald-500/30 transition-all">
                         <img src={album.images[0]?.url} className="w-10 h-10 object-cover" alt="" />
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{album.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{album.album_type} • {album.total_tracks} tracks • {album.release_date}</div>
                         </div>
                         <div className="text-brand-accent text-[9px] font-black uppercase tracking-widest">Import Album</div>
                     </div>
                 ))}
                 {mbResults.map(group => (
                     <div key={group.id} onClick={() => importMBRelease(group)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{group.title}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{group['primary-type']} • {group['first-release-date']}</div>
                         </div>
                         <div className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">MB Import</div>
                     </div>
                 ))}
             </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">作品名稱</label><input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required /></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">版本標記</label><input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.versionLabel} onChange={handleChange} placeholder="e.g. Acoustic, Remix" /></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">語系</label><select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.language} onChange={handleChange}>{Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">日期</label><input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} /></div>
             <div className="space-y-2">
                <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest block mb-2">官網獨家</label>
                <input type="checkbox" name="isOfficialExclusive" checked={formData.isOfficialExclusive} onChange={handleChange} className="w-4 h-4 accent-brand-gold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block mb-2">互動模式</label>
                <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="w-4 h-4 accent-emerald-500" />
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">發行公司 (Label)</label><input name="releaseCompany" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseCompany} onChange={handleChange} /></div>
            <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ISRC</label><input name="isrc" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.isrc} onChange={handleChange} /></div>
            <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">UPC</label><input name="upc" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.upc} onChange={handleChange} /></div>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">製作團隊資訊</label><textarea name="credits" className="w-full h-32 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.credits} onChange={handleChange} placeholder="從 Spotify 自動帶入或手動輸入..." /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">音檔來源網址</label>
                <input name="audioUrl" className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs focus:border-brand-accent outline-none font-mono" value={formData.audioUrl} onChange={handleChange} placeholder="貼上直連音檔連結 (Dropbox ?raw=1)" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">備用音源 / 自定義連結</label>
                <input name="customAudioLink" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.customAudioLink} onChange={handleChange} placeholder="任何您想附加的外部連結" />
            </div>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">影音資源連結</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="coverUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.coverUrl} onChange={handleChange} placeholder="封面圖片網址 (Cover URL)" />
                <input name="spotifyId" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.spotifyId} onChange={handleChange} placeholder="Spotify Track ID" />
                <input name="youtubeUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeUrl} onChange={handleChange} placeholder="YouTube URL" />
                <input name="cloudVideoUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.cloudVideoUrl} onChange={handleChange} placeholder="Cloud Video URL (4K Vault)" />
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/database')} className="px-8 py-3 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">取消</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? '儲存中...' : '儲存作品'}</button>
        </div>
      </form>
    </div>
  );
};

export default AddSong;
