import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, Language, ProjectType, ReleaseCategory, getLanguageColor } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';
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

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSong, updateSong, deleteSong, songs } = useData(); 
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser(); 
  
  // --- PASSWORD PROTECTION STATE ---
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit State
  const [editForm, setEditForm] = useState<Partial<Song>>({});

  // Spotify Update State in Edit Mode
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [searchingSpotify, setSearchingSpotify] = useState(false);

  // AI State
  const [aiReview, setAiReview] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Image Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Related Songs (Multilingual)
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) {
        setSong(found);
        setEditForm(found);
      }
    }
  }, [id, getSong, navigate]);

  // Logic to find related songs (versions in other languages)
  useEffect(() => {
      if (!song || !songs) return;
      
      const normalizeTitle = (title: string) => {
          // Remove contents in brackets e.g. "Love Again (Chinese Ver.)" -> "love again"
          return title.split('(')[0].trim().toLowerCase();
      };

      const currentTitleBase = normalizeTitle(song.title);

      const related = songs.filter(s => {
          if (s.id === song.id) return false; // Exclude self
          
          // 1. Strong Match: Shared MusicBrainz Release Group ID
          if (song.musicBrainzId && s.musicBrainzId && song.musicBrainzId === s.musicBrainzId) {
              return true;
          }

          // 2. Fuzzy Match: Same Base Title
          const otherTitleBase = normalizeTitle(s.title);
          return currentTitleBase === otherTitleBase;
      });

      setRelatedSongs(related);

  }, [song, songs]);

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
                       <svg className="w-8 h-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">Private Track</h2>
                   <p className="text-slate-400 text-sm mb-6">Please enter access code to view details.</p>
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

  // Prevent render if loading
  if (!song) return <div className="text-white text-center mt-20">Loading...</div>;

  // --- MusicBrainz Seeding Logic ---
  const handleMusicBrainzSubmit = () => {
      if (!song) return;

      const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
      const params = new URLSearchParams();

      // Basic Release Info
      params.append('name', song.title);
      params.append('artist_credit.names.0.artist.name', 'Willwi');
      params.append('artist_credit.names.0.name', 'Willwi');
      params.append('artist_credit.names.0.mbid', WILLWI_MBID);
      
      // If we already have a Release Group ID (musicBrainzId), link this new release to it
      if (song.musicBrainzId) {
          params.append('release_group', song.musicBrainzId);
      }
      
      // Status & Language
      params.append('status', 'official');
      
      // ISO 639-3 Code Mapping
      const langMap: Record<string, string> = {
          // Enum Values (Chinese)
          '華語': 'cmn',
          '台語': 'nan',
          '英語': 'eng',
          '日語': 'jpn',
          '韓語': 'kor',
          '泰語': 'tha',
          '義大利語': 'ita',
          '法語': 'fra',
          '純音樂': 'zxx',
          // English Fallbacks
          'Mandarin': 'cmn', 
          'Taiwanese': 'nan',
          'English': 'eng',
          'Japanese': 'jpn',
          'Korean': 'kor',
          'Thai': 'tha',
          'Italian': 'ita',
          'French': 'fra',
          'Instrumental': 'zxx'
      };
      
      const langCode = langMap[song.language] || langMap[Language.Mandarin] || 'zho';
      params.append('language', langCode);
      params.append('script', 'Hant'); 

      // Date Parsing
      if (song.releaseDate) {
          const parts = song.releaseDate.split('-');
          if (parts.length === 3) {
              params.append('events.0.date.year', parts[0]);
              params.append('events.0.date.month', parts[1]);
              params.append('events.0.date.day', parts[2]);
          }
          params.append('events.0.country', 'TW'); 
      }

      // Type Guessing
      let primaryType = 'single';
      if (song.releaseCategory === ReleaseCategory.Album) primaryType = 'album';
      if (song.releaseCategory === ReleaseCategory.EP) primaryType = 'ep';
      params.append('type', primaryType);

      // Annotation / Notes
      let annotation = `Imported from Willwi Music Manager.\n`;
      if (song.isrc) annotation += `ISRC: ${song.isrc}\n`;
      if (song.upc) annotation += `UPC: ${song.upc}\n`;
      if (song.projectType) annotation += `Project: ${song.projectType}\n`;
      if (song.releaseCompany) annotation += `Label: ${song.releaseCompany}\n`;
      
      params.append('annotation', annotation);
      
      // Open in new tab
      const url = `https://musicbrainz.org/release/add?${params.toString()}`;
      window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (song && id) {
      setIsSaving(true);
      const success = await updateSong(id, editForm);
      if (success) {
        setSong({ ...song, ...editForm } as Song);
        setIsEditing(false);
      } else {
        alert(t('msg_save_error'));
      }
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (id && window.confirm(t('msg_confirm_delete'))) {
        await deleteSong(id);
        navigate('/database');
    }
  };

  const handleAiGenerate = async () => {
    setLoadingAi(true);
    const review = await generateMusicCritique(song);
    setAiReview(review);
    setLoadingAi(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditForm(prev => ({ ...prev, coverUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery) return;
    setSearchingSpotify(true);
    const results = await searchSpotifyTracks(spotifyQuery);
    setSpotifyResults(results);
    setSearchingSpotify(false);
  };

  const applySpotifyData = (track: SpotifyTrack) => {
      // Merge Spotify data into edit form
      const largestImage = track.album.images[0]?.url || '';
      setEditForm(prev => ({
          ...prev,
          title: track.name,
          releaseDate: track.album.release_date,
          coverUrl: largestImage,
          isrc: track.external_ids.isrc || prev.isrc,
          upc: track.album.external_ids?.upc || track.album.external_ids?.ean || prev.upc,
          spotifyId: track.id,
          spotifyLink: track.external_urls.spotify,
          versionLabel: track.name.includes('(') ? track.name.split('(')[1].replace(')', '') : prev.versionLabel,
      }));
      setShowSpotifySearch(false);
      setSpotifyResults([]);
  };

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            videoId = urlParams.get('v') || '';
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch(e) {
        return null;
    }
  };

  // Robust Spotify ID Extractor
  const getSpotifyEmbedId = (s: Partial<Song>) => {
      const candidates = [s.spotifyId, s.spotifyLink];
      for (const c of candidates) {
          if (!c) continue;
          
          // Case 1: Full URL (https://open.spotify.com/track/12345?si=...)
          const urlMatch = c.match(/track\/([a-zA-Z0-9]+)/);
          if (urlMatch) return urlMatch[1];

          // Case 2: URI (spotify:track:12345)
          const uriMatch = c.match(/track:([a-zA-Z0-9]+)/);
          if (uriMatch) return uriMatch[1];
          
          // Case 3: Just ID (assume alphanumeric and reasonable length, no slashes/colons)
          if (!c.includes('/') && !c.includes(':') && c.length > 15) return c;
      }
      return null;
  };

  // Determine what data to display (Live Preview logic)
  const displayData = isEditing ? { ...song, ...editForm } : song;
  const embedUrl = getYoutubeEmbedUrl(displayData.youtubeUrl);
  const spotifyEmbedId = getSpotifyEmbedId(displayData);

  return (
    <div className="animate-fade-in pb-32">
        {/* Header / Top Section */}
        <div className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
            <div className="relative">
                 {/* Background Blur Effect */}
                <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
                
                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-shrink-0 w-full md:w-64 group relative">
                         <img src={isEditing && editForm.coverUrl ? editForm.coverUrl : song.coverUrl} alt={song.title} className="w-full aspect-square object-cover rounded-xl shadow-lg bg-slate-900" />
                         {isEditing && (
                             <div className="mt-2 space-y-2">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full bg-brand-accent hover:bg-sky-400 text-slate-900 font-bold py-2 px-4 rounded text-xs transition-colors"
                                >
                                    📷 Upload Cover
                                </button>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleImageUpload}
                                />
                                <div className="text-center text-xs text-slate-400">- OR URL -</div>
                                <input 
                                    className="w-full bg-slate-900/80 border border-slate-600 rounded p-1 text-xs text-white" 
                                    value={editForm.coverUrl}
                                    onChange={(e) => setEditForm({...editForm, coverUrl: cleanGoogleRedirect(e.target.value)})}
                                    placeholder="https://..."
                                />
                             </div>
                         )}
                    </div>
                    
                    <div className="flex-grow w-full">
                        <div className="flex justify-between items-start">
                            <div className="w-full">
                                {isEditing ? (
                                    <div className="space-y-4 mb-4">
                                        {/* Update from Spotify Tool */}
                                        <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-green-400 font-bold flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                                    Update from Spotify
                                                </span>
                                                <button onClick={() => setShowSpotifySearch(!showSpotifySearch)} className="text-xs text-green-300 underline">
                                                    {showSpotifySearch ? 'Cancel' : 'Search'}
                                                </button>
                                            </div>
                                            {showSpotifySearch && (
                                                <div className="mt-2">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            className="flex-grow bg-black border border-green-800 rounded p-1 text-xs text-white"
                                                            placeholder="Song Title..."
                                                            value={spotifyQuery}
                                                            onChange={(e) => setSpotifyQuery(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                                                        />
                                                        <button 
                                                            onClick={handleSpotifySearch}
                                                            disabled={searchingSpotify}
                                                            className="bg-green-700 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            Go
                                                        </button>
                                                    </div>
                                                    {spotifyResults.length > 0 && (
                                                        <div className="mt-2 max-h-40 overflow-y-auto bg-black rounded border border-green-900 p-1">
                                                            {spotifyResults.map(r => (
                                                                <div key={r.id} onClick={() => applySpotifyData(r)} className="flex items-center gap-2 p-2 hover:bg-green-900 cursor-pointer text-xs border-b border-green-900/50 last:border-0">
                                                                    <img src={r.album.images[2]?.url} className="w-8 h-8 rounded" alt="s"/>
                                                                    <div>
                                                                        <div className="font-bold text-green-200">{r.name}</div>
                                                                        <div className="text-green-500">{r.album.name} • {r.album.release_date}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <input 
                                            className="text-4xl font-black text-white bg-slate-900/50 border border-slate-600 rounded px-2 w-full uppercase tracking-tighter"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                        />
                                        <div className="flex gap-4">
                                            <select 
                                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                                                value={editForm.language}
                                                onChange={(e) => setEditForm({...editForm, language: e.target.value as Language})}
                                            >
                                                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                            <input 
                                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                                                value={editForm.versionLabel || ''}
                                                onChange={(e) => setEditForm({...editForm, versionLabel: e.target.value})}
                                                placeholder="Version Label"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 leading-[0.9]">{song.title}</h1>
                                        <div className="flex flex-wrap items-center gap-3 mb-6">
                                            {song.versionLabel && (
                                                <span className="px-2 py-1 border border-white/20 rounded text-xs font-bold uppercase tracking-wider text-slate-300">
                                                    {song.versionLabel}
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-white ${getLanguageColor(song.language)}`}>
                                                {song.language}
                                            </span>
                                            <span className="text-slate-500 text-sm font-bold tracking-wider uppercase">
                                                {song.releaseDate} • {song.projectType}
                                            </span>
                                            {/* Link to related versions */}
                                            {relatedSongs.length > 0 && (
                                                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
                                                    <span className="text-[10px] text-slate-500 uppercase">Also available in:</span>
                                                    {relatedSongs.map(r => (
                                                        <button 
                                                            key={r.id} 
                                                            onClick={() => navigate(`/song/${r.id}`)}
                                                            className={`w-5 h-5 rounded-full ${getLanguageColor(r.language)} hover:scale-110 transition-transform`}
                                                            title={`${r.language} Ver: ${r.title}`}
                                                        ></button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-slate-700 text-white font-bold text-xs hover:bg-slate-600">Cancel</button>
                                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold text-xs hover:bg-green-500 shadow-lg shadow-green-900/50">
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 font-bold text-xs hover:text-white hover:border-white transition-all flex items-center justify-center gap-2">
                                            <span>✎</span> {t('btn_edit')}
                                        </button>
                                        <button onClick={handleDelete} className="px-4 py-2 rounded-lg border border-red-900/50 text-red-500 font-bold text-xs hover:bg-red-900/20 transition-all flex items-center justify-center gap-2">
                                            <span>🗑</span> {t('btn_delete')}
                                        </button>
                                        
                                        {/* MusicBrainz Sync Button */}
                                        <button 
                                            onClick={handleMusicBrainzSubmit}
                                            className="px-4 py-2 rounded-lg bg-[#eb743b] text-white font-bold text-xs hover:bg-[#d6632b] shadow-lg shadow-[#eb743b]/20 flex items-center justify-center gap-2 mt-2"
                                            title="Submit to MusicBrainz Database"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.56 18.067c-3.76 1.76-7.56.96-7.56-3.187 0-3.08 2.067-4.28 4.613-4.28.613 0 1.133.053 1.547.12V8.467c0-2.427 1.6-3.213 2.827-3.213.627 0 1.253.187 1.547.333l-.533 2.227c-.2-.08-.507-.187-.84-.187-.667 0-.96.32-.96 1.147v2.24c.947.16 1.947.533 1.947 1.64 0 1.253-.987 2.147-2.587 2.147v3.266zM12.96 13.6c.56 0 .867-.28.867-.68 0-.413-.373-.613-1.013-.72v1.36c.053.027.093.04.147.04zm-3.08-2.12c-.933 0-1.427.533-1.427 1.773 0 1.653 1.24 1.8 2.507 1.187V11.52c-.373-.027-.733-.04-1.08-.04z"/></svg>
                                            Submit to MB
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">ISRC</span>
                                {isEditing ? (
                                    <input className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-full font-mono" value={editForm.isrc || ''} onChange={e => setEditForm({...editForm, isrc: e.target.value})} />
                                ) : (
                                    <span className="font-mono text-sm text-slate-300 select-all">{song.isrc || '-'}</span>
                                )}
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">UPC</span>
                                {isEditing ? (
                                    <input className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-full font-mono" value={editForm.upc || ''} onChange={e => setEditForm({...editForm, upc: e.target.value})} />
                                ) : (
                                    <span className="font-mono text-sm text-slate-300 select-all">{song.upc || '-'}</span>
                                )}
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Spotify ID</span>
                                {isEditing ? (
                                    <input className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-full font-mono" value={editForm.spotifyId || ''} onChange={e => setEditForm({...editForm, spotifyId: e.target.value})} />
                                ) : (
                                    <span className="font-mono text-sm text-slate-300 select-all">{song.spotifyId || '-'}</span>
                                )}
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Label</span>
                                {isEditing ? (
                                    <input className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs w-full" value={editForm.releaseCompany || ''} onChange={e => setEditForm({...editForm, releaseCompany: e.target.value})} />
                                ) : (
                                    <span className="text-sm text-slate-300">{song.releaseCompany || '-'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            
            {/* LEFT: Lyrics & Story */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Description & AI Critique */}
                <div className="bg-slate-900/50 rounded-xl p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">{t('detail_tab_story')}</h3>
                        <button 
                            onClick={handleAiGenerate}
                            disabled={loadingAi}
                            className="text-xs bg-brand-accent/10 text-brand-accent border border-brand-accent/50 px-3 py-1 rounded-full hover:bg-brand-accent hover:text-slate-900 transition-colors"
                        >
                            {loadingAi ? t('detail_ai_loading') : `✨ ${t('detail_ai_btn')}`}
                        </button>
                    </div>
                    
                    {isEditing ? (
                        <textarea 
                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-4 text-white text-sm"
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        />
                    ) : (
                        <div className="prose prose-invert max-w-none text-slate-300 font-light leading-relaxed whitespace-pre-line">
                            {song.description || "No description available."}
                        </div>
                    )}

                    {/* AI Review Result */}
                    {aiReview && (
                        <div className="mt-6 bg-slate-800 p-6 rounded-lg border-l-4 border-purple-500 animate-fade-in">
                            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">AI Review</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{aiReview}</p>
                        </div>
                    )}
                </div>

                {/* 2. Lyrics */}
                <div className="bg-slate-900/50 rounded-xl p-8 border border-white/5 relative">
                    <h3 className="text-xl font-bold text-white mb-6">{t('detail_lyrics_header')}</h3>
                    {isEditing ? (
                        <textarea 
                            className="w-full h-96 bg-slate-950 border border-slate-700 rounded p-4 text-white font-mono text-sm leading-relaxed"
                            value={editForm.lyrics || ''}
                            onChange={(e) => setEditForm({...editForm, lyrics: e.target.value})}
                        />
                    ) : (
                        <div className="font-mono text-sm text-slate-400 whitespace-pre-line leading-relaxed tracking-wide border-l-2 border-slate-800 pl-6">
                            {song.lyrics || "Lyrics not available."}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Media & Links */}
            <div className="space-y-8">
                
                {/* 1. Media Player (YouTube or Spotify) */}
                <div className="bg-slate-900 rounded-xl p-6 border border-white/5 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{t('detail_player_header')}</h3>
                    
                    {/* Primary: YouTube */}
                    {embedUrl ? (
                        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden mb-4 shadow-lg border border-slate-800">
                             <iframe 
                                className="w-full h-full"
                                src={embedUrl} 
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                             ></iframe>
                        </div>
                    ) : (
                        /* Secondary: Spotify Embed (if no YouTube) */
                        spotifyEmbedId && (
                             <div className="mb-4">
                                <iframe style={{borderRadius: '12px'}} src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                            </div>
                        )
                    )}

                    {/* Audio File (if uploaded) */}
                    {song.audioUrl && (
                        <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800">
                             <div className="text-[10px] text-brand-gold uppercase tracking-widest font-bold mb-2">Master / Demo Audio</div>
                             <audio controls className="w-full h-8" src={song.audioUrl}></audio>
                        </div>
                    )}

                    {isEditing && (
                        <div className="mt-4 space-y-2">
                             <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                                placeholder="YouTube URL"
                                value={editForm.youtubeUrl || ''}
                                onChange={(e) => setEditForm({...editForm, youtubeUrl: e.target.value})}
                             />
                             <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
                                placeholder="Audio URL (Drive/MP3)"
                                value={editForm.audioUrl || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if(val.includes('drive.google.com')) {
                                        setEditForm({...editForm, audioUrl: convertDriveLink(val)});
                                    } else {
                                        setEditForm({...editForm, audioUrl: val});
                                    }
                                }}
                             />
                        </div>
                    )}
                </div>

                {/* 2. Platform Links */}
                <div className="bg-slate-900 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{t('detail_links_header')}</h3>
                    <div className="space-y-3">
                        {song.spotifyLink && (
                            <a href={song.spotifyLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-950 hover:bg-green-900/20 border border-slate-800 hover:border-green-800 rounded-lg transition-all group">
                                <span className="text-sm font-bold text-slate-300 group-hover:text-green-400">Spotify</span>
                                <span className="text-xs text-slate-500">Listen ↗</span>
                            </a>
                        )}
                        {song.appleMusicLink && (
                            <a href={song.appleMusicLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-950 hover:bg-pink-900/20 border border-slate-800 hover:border-pink-800 rounded-lg transition-all group">
                                <span className="text-sm font-bold text-slate-300 group-hover:text-pink-400">Apple Music</span>
                                <span className="text-xs text-slate-500">Listen ↗</span>
                            </a>
                        )}
                        {song.youtubeUrl && (
                            <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-950 hover:bg-red-900/20 border border-slate-800 hover:border-red-800 rounded-lg transition-all group">
                                <span className="text-sm font-bold text-slate-300 group-hover:text-red-400">YouTube</span>
                                <span className="text-xs text-slate-500">Watch ↗</span>
                            </a>
                        )}
                        {/* MusicBrainz Link */}
                        {song.musicBrainzId && (
                             <a href={`https://musicbrainz.org/release-group/${song.musicBrainzId}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-950 hover:bg-[#eb743b]/20 border border-slate-800 hover:border-[#eb743b]/50 rounded-lg transition-all group">
                                <span className="text-sm font-bold text-slate-300 group-hover:text-[#eb743b]">MusicBrainz</span>
                                <span className="text-xs text-slate-500">View Data ↗</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* 3. Credits */}
                <div className="bg-slate-900 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Credits</h3>
                    {isEditing ? (
                         <textarea 
                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-4 text-white text-xs"
                            value={editForm.credits || ''}
                            onChange={(e) => setEditForm({...editForm, credits: e.target.value})}
                         />
                    ) : (
                        <div className="text-xs text-slate-400 font-mono whitespace-pre-line leading-relaxed">
                            {song.credits || "No credits available."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;