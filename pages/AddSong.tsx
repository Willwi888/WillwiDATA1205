import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, MBReleaseGroup } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// Helper to clean Google Redirect URLs
const cleanGoogleRedirect = (url: string) => {
    try {
        if (url.includes('google.com/url')) {
            const urlObj = new URL(url);
            const q = urlObj.searchParams.get('q');
            if (q) return decodeURIComponent(q);
        }
        return url;
    } catch (e) {
        return url;
    }
};

// Helper to convert Google Drive Sharing Link to Direct Audio Source
const convertDriveLink = (url: string) => {
    try {
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            // Extract ID
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  // --- PASSWORD PROTECTION STATE ---
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Mode: 'single', 'album', 'mb'
  const [importMode, setImportMode] = useState<'single' | 'album' | 'mb'>('single');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]); // New MusicBrainz State
  
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<SpotifyTrack[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  // Single Song Form State
  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single, // Default to Single
    releaseCompany: '',
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    coverUrl: '', 
    lyrics: '',
    description: '',
    credits: '',
    spotifyLink: '', 
    musicBrainzId: '',
    audioUrl: '', // New Field
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // UPDATED: Accept both legacy code and new master key
      if (passwordInput === '8888' || passwordInput === 'eloveg2026') {
          enableAdmin();
          setLoginError('');
      } else {
          setLoginError('Invalid Access Code');
      }
  };

  // 1. RENDER PASSWORD GATE IF NOT ADMIN
  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6">
                       <svg className="w-8 h-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">{t('form_title_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">請輸入存取密碼以新增作品。<br/><span className="text-xs text-slate-500">(Private Action. Please enter access code.)</span></p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input 
                          type="password" 
                          placeholder="Code"
                          className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none focus:border-brand-accent transition-colors"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                       />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">
                           Unlock
                       </button>
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
      
      // Auto-clean Google Image Redirects
      if (name === 'coverUrl') {
        finalValue = cleanGoogleRedirect(value);
      }
      
      // Auto-convert Google Drive Audio Links
      if (name === 'audioUrl') {
         if (value.includes('drive.google.com')) {
             finalValue = convertDriveLink(value);
         }
      }

      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSearch = async () => {
    // For MusicBrainz, we don't need a query input, we just fetch Willwi's data
    if (importMode === 'mb') {
        setIsSearching(true);
        setSearchError('');
        setMbResults([]);
        
        const results = await getWillwiReleases();
        if (results.length === 0) {
            setSearchError('No releases found on MusicBrainz or connection error.');
        }
        setMbResults(results);
        setIsSearching(false);
        return;
    }

    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setTrackResults([]);
    setAlbumResults([]);
    setSelectedAlbum(null);
    setAlbumTracks([]);

    try {
        const query = searchQuery.includes('Willwi') ? searchQuery : `${searchQuery} artist:Willwi`;
        
        if (importMode === 'single') {
            let results = await searchSpotifyTracks(query);
            if (results.length === 0) results = await searchSpotifyTracks(searchQuery); // Fallback
            if (results.length === 0) setSearchError('No results found.');
            setTrackResults(results);
        } else {
            let results = await searchSpotifyAlbums(query);
            if (results.length === 0) results = await searchSpotifyAlbums(searchQuery); // Fallback
            if (results.length === 0) setSearchError('No albums found.');
            setAlbumResults(results);
        }
    } catch (err) {
        console.error(err);
        setSearchError('Spotify connection failed.');
    } finally {
        setIsSearching(false);
    }
  };

  const selectTrackForForm = (track: SpotifyTrack) => {
    const largestImage = track.album.images[0]?.url || '';
    setFormData(prev => ({
        ...prev,
        title: track.name,
        releaseDate: track.album.release_date,
        coverUrl: largestImage,
        isrc: track.external_ids.isrc || '',
        upc: track.album.external_ids?.upc || track.album.external_ids?.ean || '',
        spotifyId: track.id,
        spotifyLink: track.external_urls.spotify,
        versionLabel: track.name.includes('(') ? track.name.split('(')[1].replace(')', '') : '',
        releaseCategory: ReleaseCategory.Single, // Default assumption
        releaseCompany: 'Willwi Music' // Default assumption
    }));
    setTrackResults([]); // Clear results to show form
  };

  const selectMBReleaseForForm = async (release: MBReleaseGroup) => {
      setIsSearching(true);
      // Try to fetch cover art
      const cover = await getCoverArtUrl(release.id);
      
      let category = ReleaseCategory.Single;
      if (release['primary-type'] === 'Album') category = ReleaseCategory.Album;
      if (release['primary-type'] === 'EP') category = ReleaseCategory.EP;

      setFormData(prev => ({
          ...prev,
          title: release.title,
          releaseDate: release['first-release-date'] || '',
          coverUrl: cover || '',
          musicBrainzId: release.id,
          releaseCategory: category,
          description: `Imported from MusicBrainz. Type: ${release['primary-type']}`
      }));
      setIsSearching(false);
      setMbResults([]);
  };

  const selectAlbumForBulk = async (album: SpotifyAlbum) => {
    setSelectedAlbum(album);
    setIsSearching(true);
    const tracks = await getSpotifyAlbumTracks(album.id);
    setAlbumTracks(tracks);
    setIsSearching(false);
  };

  const bulkImport = async () => {
    if (!selectedAlbum || albumTracks.length === 0) return;
    setIsSaving(true);
    setImportStatus('Importing...');

    let count = 0;
    const coverUrl = selectedAlbum.images[0]?.url || '';

    for (const track of albumTracks) {
        const newSong: Song = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            title: track.name,
            versionLabel: track.name.includes('(') ? track.name.split('(')[1].replace(')', '') : '',
            coverUrl: coverUrl,
            language: Language.Mandarin, // Default, user can edit later
            projectType: ProjectType.Indie, // Default
            releaseCategory: selectedAlbum.total_tracks > 6 ? ReleaseCategory.Album : ReleaseCategory.EP,
            releaseCompany: 'Willwi Music',
            releaseDate: selectedAlbum.release_date,
            isEditorPick: false,
            isrc: (track as any).external_ids?.isrc || '', 
            spotifyId: track.id,
            spotifyLink: track.external_urls.spotify,
            description: `From Album: ${selectedAlbum.name}`
        };
        await addSong(newSong);
        count++;
        setImportStatus(`Imported ${count} / ${albumTracks.length}...`);
    }

    setIsSaving(false);
    setImportStatus(`Success! Imported ${count} songs.`);
    setTimeout(() => {
        navigate('/database');
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
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
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isrc: formData.isrc,
      upc: formData.upc,
      spotifyId: formData.spotifyId,
      musicBrainzId: formData.musicBrainzId,
      youtubeUrl: formData.youtubeUrl,
      musixmatchUrl: formData.musixmatchUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      spotifyLink: formData.spotifyLink,
      appleMusicLink: formData.appleMusicLink,
      audioUrl: formData.audioUrl, // SAVE AUDIO URL
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };

    try {
      const success = await addSong(newSong);
      if (success) {
        navigate('/database');
      } else {
        alert(t('msg_save_error'));
      }
    } catch (error) {
      console.error("Save failed", error);
      alert(t('msg_save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-3xl font-bold text-white">{t('form_title_add')}</h2>
          
          {/* Mode Switcher */}
          <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700 shadow-sm">
              <button 
                onClick={() => { setImportMode('single'); setAlbumResults([]); setMbResults([]); setSelectedAlbum(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'single' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  {t('form_mode_single')}
              </button>
              <button 
                onClick={() => { setImportMode('album'); setTrackResults([]); setMbResults([]); setFormData({}); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'album' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  {t('form_mode_album')}
              </button>
               <button 
                onClick={() => { setImportMode('mb'); setTrackResults([]); setAlbumResults([]); setFormData({}); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'mb' ? 'bg-[#eb743b] text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  MusicBrainz
              </button>
          </div>
      </div>

      {/* Import / Search Section */}
      <div className="bg-gradient-to-r from-green-900/50 to-slate-900 p-6 rounded-xl border border-green-700/50 mb-8">
        <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            {importMode === 'single' ? t('form_search_single') : importMode === 'album' ? t('form_search_album') : t('form_search_mb')}
        </h3>
        <div className="flex gap-4">
            {importMode !== 'mb' ? (
                <input 
                    type="text" 
                    placeholder={importMode === 'single' ? "Song Title (e.g. Love Again)" : "Album Name"}
                    className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none placeholder-slate-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            ) : (
                <div className="flex-grow text-slate-300 flex items-center px-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                    <span className="text-slate-500 mr-2">Target Artist:</span>
                    <span className="font-mono text-[#eb743b] font-bold">Willwi (526cc0f8...)</span>
                </div>
            )}
            <button 
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className={`px-6 py-3 font-bold rounded-lg transition-colors disabled:opacity-50 min-w-[150px] ${importMode === 'mb' ? 'bg-[#eb743b] text-white hover:bg-[#d6632b]' : 'bg-green-600 hover:bg-green-500 text-white'}`}
            >
                {isSearching ? '...' : importMode === 'mb' ? 'Fetch Releases' : t('form_search_btn')}
            </button>
        </div>

        {searchError && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
                {searchError}
            </div>
        )}

        {/* --- TRACK RESULTS (Single Mode) --- */}
        {importMode === 'single' && trackResults.length > 0 && (
            <div className="mt-4 grid gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {trackResults.map(track => (
                    <div key={track.id} className="flex items-center gap-4 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer transition-colors" onClick={() => selectTrackForForm(track)}>
                        <img src={track.album.images[2]?.url || track.album.images[0]?.url} className="w-12 h-12 rounded object-cover" alt="cover" />
                        <div className="flex-grow">
                            <div className="font-bold text-white">{track.name}</div>
                            <div className="text-xs text-slate-400">
                                {track.artists.map(a => a.name).join(', ')} • {track.album.name}
                            </div>
                        </div>
                        <button type="button" className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded border border-green-800">
                            {t('form_import_btn')}
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- MUSICBRAINZ RESULTS --- */}
        {importMode === 'mb' && mbResults.length > 0 && (
            <div className="mt-4 grid gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {mbResults.map(release => (
                    <div key={release.id} className="flex items-center gap-4 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer transition-colors" onClick={() => selectMBReleaseForForm(release)}>
                        <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center text-slate-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                        </div>
                        <div className="flex-grow">
                            <div className="font-bold text-white">{release.title}</div>
                            <div className="text-xs text-slate-400">
                                {release['first-release-date']} • {release['primary-type']}
                            </div>
                        </div>
                        <button type="button" className="text-xs bg-[#eb743b]/20 text-[#eb743b] px-3 py-1 rounded border border-[#eb743b]/50">
                            Import
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- ALBUM RESULTS (Album Mode) --- */}
        {importMode === 'album' && !selectedAlbum && albumResults.length > 0 && (
             <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {albumResults.map(album => (
                    <div key={album.id} className="flex flex-col p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer transition-colors" onClick={() => selectAlbumForBulk(album)}>
                        <div className="flex items-center gap-4 mb-3">
                             <img src={album.images[1]?.url || album.images[0]?.url} className="w-16 h-16 rounded object-cover shadow-lg" alt="cover" />
                             <div>
                                <div className="font-bold text-white text-lg leading-tight mb-1">{album.name}</div>
                                <div className="text-xs text-slate-400">{album.artists.map(a => a.name).join(', ')}</div>
                                <div className="text-xs text-slate-500">{album.release_date} • {album.total_tracks} Tracks</div>
                             </div>
                        </div>
                        <button className="mt-auto w-full py-2 bg-green-900/50 hover:bg-green-800 text-green-400 rounded border border-green-800 text-sm font-bold">
                            View & Import
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- ALBUM TRACKS REVIEW --- */}
        {importMode === 'album' && selectedAlbum && (
            <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-700 animate-fade-in">
                <div className="flex items-start gap-6 border-b border-slate-800 pb-4 mb-4">
                    <img src={selectedAlbum.images[0]?.url} className="w-24 h-24 rounded shadow-lg" alt="cover" />
                    <div>
                        <h4 className="text-2xl font-bold text-white">{selectedAlbum.name}</h4>
                        <p className="text-slate-400">{selectedAlbum.artists[0].name} • {selectedAlbum.release_date}</p>
                        <button 
                            onClick={() => { setSelectedAlbum(null); setAlbumTracks([]); }}
                            className="text-xs text-slate-500 hover:text-white mt-2 underline"
                        >
                            ← Back
                        </button>
                    </div>
                    <div className="ml-auto">
                        <button 
                            onClick={bulkImport}
                            disabled={isSaving || albumTracks.length === 0}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50"
                        >
                            {isSaving ? t('form_btn_saving') : `Import All (${albumTracks.length})`}
                        </button>
                    </div>
                </div>

                {importStatus && (
                    <div className="mb-4 p-3 bg-blue-900/30 text-blue-200 border border-blue-800 rounded text-center font-bold">
                        {importStatus}
                    </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {albumTracks.map((track, idx) => (
                        <div key={track.id} className="flex items-center gap-4 p-2 bg-slate-900 rounded border border-slate-800 opacity-75">
                            <span className="text-slate-500 w-6 text-center">{track.track_number || idx + 1}</span>
                            <div className="font-medium text-slate-300 flex-grow">{track.name}</div>
                            <div className="text-xs text-slate-600 font-mono">ID: {track.id}</div>
                        </div>
                    ))}
                    {albumTracks.length === 0 && !isSearching && <div className="text-slate-500 text-center py-4">No tracks found.</div>}
                </div>
            </div>
        )}
      </div>

      {/* Manual Form (Only shown in Single Mode or MB Mode) */}
      {(importMode === 'single' || importMode === 'mb') && (
        <form onSubmit={handleSubmit} className="space-y-8 bg-slate-800 p-8 rounded-xl border border-slate-700 animate-fade-in">
             {/* Basic Info */}
            <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-4 border-b border-slate-700 pb-2">{t('form_section_basic')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_title')} *</label>
                <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_version')}</label>
                <input name="versionLabel" value={formData.versionLabel} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_lang')}</label>
                <select name="language" value={formData.language} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_project')}</label>
                <select name="projectType" value={formData.projectType} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">
                    {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_category')}</label>
                    <select name="releaseCategory" value={formData.releaseCategory} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">
                        {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_company')}</label>
                    <input name="releaseCompany" value={formData.releaseCompany || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="e.g. Willwi Music" />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_date')}</label>
                <input type="date" name="releaseDate" value={formData.releaseDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_cover')}</label>
                <div className="flex gap-2">
                    <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="https://..." />
                    {formData.coverUrl ? (
                        <img src={formData.coverUrl} alt="Preview" className="w-10 h-10 rounded object-cover border border-slate-600" />
                    ) : (
                        <div className="w-10 h-10 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    <span className="text-blue-400 font-bold">Carrd Pro Tip:</span> Upload image to Carrd, publish, and copy link here for max quality.
                </p>
                </div>
                <div className="flex items-center">
                <input type="checkbox" id="isEditorPick" name="isEditorPick" checked={formData.isEditorPick} onChange={handleChange} className="h-5 w-5 text-brand-accent bg-slate-900 border-slate-600 rounded" />
                <label htmlFor="isEditorPick" className="ml-2 block text-sm text-slate-300">{t('form_label_pick')}</label>
                </div>
            </div>
            </section>

            {/* Metadata */}
            <section>
            <h3 className="text-xl font-semibold text-brand-accent mb-4 border-b border-slate-700 pb-2">{t('form_section_meta')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">ISRC</label>
                <input name="isrc" value={formData.isrc || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" placeholder="TW-..." />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">UPC</label>
                <input name="upc" value={formData.upc || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Spotify ID (URI)</label>
                <input name="spotifyId" value={formData.spotifyId || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" placeholder="4uLU6hMC..." />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MusicBrainz ID</label>
                <input name="musicBrainzId" value={formData.musicBrainzId || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono" />
                </div>
            </div>
            </section>

            {/* Links & Content */}
            <section>
                <h3 className="text-xl font-semibold text-brand-accent mb-4 border-b border-slate-700 pb-2">{t('form_section_links')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-white mb-1">Master Audio URL (Google Drive / MP3)</label>
                        <input name="audioUrl" value={formData.audioUrl || ''} onChange={handleChange} className="w-full bg-slate-900 border border-brand-gold/50 rounded p-2 text-white font-mono text-sm" placeholder="Paste Google Drive Link here..." />
                         <p className="text-xs text-slate-400 mt-1">
                            <strong>How to use Drive:</strong> Right-click your MP3 file in Google Drive &rarr; Share &rarr; Copy Link. Paste it here, we will convert it automatically.
                         </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_youtube')}</label>
                        <input name="youtubeUrl" value={formData.youtubeUrl || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_spotify')}</label>
                        <input name="spotifyLink" value={formData.spotifyLink || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_apple')}</label>
                        <input name="appleMusicLink" value={formData.appleMusicLink || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                    </div>
                </div>
                 <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                    <label className="block text-sm font-bold text-brand-accent mb-2">{t('form_label_lyrics')} (Database & Interactive Mode)</label>
                    <textarea name="lyrics" rows={6} value={formData.lyrics || ''} onChange={handleChange} className="w-full bg-slate-950 border border-slate-600 rounded p-3 text-white font-mono text-sm leading-relaxed" placeholder="Paste lyrics here. Line by line." />
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('form_label_desc')}</label>
                    <textarea name="description" rows={3} value={formData.description || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </div>
                <div className="mt-4 bg-slate-900/50 p-4 rounded border border-slate-700">
                    <label className="block text-sm font-bold text-brand-accent mb-2">{t('form_label_credits')} (Acknowledgments)</label>
                    <textarea name="credits" rows={4} value={formData.credits || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white text-sm" placeholder="Producer: ... Arranger: ... " />
                </div>
            </section>

            <div className="flex justify-end gap-4 border-t border-slate-700 pt-6">
                <button type="button" onClick={() => navigate('/database')} className="px-6 py-3 rounded-md text-slate-300 hover:text-white transition-colors">{t('form_btn_cancel')}</button>
                <button type="submit" disabled={isSaving} className="px-8 py-3 rounded-md bg-brand-accent text-slate-900 font-bold hover:bg-sky-400 transition-colors shadow-lg disabled:opacity-50">
                    {isSaving ? t('form_btn_saving') : t('form_btn_save')}
                </button>
            </div>
        </form>
      )}
    </div>
  );
};

export default AddSong;