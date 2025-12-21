import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbum, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup, MBTrack, MBImportData } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// SMART LINK CONVERTER
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        if (url.includes('dropbox.com')) {
            return url.replace('dl=0', 'raw=1');
        }
        return url;
    } catch (e) { return url; }
};

const DEFAULT_CREDITS = `Main Artist : Willwi 陳威兒
Composer : Tsung Yu Chen
Lyricist : Tsung Yu Chen
Arranger : Willwi
Producer : Will Chen
Recording | Mixing | Mastering : Will Chen
Studio : Willwi Studio, Taipei
Label : Willwi Music`;

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'single' | 'album' | 'mb' | 'youtube'>('youtube'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  
  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [selectedMBGroup, setSelectedMBGroup] = useState<MBReleaseGroup | null>(null);
  const [mbImportData, setMbImportData] = useState<MBImportData | null>(null);
  const [mbCoverUrl, setMbCoverUrl] = useState<string>('');

  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music', // Default Fixed
    publisher: 'Willwi Music', // Default Fixed
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    isInteractiveActive: false,
    coverUrl: '', 
    coverOverlayText: '',
    lyrics: '',
    description: '',
    credits: DEFAULT_CREDITS, // Default Fixed
    spotifyLink: '',
    appleMusicLink: '',
    youtubeMusicUrl: '',
    musixmatchUrl: '', 
    smartLink: '', 
    musicBrainzId: '',
    audioUrl: '',
    youtubeUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '8520') { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const playPreview = (url: string | null | undefined, id: string) => {
      if (!url) return;
      if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
          if (playingPreviewId === id) {
              setPlayingPreviewId(null);
              return;
          }
      }
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      setPlayingPreviewId(id);
      audio.play().catch(e => console.error("Preview play failed", e));
      audio.onended = () => setPlayingPreviewId(null);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('form_title_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">請輸入存取密碼以新增作品。</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input type="password" placeholder="Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      let finalValue = value;
      if (name === 'audioUrl') {
          finalValue = convertToDirectStream(value);
      }
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const detectLanguage = (text: string): Language => {
      if (/[\u3040-\u30ff]/.test(text)) return Language.Japanese;
      if (/[\uac00-\ud7af]/.test(text)) return Language.Korean;
      if (/[\u4e00-\u9fa5]/.test(text)) return Language.Mandarin;
      return Language.English;
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeImport = async () => {
      const id = extractYoutubeId(searchQuery);
      if (!id) {
          setSearchError('Invalid YouTube URL format.');
          return;
      }
      setIsSearching(true);
      setSearchError('');
      try {
          const thumbnailUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
          let title = '';
          try {
             const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
             const data = await res.json();
             if (data.title) title = data.title;
          } catch (e) { console.log('oEmbed failed'); }

          let updates: Partial<Song> = {
              title: title || formData.title,
              youtubeUrl: searchQuery,
              coverUrl: thumbnailUrl,
              projectType: ProjectType.Indie,
          };

          if (title) {
              try {
                  const spotifyResults = await searchSpotifyTracks(`${title} artist:Willwi`);
                  if (spotifyResults.length > 0) {
                      const match = spotifyResults[0];
                      const albumDetails = await getSpotifyAlbum(match.album.id);
                      let cat = ReleaseCategory.Single;
                      if (albumDetails) {
                          if (albumDetails.album_type === 'album') cat = ReleaseCategory.Album;
                          else if (albumDetails.total_tracks > 3) cat = ReleaseCategory.EP;
                      }
                      const lang = detectLanguage(match.name);
                      updates = {
                          ...updates,
                          isrc: match.external_ids?.isrc || '',
                          spotifyLink: match.external_urls?.spotify || '',
                          spotifyId: match.id,
                          upc: albumDetails?.external_ids?.upc || albumDetails?.external_ids?.ean || '',
                          releaseCompany: albumDetails?.label || albumDetails?.copyrights?.[0]?.text || 'Willwi Music',
                          publisher: albumDetails?.copyrights?.find(c => c.type === 'C')?.text || 'Willwi Music', 
                          releaseDate: albumDetails?.release_date || match.album.release_date,
                          releaseCategory: cat,
                          language: lang
                      };
                      alert(`YouTube Import Success!\n\nAuto-matched with Spotify Metadata.`);
                  } else {
                      alert("YouTube Import Success! (No matching Spotify metadata found)");
                  }
              } catch (err) {
                  console.error("Smart Fill Error", err);
                  alert("YouTube Import Success! (Metadata sync skipped)");
              }
          }
          setFormData(prev => ({ ...prev, ...updates }));
      } catch (e) {
          setSearchError('Import failed.');
      } finally {
          setIsSearching(false);
      }
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setMbResults([]); setSelectedMBGroup(null);
    setSearchError('');
    if (importMode === 'youtube') {
        handleYoutubeImport();
        return;
    }
    setIsSearching(true);
    try {
        if (importMode === 'mb') {
            const results = await getWillwiReleases();
            if (results.length === 0) setSearchError('No releases found on MusicBrainz.');
            setMbResults(results);
        } else {
            if (!searchQuery.trim()) return;
            const query = searchQuery.includes('Willwi') ? searchQuery : `${searchQuery} artist:Willwi`;
            if (importMode === 'single') {
                let results = await searchSpotifyTracks(query);
                if (results.length === 0) setSearchError('No results found.');
                setTrackResults(results);
            } else {
                let results = await searchSpotifyAlbums(query);
                if (results.length === 0) setSearchError('No albums found.');
                setAlbumResults(results);
            }
        }
    } catch (err) { setSearchError('Search connection failed.'); } 
    finally { setIsSearching(false); }
  };

  const selectTrackForForm = async (track: SpotifyTrack) => {
    const albumDetails = await getSpotifyAlbum(track.album.id);
    let cat = ReleaseCategory.Single;
    let label = 'Willwi Music';
    let publisher = 'Willwi Music';
    let upc = '';

    if (albumDetails) {
         if (albumDetails.album_type === 'album') cat = ReleaseCategory.Album;
         else if (albumDetails.total_tracks > 3) cat = ReleaseCategory.EP;
         label = albumDetails.label || label;
         publisher = albumDetails.copyrights?.find(c => c.type === 'C')?.text || publisher;
         upc = albumDetails.external_ids?.upc || albumDetails.external_ids?.ean || '';
    }

    setFormData(prev => ({
        ...prev,
        title: track.name,
        releaseDate: track.album.release_date,
        coverUrl: track.album.images[0]?.url || '',
        isrc: track.external_ids.isrc || '',
        upc: upc || track.album.external_ids?.upc || '',
        spotifyId: track.id,
        spotifyLink: track.external_urls.spotify,
        releaseCategory: cat,
        releaseCompany: label,
        publisher: publisher,
        language: detectLanguage(track.name),
        audioUrl: track.preview_url || prev.audioUrl
    }));
    setTrackResults([]);
  };
  
  const selectAlbumForForm = async (album: SpotifyAlbum) => {
      const details = await getSpotifyAlbum(album.id);
      setFormData(prev => ({
        ...prev,
        releaseDate: album.release_date,
        coverUrl: album.images[0]?.url || '',
        releaseCategory: ReleaseCategory.Album,
        releaseCompany: details?.label || 'Willwi Music',
        publisher: details?.copyrights?.find(c => c.type === 'C')?.text || 'Willwi Music',
        upc: details?.external_ids?.upc || details?.external_ids?.ean || ''
      }));
      setAlbumResults([]);
      alert("Album metadata loaded. Please enter track details manually.");
  };

  const handleSelectMBGroup = async (group: MBReleaseGroup) => {
      setSelectedMBGroup(group);
      setMbImportData(null);
      const cover = await getCoverArtUrl(group.id);
      setMbCoverUrl(cover || '');
      const details = await getReleaseGroupDetails(group.id, group['primary-type']);
      setMbImportData(details);
  };

  const handleSelectMBTrack = (track: MBTrack) => {
      if (!selectedMBGroup || !mbImportData) return;
      setFormData(prev => ({
          ...prev,
          title: track.title,
          releaseDate: mbImportData.releaseDate,
          coverUrl: mbCoverUrl,
          releaseCategory: mbImportData.category,
          releaseCompany: mbImportData.releaseCompany,
          musicBrainzId: track.id,
          language: detectLanguage(track.title)
      }));
      setMbResults([]);
      setSelectedMBGroup(null);
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
      coverOverlayText: formData.coverOverlayText || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseCompany: formData.releaseCompany || '',
      publisher: formData.publisher || '', // Save Publisher
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      isrc: formData.isrc,
      upc: formData.upc,
      spotifyId: formData.spotifyId,
      youtubeUrl: formData.youtubeUrl,
      musixmatchUrl: formData.musixmatchUrl || '', // Save Musixmatch
      youtubeMusicUrl: formData.youtubeMusicUrl,
      spotifyLink: formData.spotifyLink,
      appleMusicLink: formData.appleMusicLink,
      smartLink: formData.smartLink,
      audioUrl: formData.audioUrl,
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('form_title_add')}</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('youtube')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'youtube' ? 'bg-[#FF0000] text-white shadow' : 'text-slate-500 hover:text-white'}`}>YouTube</button>
              <button onClick={() => setImportMode('single')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'single' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>Spotify</button>
              <button onClick={() => setImportMode('album')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'album' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>Album</button>
              <button onClick={() => setImportMode('mb')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'mb' ? 'bg-brand-gold text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>MusicBrainz</button>
          </div>
      </div>

      <div className="bg-slate-900 p-6 rounded border border-white/5 mb-8">
        <div className="flex gap-4">
            {importMode !== 'mb' && (
                <input 
                    className="flex-1 bg-black border border-white/10 px-4 py-3 text-white text-xs outline-none focus:border-white/30 font-mono" 
                    placeholder={importMode === 'youtube' ? "Paste YouTube Video Link here (for Auto-Import)..." : "Search Spotify..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            )}
            <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                {isSearching ? 'Processing...' : importMode === 'mb' ? 'Scan Releases' : (importMode === 'youtube' ? 'Smart Import' : 'Search')}
            </button>
        </div>
        
        {searchError && <p className="text-red-500 text-xs mt-3">{searchError}</p>}
        {importMode === 'youtube' && !isSearching && !formData.coverUrl && (
             <p className="text-[9px] text-slate-500 mt-3 pl-1">* 智慧匯入功能：貼上 YouTube 連結後，系統將自動比對 Spotify 數據庫，嘗試補全 ISRC、UPC、廠牌與發行日期。</p>
        )}

        {/* RESULTS AREA */}
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {trackResults.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-white/5 border border-transparent hover:border-white/10 group">
                    <img src={t.album.images[2]?.url} className="w-8 h-8 cursor-pointer" onClick={() => selectTrackForForm(t)} alt="" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => selectTrackForForm(t)}>
                        <div className="text-white text-xs font-bold truncate">{t.name}</div>
                        <div className="text-slate-500 text-[10px] truncate">{t.album.name}</div>
                    </div>
                    {t.preview_url && (
                        <button onClick={() => playPreview(t.preview_url, t.id)} className={`w-6 h-6 flex items-center justify-center rounded-full border border-white/20 ${playingPreviewId === t.id ? 'bg-brand-gold text-black animate-pulse' : 'text-white hover:bg-white/20'}`}>
                            {playingPreviewId === t.id ? '■' : '▶'}
                        </button>
                    )}
                    <button onClick={() => selectTrackForForm(t)} className="text-[9px] bg-brand-accent/10 text-brand-accent border border-brand-accent/50 px-3 py-1 hover:bg-brand-accent hover:text-black transition-all font-bold">IMPORT</button>
                </div>
            ))}
            {albumResults.map(a => (
                <div key={a.id} onClick={() => selectAlbumForForm(a)} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10">
                    <img src={a.images[2]?.url} className="w-8 h-8" alt="" />
                    <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-bold truncate">{a.name}</div>
                        <div className="text-slate-500 text-[10px] truncate">{a.release_date}</div>
                    </div>
                    <span className="text-[9px] text-brand-accent border border-brand-accent/50 px-2 py-0.5">USE METADATA</span>
                </div>
            ))}
            {mbResults.map(g => (
                <div key={g.id} onClick={() => handleSelectMBGroup(g)} className={`p-3 border border-white/5 cursor-pointer transition-all ${selectedMBGroup?.id === g.id ? 'bg-brand-gold/10 border-brand-gold' : 'hover:bg-white/5'}`}>
                    <div className="text-white text-xs font-bold">{g.title}</div>
                    <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-slate-500 bg-black px-1 border border-white/10">{g['primary-type'] || 'Unknown'}</span>
                        <span className="text-[9px] text-slate-500">{g['first-release-date']}</span>
                    </div>
                </div>
            ))}
        </div>
        {selectedMBGroup && mbImportData && (
            <div className="mt-4 pt-4 border-t border-white/10">
                 <h4 className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-3">Select Track from {selectedMBGroup.title}</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                     {mbImportData.tracks.map(t => (
                         <div key={t.id} onClick={() => handleSelectMBTrack(t)} className="p-2 bg-black border border-white/10 hover:border-white text-xs text-slate-300 hover:text-white cursor-pointer truncate">
                             {t.position}. {t.title}
                         </div>
                     ))}
                 </div>
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_title')}</label>
                 <input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required />
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Version Label</label>
                 <input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.versionLabel} onChange={handleChange} placeholder="e.g. Acoustic, Remix" />
             </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_lang')}</label>
                 <select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.language} onChange={handleChange}>
                     {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Project Type</label>
                 <select name="projectType" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.projectType} onChange={handleChange}>
                     {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Release Category</label>
                 <select name="releaseCategory" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.releaseCategory} onChange={handleChange}>
                     {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
             </div>
             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Date</label>
                 <input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} />
             </div>
        </div>

        <div className="space-y-2">
             <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Cover Image URL</label>
             <div className="flex gap-4">
                 <input name="coverUrl" className="flex-1 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.coverUrl} onChange={handleChange} placeholder="https://..." />
                 {formData.coverUrl && <img src={formData.coverUrl} className="w-10 h-10 object-cover border border-white/20" alt="" />}
             </div>
        </div>
        
        {/* PLATFORM LINKS SECTION - EXPANDED */}
        <div className="space-y-2">
             <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">
                 Platform Links (Streaming & Sales)
             </label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="youtubeUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeUrl} onChange={handleChange} placeholder="YouTube Video URL" />
                <input name="spotifyLink" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.spotifyLink} onChange={handleChange} placeholder="Spotify Track/Album URL" />
                
                <input name="appleMusicLink" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.appleMusicLink} onChange={handleChange} placeholder="Apple Music URL" />
                <input name="youtubeMusicUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeMusicUrl} onChange={handleChange} placeholder="YouTube Music URL" />
                
                {/* NEW: MUSIXMATCH */}
                <input name="musixmatchUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.musixmatchUrl} onChange={handleChange} placeholder="Musixmatch URL" />

                <div className="md:col-span-2">
                    <input name="smartLink" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-gold outline-none font-mono" value={formData.smartLink} onChange={handleChange} placeholder="Smart Link / Universal Link (e.g., Linkfire, Linktree, Fanlink)" />
                </div>
             </div>
        </div>

        <div className="space-y-2">
             <label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">
                 Raw Audio Source (Private - For Generation)
             </label>
             <div className="space-y-2">
                 <input 
                    name="audioUrl" 
                    className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs focus:border-brand-accent outline-none font-mono placeholder-slate-600" 
                    value={formData.audioUrl} 
                    onChange={handleChange} 
                    placeholder="Paste Google Drive or Dropbox Share Link here..." 
                 />
                 {formData.audioUrl && (
                    <div className="bg-black/50 p-2 border border-white/10 flex items-center gap-2">
                        <span className="text-[9px] text-brand-accent font-bold uppercase tracking-widest">Verify Source:</span>
                        <audio controls src={formData.audioUrl} className="h-6 w-full max-w-[200px]" style={{borderRadius: 0}} />
                    </div>
                 )}
             </div>
        </div>
        
        <div className="space-y-2">
             <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Metadata</label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input name="isrc" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.isrc} onChange={handleChange} placeholder="ISRC" />
                <input name="upc" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.upc} onChange={handleChange} placeholder="UPC" />
                <input name="releaseCompany" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseCompany} onChange={handleChange} placeholder="Label / Company" />
                <input name="publisher" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.publisher} onChange={handleChange} placeholder="Publisher (詞曲版權)" />
                
                <div className="col-span-2 flex flex-col gap-2">
                    <div className="flex items-center px-4 bg-slate-900 border border-white/10 h-[42px]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isEditorPick" checked={formData.isEditorPick} onChange={handleChange} />
                            <span className="text-[10px] text-white font-bold uppercase">Editor Pick</span>
                        </label>
                    </div>
                    <div className="flex items-center px-4 bg-slate-900 border border-white/10 h-[42px]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} />
                            <span className="text-[10px] text-brand-gold font-bold uppercase">Interactive ON</span>
                        </label>
                    </div>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_lyrics')}</label>
                 <textarea name="lyrics" className="w-full h-40 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono leading-relaxed" value={formData.lyrics} onChange={handleChange} placeholder="Paste lyrics here..." />
            </div>
            <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Credits & Description</label>
                 <textarea name="description" className="w-full h-20 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none mb-4" value={formData.description} onChange={handleChange} placeholder="Story behind the song..." />
                 <textarea name="credits" className="w-full h-16 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.credits} onChange={handleChange} placeholder="Producer, Arranger, Mixing..." />
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/database')} className="px-8 py-3 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('form_btn_cancel')}</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-brand-accent/20">
                {isSaving ? t('form_btn_saving') : t('form_btn_save')}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddSong;