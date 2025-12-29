
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup, MBTrack, MBImportData } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

// ROBUST LINK CONVERTER
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        
        // Dropbox
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        // Google Drive
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
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
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify-search' | 'mb'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  
  // Album Batch Import State
  const [selectedAlbumForBatch, setSelectedAlbumForBatch] = useState<SpotifyAlbum | null>(null);
  const [batchTracks, setBatchTracks] = useState<SpotifyTrack[]>([]);
  const [batchDropboxLink, setBatchDropboxLink] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

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
    releaseCompany: 'Willwi Music', 
    publisher: 'Willwi Music', 
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    isInteractiveActive: false,
    coverUrl: '', 
    coverOverlayText: '',
    lyrics: '',
    description: '',
    credits: DEFAULT_CREDITS, 
    spotifyLink: '',
    appleMusicLink: '',
    youtubeMusicUrl: '',
    musixmatchUrl: '', 
    smartLink: '', 
    distrokidManageUrl: '',
    musicBrainzId: '',
    audioUrl: '',
    youtubeUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
      if (passwordInput === correctPwd) { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const playPreview = (url: string | null | undefined, id: string) => {
      if (!url) return;
      
      if (playingPreviewId === id) {
          audioPreviewRef.current?.pause();
          setPlayingPreviewId(null);
          return;
      }

      if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
      }

      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      setPlayingPreviewId(id);
      audio.play().catch(e => {
          console.error("Preview play failed", e);
          setPlayingPreviewId(null);
      });
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
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const detectLanguage = (text: string): Language => {
      if (/[\u3040-\u30ff]/.test(text)) return Language.Japanese;
      if (/[\uac00-\ud7af]/.test(text)) return Language.Korean;
      if (/[\u4e00-\u9fa5]/.test(text)) return Language.Mandarin;
      return Language.English;
  };

  const handleSmartLinkImport = async () => {
      if (!searchQuery.trim()) {
          setSearchError('Please enter a URL (HyperFollow, Spotify, YouTube...)');
          return;
      }
      
      setIsSearching(true);
      setSearchError('');
      setProgressMsg('AI Analyzing Link...');
      setTrackResults([]);
      setAlbumResults([]);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const bridgeResponse = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this music link: "${searchQuery}"
              Goal: Find the official **Spotify Album URL** (or Track URL) for this release.
              Steps:
              1. Identify Artist Name and Album/Track Title from the link or by searching.
              2. Search Google/Spotify to find the actual Spotify Link.
              3. If it's a DistroKid/HyperFollow link, find where it redirects or what it represents.
              
              Return JSON:
              {
                  "spotifyUrl": string | null,
                  "artist": string,
                  "title": string,
                  "type": "album" | "track" | "unknown"
              }`,
              config: {
                  tools: [{ googleSearch: {} }],
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          spotifyUrl: { type: Type.STRING },
                          artist: { type: Type.STRING },
                          title: { type: Type.STRING },
                          type: { type: Type.STRING }
                      }
                  }
              }
          });
          
          const bridgeData = JSON.parse(bridgeResponse.text);

          if (bridgeData.spotifyUrl && bridgeData.spotifyUrl.includes('open.spotify.com')) {
               setProgressMsg('Fetching Metadata from Spotify...');
               const url = bridgeData.spotifyUrl;
               const type = url.includes('album') ? 'album' : 'track';
               const id = url.split(`/${type}/`)[1]?.split('?')[0];
               
               if (type === 'album' && id) {
                   const album = await getSpotifyAlbum(id);
                   if (album) {
                       setAlbumResults([album]); 
                       setSearchError(`✓ Found Album: ${album.name}`);
                   } else throw new Error("Spotify Album ID found but fetch failed.");
               } else if (type === 'track' && id) {
                   const tracks = await searchSpotifyTracks(`track:${bridgeData.title} artist:${bridgeData.artist}`);
                   if (tracks.length > 0) {
                       setTrackResults(tracks);
                       setSearchError(`✓ Found Track: ${tracks[0].name}`);
                   } else throw new Error("Spotify Track fetch failed.");
               }
          } else {
               setProgressMsg('Spotify Link not found, searching by name...');
               if (bridgeData.artist && bridgeData.title) {
                   const query = `${bridgeData.title} artist:${bridgeData.artist}`;
                   const albums = await searchSpotifyAlbums(query);
                   if (albums.length > 0) {
                        setAlbumResults(albums);
                        setSearchError('Found similar albums on Spotify.');
                   } else {
                       const tracks = await searchSpotifyTracks(query);
                       if (tracks.length > 0) {
                           setTrackResults(tracks);
                           setSearchError('Found similar tracks on Spotify.');
                       } else setSearchError('Could not find this release on Spotify database.');
                   }
               } else setSearchError('AI could not identify the music from this link.');
          }
      } catch (e) {
          setSearchError("Import failed. Please try manual search.");
      } finally {
          setIsSearching(false);
          setProgressMsg('');
      }
  };

  const fetchLyricsWithAI = async (artist: string, title: string): Promise<string> => {
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Find the lyrics for the song "${title}" by "${artist}". 
              If the song is instrumental, return "[Instrumental]".
              Return ONLY the lyrics text, no extra conversation.`,
          });
          return response.text.trim();
      } catch (e) { return ''; }
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setMbResults([]); setSelectedMBGroup(null);
    setSearchError('');
    setSelectedAlbumForBatch(null);
    
    if (importMode === 'smart') {
        handleSmartLinkImport();
        return;
    }

    setIsSearching(true);
    try {
        if (importMode === 'mb') {
            const results = await getWillwiReleases();
            if (results.length === 0) setSearchError('No releases found on MusicBrainz.');
            setMbResults(results);
        } else if (importMode === 'spotify-search') {
            if (!searchQuery.trim()) return;
            const query = searchQuery.includes('Willwi') ? searchQuery : `${searchQuery} artist:Willwi`;
            let results = await searchSpotifyTracks(query);
            if (results.length > 0) setTrackResults(results);
            let albums = await searchSpotifyAlbums(query);
            if (albums.length > 0) setAlbumResults(albums);
            if(results.length === 0 && albums.length === 0) setSearchError('No results found.');
        }
    } catch (err) { setSearchError('Search connection failed.'); } 
    finally { setIsSearching(false); }
  };

  const selectTrackForForm = async (track: SpotifyTrack) => {
    setIsSearching(true);
    setProgressMsg('Fetching Details & Lyrics...');
    try {
        const albumDetails = await getSpotifyAlbum(track.album.id);
        let cat = ReleaseCategory.Single;
        let label = 'Willwi Music';
        let upc = '';
        if (albumDetails) {
             if (albumDetails.album_type === 'album') cat = ReleaseCategory.Album;
             else if (albumDetails.total_tracks > 3) cat = ReleaseCategory.EP;
             label = albumDetails.label || label;
             upc = albumDetails.external_ids?.upc || albumDetails.external_ids?.ean || '';
        }
        const fetchedLyrics = await fetchLyricsWithAI('Willwi', track.name);
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
            language: detectLanguage(track.name),
            audioUrl: track.preview_url || prev.audioUrl,
            lyrics: fetchedLyrics,
            smartLink: searchQuery.includes('http') ? searchQuery : ''
        }));
        setTrackResults([]);
        setAlbumResults([]);
        setSearchError('✓ Data Loaded');
    } catch(e) { setSearchError('Error loading details.'); } 
    finally { setIsSearching(false); setProgressMsg(''); }
  };
  
  const openBatchImportPanel = async (album: SpotifyAlbum) => {
      setIsSearching(true);
      setProgressMsg('Loading Album Tracks...');
      try {
          const tracks = await getSpotifyAlbumTracks(album.id);
          setBatchTracks(tracks);
          setSelectedAlbumForBatch(album);
          setBatchDropboxLink('');
      } catch (e) { setSearchError("Failed to load album tracks."); } 
      finally { setIsSearching(false); setProgressMsg(''); }
  };

  const confirmBatchImport = async () => {
      if (!selectedAlbumForBatch || batchTracks.length === 0) return;
      setIsProcessingBatch(true);
      try {
          const details = await getSpotifyAlbum(selectedAlbumForBatch.id);
          const releaseCompany = details?.label || 'Willwi Music';
          const upc = details?.external_ids?.upc || details?.external_ids?.ean || '';
          const releaseDate = details?.release_date || selectedAlbumForBatch.release_date;
          const coverUrl = selectedAlbumForBatch.images[0]?.url || '';
          let category = ReleaseCategory.Album;
          if (details?.album_type === 'single') category = ReleaseCategory.Single;
          else if (details && details.total_tracks <= 6) category = ReleaseCategory.EP;

          const newSongs: Song[] = batchTracks.map((t, idx) => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + idx,
                title: t.name,
                versionLabel: '',
                coverUrl: coverUrl,
                language: detectLanguage(t.name),
                projectType: ProjectType.Indie,
                releaseCategory: category,
                releaseCompany: releaseCompany,
                publisher: 'Willwi Music',
                releaseDate: releaseDate,
                isEditorPick: false,
                isInteractiveActive: false,
                isrc: t.external_ids?.isrc || '',
                upc: upc,
                spotifyId: t.id,
                spotifyLink: t.external_urls?.spotify || '',
                credits: DEFAULT_CREDITS,
                description: `Included in ${selectedAlbumForBatch.name}\n\n[ADMIN NOTE]\nSource Folder: ${batchDropboxLink || 'N/A'}`,
                lyrics: '', 
                audioUrl: batchDropboxLink ? batchDropboxLink : '',
                smartLink: searchQuery.includes('http') ? searchQuery : ''
          }));

          if (await bulkAddSongs(newSongs)) {
              alert(`成功匯入整張專輯！\n共 ${newSongs.length} 首歌曲已建立。`);
              navigate('/database');
          } else throw new Error("Database Write Error");
      } catch(e) { alert("批次匯入失敗。"); } 
      finally { setIsProcessingBatch(false); }
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
          publisher: 'Willwi Music',
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
      publisher: formData.publisher || 'Willwi Music',
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      isrc: formData.isrc,
      upc: formData.upc,
      spotifyId: formData.spotifyId,
      youtubeUrl: formData.youtubeUrl,
      musixmatchUrl: formData.musixmatchUrl || '',
      youtubeMusicUrl: formData.youtubeMusicUrl,
      spotifyLink: formData.spotifyLink,
      appleMusicLink: formData.appleMusicLink,
      smartLink: formData.smartLink,
      distrokidManageUrl: formData.distrokidManageUrl,
      audioUrl: convertToDirectStream(formData.audioUrl || ''),
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits,
      musicBrainzId: formData.musicBrainzId
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <style>{`
        @keyframes playing-wave {
          0% { height: 4px; }
          50% { height: 16px; }
          100% { height: 4px; }
        }
        .playing-bar {
          width: 3px;
          background-color: #fbbf24;
          animation: playing-wave 0.8s ease-in-out infinite;
        }
        .playing-bar:nth-child(2) { animation-delay: 0.2s; }
        .playing-bar:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('form_title_add')}</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700 overflow-x-auto max-w-full">
              <button onClick={() => setImportMode('smart')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${importMode === 'smart' ? 'bg-white text-black shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_smart')}</button>
              <button onClick={() => setImportMode('spotify-search')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${importMode === 'spotify-search' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_spotify')}</button>
              <button onClick={() => setImportMode('mb')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${importMode === 'mb' ? 'bg-brand-gold text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_mb')}</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${importMode === 'manual' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_manual')}</button>
          </div>
      </div>

      <div className="bg-slate-900 p-6 rounded border border-white/5 mb-8">
        <div className="flex gap-4">
            {importMode !== 'mb' && importMode !== 'manual' && (
                <input className="flex-1 bg-black border border-white/10 px-4 py-3 text-white text-xs outline-none focus:border-white/30 font-mono" placeholder={importMode === 'smart' ? "Paste HyperFollow / Spotify / YouTube Link..." : "Search by Title or Artist..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            )}
            {importMode !== 'manual' && (
                <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all whitespace-nowrap">{isSearching ? t('btn_processing') : t('btn_search')}</button>
            )}
        </div>
        
        {progressMsg && <p className="text-brand-accent text-xs mt-3 animate-pulse">{progressMsg}</p>}
        {searchError && <p className="text-white text-xs mt-3">{searchError}</p>}
        
        {selectedAlbumForBatch && (
            <div className="mt-6 p-6 bg-black border border-brand-accent/30 rounded relative animate-fade-in">
                <button onClick={() => setSelectedAlbumForBatch(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <div className="flex gap-4 mb-6">
                    <img src={selectedAlbumForBatch.images[1]?.url} className="w-24 h-24 object-cover shadow-lg" alt="" />
                    <div><h4 className="text-xl font-black text-white">{selectedAlbumForBatch.name}</h4><p className="text-sm text-brand-accent">{selectedAlbumForBatch.total_tracks} Tracks • {selectedAlbumForBatch.release_date}</p></div>
                </div>
                <div className="mb-6 max-h-40 overflow-y-auto border border-white/10">
                    <table className="w-full text-left text-[10px]"><thead className="bg-slate-900 text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Title</th><th className="p-2">ISRC</th></tr></thead><tbody className="divide-y divide-white/5 text-slate-300">{batchTracks.map((t, i) => (<tr key={t.id}><td className="p-2">{i + 1}</td><td className="p-2 font-bold">{t.name}</td><td className="p-2 font-mono">{t.external_ids?.isrc || '--'}</td></tr>))}</tbody></table>
                </div>
                <div className="space-y-2 mb-6">
                    <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Global Audio Source (Dropbox Folder Link)</label>
                    <input className="w-full bg-slate-900 border border-brand-gold/30 p-3 text-white text-xs font-mono outline-none focus:border-brand-gold" placeholder="e.g. https://www.dropbox.com/sh/..." value={batchDropboxLink} onChange={(e) => setBatchDropboxLink(e.target.value)} />
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={() => setSelectedAlbumForBatch(null)} className="px-6 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest">Cancel</button>
                    <button onClick={confirmBatchImport} disabled={isProcessingBatch} className="px-8 py-3 bg-brand-accent text-black font-black text-xs uppercase tracking-widest hover:bg-white transition-all">{isProcessingBatch ? "Importing..." : `Confirm Import (${batchTracks.length} Tracks)`}</button>
                </div>
            </div>
        )}

        {!selectedAlbumForBatch && (
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {trackResults.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-3 hover:bg-white/5 border border-white/5 rounded transition-all group">
                        <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => selectTrackForForm(t)}>
                            <img src={t.album.images[2]?.url} className="w-full h-full object-cover rounded shadow" alt="" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="text-white text-sm font-black truncate">{t.name}</div>
                                {playingPreviewId === t.id && (
                                    <div className="flex gap-0.5 items-end h-4">
                                        <div className="playing-bar"></div><div className="playing-bar"></div><div className="playing-bar"></div>
                                    </div>
                                )}
                            </div>
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider truncate">{t.album.name}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            {t.preview_url && (
                                <button 
                                    onClick={() => playPreview(t.preview_url, t.id)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${playingPreviewId === t.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-slate-800 text-white border-white/10 hover:bg-slate-700'}`}
                                >
                                    {playingPreviewId === t.id ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    ) : (
                                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    )}
                                </button>
                            )}
                            <button onClick={() => selectTrackForForm(t)} className="px-4 py-2 bg-brand-accent text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all rounded-sm shadow-lg">Import</button>
                        </div>
                    </div>
                ))}
                
                {albumResults.map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-3 hover:bg-white/5 border border-white/5 rounded transition-all group">
                        <img src={a.images[2]?.url} className="w-12 h-12 rounded flex-shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-black truncate">{a.name}</div>
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider truncate">{a.release_date} • {a.total_tracks} Tracks</div>
                        </div>
                        <button onClick={() => openBatchImportPanel(a)} className="px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/40 font-black text-[10px] uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all rounded-sm">Batch Import</button>
                    </div>
                ))}

                {mbResults.map(g => (
                    <div key={g.id} onClick={() => handleSelectMBGroup(g)} className={`p-4 border rounded transition-all cursor-pointer ${selectedMBGroup?.id === g.id ? 'bg-brand-gold/10 border-brand-gold' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                        <div className="text-white text-xs font-bold">{g.title}</div>
                        <div className="flex gap-2 mt-1"><span className="text-[9px] text-slate-500 bg-black px-1 border border-white/10 uppercase">{g['primary-type'] || 'Unknown'}</span><span className="text-[9px] text-slate-500 font-mono">{g['first-release-date']}</span></div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_title')}</label><input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required /></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_version')}</label><input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.versionLabel} onChange={handleChange} placeholder="e.g. Acoustic, Remix" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_lang')}</label><select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.language} onChange={handleChange}>{Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_project')}</label><select name="projectType" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.projectType} onChange={handleChange}>{Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_category')}</label><select name="releaseCategory" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.releaseCategory} onChange={handleChange}>{Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_date')}</label><input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} /></div>
        </div>
        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_cover')}</label><div className="flex gap-4"><input name="coverUrl" className="flex-1 bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.coverUrl} onChange={handleChange} placeholder="https://..." />{formData.coverUrl && <img src={formData.coverUrl} className="w-10 h-10 object-cover border border-white/20" alt="" />}</div></div>
        <div className="space-y-2"><label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">{t('form_label_links')}</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input name="youtubeUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeUrl} onChange={handleChange} placeholder="YouTube Video URL" /><input name="spotifyLink" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.spotifyLink} onChange={handleChange} placeholder="Spotify Track/Album URL" /><input name="appleMusicLink" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.appleMusicLink} onChange={handleChange} placeholder="Apple Music URL" /><input name="youtubeMusicUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeMusicUrl} onChange={handleChange} placeholder="YouTube Music URL" /><div className="md:col-span-2 space-y-4"><input name="smartLink" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-gold outline-none font-mono" value={formData.smartLink} onChange={handleChange} placeholder="Smart Link / HyperFollow" /><input name="musixmatchUrl" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.musixmatchUrl} onChange={handleChange} placeholder="Musixmatch Lyrics URL" /></div></div></div>
        <div className="space-y-2"><label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">{t('form_label_audio')}</label><div className="space-y-2"><input name="audioUrl" className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs focus:border-brand-accent outline-none font-mono" value={formData.audioUrl} onChange={handleChange} placeholder={t('form_placeholder_audio')} />{formData.audioUrl && (<div className="bg-black/50 p-2 border border-white/10 flex items-center gap-2"><span className="text-[9px] text-brand-accent font-bold uppercase tracking-widest">Verify Source:</span><audio controls src={convertToDirectStream(formData.audioUrl)} className="h-6 w-full max-w-[200px]" style={{borderRadius: 0}} /></div>)}</div></div>
        <div className="pt-6 border-t border-white/10 flex justify-end gap-4"><button type="button" onClick={() => navigate('/database')} className="px-8 py-3 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('form_btn_cancel')}</button><button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? t('form_btn_saving') : t('form_btn_save')}</button></div>
      </form>
    </div>
  );
};

export default AddSong;
