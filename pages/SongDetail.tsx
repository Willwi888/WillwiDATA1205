import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// SMART LINK CONVERTER (Duplicated logic for detail view safety)
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        // Google Drive
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        // Dropbox
        if (url.includes('dropbox.com')) {
            return url.replace('dl=0', 'raw=1');
        }
        return url;
    } catch (e) { return url; }
};

// --- IMMERSIVE LYRICS PLAYER COMPONENT ---
interface LyricsLine {
    time: number; // in seconds
    text: string;
}

const parseLyrics = (raw: string): { lines: LyricsLine[], hasTime: boolean } => {
    const lines = raw.split('\n');
    const parsed: LyricsLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    let hasTime = false;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            hasTime = true;
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3]);
            const time = min * 60 + sec + (ms / 1000);
            const text = line.replace(timeRegex, '').trim();
            if (text) parsed.push({ time, text });
        } else {
            // Fallback for non-time-synced lines, assign dummy time or keep order
            if (line.trim()) parsed.push({ time: -1, text: line.trim() });
        }
    }

    // If no timestamps found, just return plain lines with index as placeholder
    if (!hasTime) {
        return { 
            lines: lines.map((text, i) => ({ time: i, text: text.trim() })).filter(l => l.text), 
            hasTime: false 
        };
    }

    return { lines: parsed, hasTime: true };
};

const ImmersivePlayer: React.FC<{ song: Song; onClose: () => void }> = ({ song, onClose }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(0);

    const { lines, hasTime } = useMemo(() => parseLyrics(song.lyrics || ''), [song.lyrics]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('ended', () => setIsPlaying(false));

        // Auto-play on open if source exists
        if (song.audioUrl) audio.play().catch(() => {});

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
        };
    }, [song.audioUrl]);

    // Sync Logic
    useEffect(() => {
        if (!hasTime) return;
        // Find the current line based on time
        const index = lines.findIndex((line, i) => {
            const nextLine = lines[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });
        
        if (index !== -1 && index !== activeLineIndex) {
            setActiveLineIndex(index);
            // Auto Scroll
            if (lyricsContainerRef.current) {
                const activeEl = lyricsContainerRef.current.children[index] as HTMLElement;
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [currentTime, lines, hasTime, activeLineIndex]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
        }
    };

    const formatTime = (t: number) => {
        if (isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-110 transition-all duration-[10s]"
                    style={{ backgroundImage: `url(${song.coverUrl})` }}
                ></div>
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center p-6">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="text-center">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">{song.title}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{song.releaseCompany || 'Willwi Music'}</p>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Lyrics Area */}
            <div className="relative z-10 flex-1 overflow-hidden flex items-center justify-center">
                <div 
                    ref={lyricsContainerRef}
                    className="w-full max-w-2xl h-full overflow-y-auto custom-scrollbar px-6 py-20 text-center space-y-8"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {lines.length > 0 ? lines.map((line, i) => (
                        <p 
                            key={i} 
                            onClick={() => {
                                // Click to seek (if synced)
                                if (hasTime && audioRef.current && line.time >= 0) {
                                    audioRef.current.currentTime = line.time;
                                }
                            }}
                            className={`transition-all duration-500 cursor-pointer font-bold leading-tight ${
                                hasTime 
                                    ? (i === activeLineIndex ? 'text-3xl md:text-4xl text-white scale-105' : 'text-xl md:text-2xl text-white/30 hover:text-white/60 blur-[1px] hover:blur-0')
                                    : 'text-2xl md:text-3xl text-white/80 hover:text-white my-6'
                            }`}
                        >
                            {line.text}
                        </p>
                    )) : (
                        <p className="text-slate-500 text-sm uppercase tracking-widest">No Lyrics Available</p>
                    )}
                    {/* Spacer for bottom scrolling */}
                    <div className="h-40"></div>
                </div>
            </div>

            {/* Player Controls */}
            <div className="relative z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-8 md:p-12">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Info */}
                    <div className="flex items-center gap-6">
                         <img src={song.coverUrl} className="w-16 h-16 rounded-lg shadow-2xl object-cover" alt="" />
                         <div>
                             <h3 className="text-xl font-black text-white leading-none mb-1">{song.title}</h3>
                             <p className="text-xs text-brand-gold uppercase tracking-widest font-bold">Willwi</p>
                         </div>
                    </div>

                    {/* Progress */}
                    {song.audioUrl ? (
                        <div className="space-y-2">
                            <input 
                                type="range" 
                                min={0} 
                                max={duration || 100} 
                                value={currentTime} 
                                onChange={handleSeek}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full transition-all"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-center">
                            <p className="text-[10px] text-red-400 uppercase tracking-widest">Audio Source Unavailable for Playback</p>
                        </div>
                    )}

                    {/* Controls */}
                    {song.audioUrl && (
                        <div className="flex justify-center items-center gap-8">
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10 }} className="text-white/50 hover:text-white transition-all">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                            </button>
                            <button 
                                onClick={togglePlay}
                                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                {isPlaying ? (
                                    <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10 }} className="text-white/50 hover:text-white transition-all">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Audio Element */}
            {song.audioUrl && <audio ref={audioRef} src={song.audioUrl} crossOrigin="anonymous" />}
        </div>
    );
};

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSong, updateSong, deleteSong } = useData(); 
  const { isAdmin } = useUser(); 
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [aiReview, setAiReview] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showLyricsPlayer, setShowLyricsPlayer] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) { setSong(found); setEditForm(found); }
    }
  }, [id, getSong]);

  if (!song) return null;

  // Helper to extract Spotify ID for embedding
  const getSpotifyEmbedId = (link?: string, id?: string) => {
      if (id) return id;
      if (!link) return null;
      try {
          const url = new URL(link);
          const parts = url.pathname.split('/');
          const trackIndex = parts.indexOf('track');
          if (trackIndex !== -1 && parts[trackIndex + 1]) {
              return parts[trackIndex + 1];
          }
      } catch (e) { return null; }
      return null;
  };

  // Helper to extract YouTube ID for embedding
  const getYoutubeEmbedId = (url?: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    if (song && id) {
      setIsSaving(true);
      const finalForm = { ...editForm };
      if (finalForm.audioUrl) {
          finalForm.audioUrl = convertToDirectStream(finalForm.audioUrl);
      }
      
      if (await updateSong(id, finalForm)) { 
          setSong({ ...song, ...finalForm } as Song); 
          setIsEditing(false); 
      }
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
      if (!isAdmin || !song) return;
      const confirmDelete = window.confirm(`【確認刪除】\n\n您確定要永久刪除《${song.title}》嗎？\n此動作無法復原。`);
      if (confirmDelete) {
          await deleteSong(song.id);
          navigate('/database');
      }
  };

  const handleAiGenerate = async () => {
    if (!isAdmin) return;
    setLoadingAi(true);
    setAiReview(await generateMusicCritique(song));
    setLoadingAi(false);
  };

  const handleStartInteractive = () => {
      if (!song.isInteractiveActive) return;
      if (song.language === Language.Instrumental) {
          alert("此作品為純音樂 (Instrumental)，沒有歌詞可供互動同步。");
          return;
      }
      if (!song.lyrics || song.lyrics.trim().length === 0) {
          alert("此作品尚未登錄歌詞，無法進行互動。");
          return;
      }
      navigate('/interactive', { state: { targetSongId: song.id } });
  };

  const spotifyEmbedId = getSpotifyEmbedId(song.spotifyLink, song.spotifyId);
  const youtubeEmbedId = getYoutubeEmbedId(song.youtubeUrl);
  const isInstrumental = song.language === Language.Instrumental;

  // MusicBrainz Logic
  const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
  const musicBrainzSubmissionUrl = `https://musicbrainz.org/recording/create?artist=${WILLWI_MBID}&edit-recording.name=${encodeURIComponent(song.title)}&edit-recording.comment=Auto-submitted from Willwi DB`;

  return (
    <div className="animate-fade pb-32 max-w-7xl mx-auto px-6">
        
        {/* --- IMMERSIVE PLAYER OVERLAY --- */}
        {showLyricsPlayer && (
            <ImmersivePlayer song={song} onClose={() => setShowLyricsPlayer(false)} />
        )}

        <div className="mb-6"><Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">← Back to Catalog</Link></div>
        
        <div className="bg-slate-900 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={isEditing ? editForm.coverUrl : song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="cover" />
                     {isAdmin && isEditing && (
                         <div className="mt-4 space-y-2">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 text-white font-bold py-3 text-[10px] uppercase tracking-widest border border-white/10">Upload Image</button>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { const r = new FileReader(); r.onloadend = () => setEditForm(p => ({ ...p, coverUrl: r.result as string })); r.readAsDataURL(file); }
                            }} />
                            <input className="w-full bg-black border border-white/10 p-2 text-[10px] text-white font-mono" value={editForm.coverUrl} onChange={e => setEditForm({...editForm, coverUrl: e.target.value})} placeholder="IMAGE URL" />
                         </div>
                     )}
                </div>
                
                <div className="flex-grow w-full">
                    <div className="flex justify-between items-start">
                        <div className="w-full">
                            {isAdmin && isEditing ? (
                                <input className="text-5xl font-black text-white bg-black border border-white/10 px-4 py-2 w-full uppercase tracking-tighter" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            ) : (
                                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{song.title}</h1>
                            )}
                            <div className="flex items-center gap-4 mt-6">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                                {isAdmin && !isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="text-[10px] border border-white/20 px-3 py-1 uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                        Edit Mode
                                    </button>
                                )}
                            </div>

                            {/* USER ACTIONS: IMMERSIVE LYRICS & INTERACTIVE */}
                            <div className="mt-8 flex flex-wrap gap-4">
                                <button 
                                    onClick={() => setShowLyricsPlayer(true)}
                                    className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black hover:border-white transition-all rounded-full"
                                >
                                    <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] group-hover:shadow-none transition-all">
                                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Immersive Lyrics / 歌詞模式</span>
                                </button>

                                {/* SMART LINK BUTTON (PRIMARY PUBLIC LINK) */}
                                {song.smartLink && !isEditing && (
                                    <a 
                                        href={song.smartLink}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 px-6 py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] transition-all rounded-full hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                    >
                                        <span>ALL PLATFORMS (HyperFollow)</span>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-4 max-w-sm">
                                {song.isInteractiveActive ? (
                                    (isInstrumental || !song.lyrics) ? (
                                        <div className="w-full py-4 border border-slate-600 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-slate-900 cursor-not-allowed">
                                            純音樂・無歌詞互動 (Instrumental)
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleStartInteractive}
                                            className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-lg animate-pulse"
                                        >
                                            進入互動實驗室 (Start Session)
                                        </button>
                                    )
                                ) : (
                                    <div className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-black/20">
                                        互動製作尚未開放 (Closed)
                                    </div>
                                )}
                                
                                {/* OFFICIAL LINKS (NO EMBED PLAYERS FOR LISTENERS) */}
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                    
                                    {/* YouTube Embed Player (ADMIN ONLY) */}
                                    {isAdmin && youtubeEmbedId && !isEditing && (
                                        <div className="w-full aspect-video rounded overflow-hidden shadow-lg border border-white/10 mb-2 relative group">
                                            <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-2 py-1 z-10 pointer-events-none">ADMIN PREVIEW</div>
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                src={`https://www.youtube.com/embed/${youtubeEmbedId}`}
                                                title="YouTube video player" 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    )}

                                    {/* Spotify Embed Player (ADMIN ONLY) */}
                                    {isAdmin && spotifyEmbedId && !isEditing && (
                                        <div className="w-full rounded overflow-hidden shadow-lg border border-[#1DB954]/30 relative">
                                            <div className="absolute top-0 left-0 bg-[#1DB954] text-white text-[9px] font-bold px-2 py-1 z-10 pointer-events-none">ADMIN PREVIEW</div>
                                            <iframe 
                                                src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`} 
                                                width="100%" 
                                                height="80" 
                                                frameBorder="0" 
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                                loading="lazy"
                                                title="Spotify Player"
                                                className="bg-[#282828]"
                                            ></iframe>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ADMIN CONTROL PANEL (STRICTLY ADMIN ONLY) */}
                            {isAdmin && !isEditing && (
                                <div className="mt-8 w-full max-w-md bg-black/40 border border-white/10 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></div>
                                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Admin Control Panel</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* DistroKid Management Link */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white uppercase tracking-widest">Distribution</span>
                                            <a 
                                                href={song.distrokidManageUrl || 'https://distrokid.com/mymusic'} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-slate-800 text-white border border-slate-600 hover:bg-white hover:text-black transition-all"
                                            >
                                                Manage on DistroKid
                                            </a>
                                        </div>

                                        {/* Musixmatch Management */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white uppercase tracking-widest">Lyrics Sync</span>
                                            <a 
                                                href={song.musixmatchUrl || 'https://pro.musixmatch.com/'} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-[#ff6050]/20 text-[#ff6050] border border-[#ff6050]/50 hover:bg-[#ff6050] hover:text-white transition-all"
                                            >
                                                Edit on Musixmatch
                                            </a>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white uppercase tracking-widest">Interactive Status</span>
                                            <button 
                                                onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })}
                                                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded transition-all ${song.isInteractiveActive ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                {song.isInteractiveActive ? 'Active (ON)' : 'Inactive (OFF)'}
                                            </button>
                                        </div>
                                        
                                        {/* MusicBrainz Submission / Link */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                            <span className="text-[10px] text-white uppercase tracking-widest">MusicBrainz</span>
                                            <a 
                                                href={song.musicBrainzId 
                                                    ? `https://musicbrainz.org/recording/${song.musicBrainzId}` 
                                                    : musicBrainzSubmissionUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-purple-900/50 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all"
                                            >
                                                {song.musicBrainzId ? 'View Entry' : 'Auto-Submit Data'}
                                            </a>
                                        </div>

                                        {song.audioUrl ? (
                                            <div>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Raw Source Audio (Video Gen)</p>
                                                <audio controls src={song.audioUrl} className="w-full h-8 block rounded bg-slate-800" />
                                                <p className="text-[8px] text-slate-600 mt-1">* 僅供互動影片生成使用 (Private)</p>
                                            </div>
                                        ) : (
                                            <div className="bg-red-900/20 border border-red-900/50 p-3">
                                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">MISSING RAW AUDIO</p>
                                                <p className="text-[9px] text-slate-400 mt-1">無法啟用互動功能。請填入 Dropbox 連結。</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isAdmin && isEditing && (
                                <div className="mt-6 space-y-4 bg-slate-800/50 p-4 border border-white/10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">Audio Source URL (For Video Gen)</label>
                                        <input 
                                            className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono focus:border-brand-gold outline-none" 
                                            value={editForm.audioUrl || ''} 
                                            onChange={e => {
                                                // Instant Convert on input
                                                const val = e.target.value;
                                                const converted = convertToDirectStream(val);
                                                setEditForm({...editForm, audioUrl: converted});
                                            }} 
                                            placeholder="Paste Dropbox or Google Drive Share Link here..." 
                                        />
                                        <p className="text-[9px] text-slate-400">
                                            * 用途：此為「互動實驗室」生成 MP4 影片專用 (Private Use Only)。<br/>
                                            * 支援 Dropbox/Google Drive 分享連結。
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Release Category</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.releaseCategory || ''} onChange={e => setEditForm({...editForm, releaseCategory: e.target.value as any})} placeholder="Single, EP, Album..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Language</label>
                                            <select 
                                                className="w-full bg-black border border-white/10 p-3 text-white text-xs" 
                                                value={editForm.language} 
                                                onChange={e => setEditForm({...editForm, language: e.target.value as Language})}
                                            >
                                                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Release Company (Label)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.releaseCompany || ''} onChange={e => setEditForm({...editForm, releaseCompany: e.target.value})} placeholder="Label..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Publisher (詞曲版權)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.publisher || ''} onChange={e => setEditForm({...editForm, publisher: e.target.value})} placeholder="Publisher Name..." />
                                    </div>

                                    {/* ADDED ISRC & UPC INPUTS */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">ISRC</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.isrc || ''} onChange={e => setEditForm({...editForm, isrc: e.target.value})} placeholder="ISRC..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">UPC</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.upc || ''} onChange={e => setEditForm({...editForm, upc: e.target.value})} placeholder="UPC..." />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">MusicBrainz ID</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.musicBrainzId || ''} onChange={e => setEditForm({...editForm, musicBrainzId: e.target.value})} placeholder="MBID..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Spotify Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.spotifyLink || ''} onChange={e => setEditForm({...editForm, spotifyLink: e.target.value})} placeholder="https://open.spotify.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">YouTube URL</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.youtubeUrl || ''} onChange={e => setEditForm({...editForm, youtubeUrl: e.target.value})} placeholder="https://youtube.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Apple Music Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.appleMusicLink || ''} onChange={e => setEditForm({...editForm, appleMusicLink: e.target.value})} placeholder="https://music.apple.com/..." />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">Smart Link (Universal / HyperFollow)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.smartLink || ''} onChange={e => setEditForm({...editForm, smartLink: e.target.value})} placeholder="https://distrokid.com/hyperfollow/..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Musixmatch Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.musixmatchUrl || ''} onChange={e => setEditForm({...editForm, musixmatchUrl: e.target.value})} placeholder="https://www.musixmatch.com/..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">DistroKid Backend URL (Admin Only)</label>
                                        <input className="w-full bg-black border border-slate-700 p-3 text-slate-400 text-xs font-mono" value={editForm.distrokidManageUrl || ''} onChange={e => setEditForm({...editForm, distrokidManageUrl: e.target.value})} placeholder="Private Management URL..." />
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-center">
                                        <button onClick={handleDelete} className="text-red-500 hover:text-white border border-red-900/50 hover:bg-red-900/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded">
                                            DELETE SONG (刪除作品)
                                        </button>
                                        <div className="flex gap-4">
                                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                                                Cancel
                                            </button>
                                            <button onClick={handleSave} disabled={isSaving} className="bg-brand-accent text-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">
                                                {isSaving ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                                {['isrc', 'upc', 'spotifyId', 'musicBrainzId', 'releaseCompany', 'publisher'].map(field => (
                                    <div key={field}>
                                        <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field === 'musicBrainzId' ? 'MusicBrainz ID' : field}</span>
                                        {field === 'musicBrainzId' && (song as any)[field] ? (
                                            <a href={`https://musicbrainz.org/recording/${(song as any)[field]}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-brand-gold hover:underline uppercase">
                                                {(song as any)[field]} ↗
                                            </a>
                                        ) : (
                                            <span className="font-mono text-[11px] text-slate-400 uppercase">{(song as any)[field] || 'UNDEFINED'}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Context & Story</h3>
                        {/* AI Button - Strictly Admin Only */}
                        {isAdmin && (
                            <button onClick={handleAiGenerate} disabled={loadingAi} className="text-[9px] border border-brand-accent/30 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all">
                                {loadingAi ? "Analyzing..." : "Generate AI Analysis (Admin)"}
                            </button>
                        )}
                    </div>
                    {/* EDITABLE DESCRIPTION */}
                    {isAdmin && isEditing ? (
                        <textarea 
                            className="w-full h-60 bg-black border border-white/10 p-4 text-white text-sm leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.description || ''}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                            placeholder="Enter description..."
                        />
                    ) : (
                        <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line tracking-wide">
                            {song.description || "Historical data not available."}
                        </div>
                    )}
                    {/* Only show AI review if it exists (Admin generated) */}
                    {aiReview && isAdmin && <div className="mt-8 p-6 bg-white/5 border-l-2 border-brand-gold text-xs text-slate-300 leading-loose italic">{aiReview}</div>}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">Lyric Archive</h3>
                    {/* EDITABLE LYRICS */}
                    {isAdmin && isEditing ? (
                        <textarea 
                            className="w-full h-80 bg-black border border-white/10 p-4 text-white text-xs font-mono leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.lyrics || ''}
                            onChange={e => setEditForm({...editForm, lyrics: e.target.value})}
                            placeholder="Paste lyrics here..."
                        />
                    ) : (
                        <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose tracking-[0.1em] border-l border-white/5 pl-8">{song.lyrics || "No transcripts found."}</div>
                    )}
                </div>
            </div>
            <div className="space-y-8">
                <div className="bg-slate-900 p-8 border border-white/5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Credits</h3>
                    {/* EDITABLE CREDITS */}
                    {isAdmin && isEditing ? (
                         <textarea 
                            className="w-full h-60 bg-black border border-white/10 p-4 text-white text-xs font-mono leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.credits || ''}
                            onChange={e => setEditForm({...editForm, credits: e.target.value})}
                            placeholder="Credits..."
                        />
                    ) : (
                        <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">
                            {song.credits || "Production team undisclosed."}
                        </div>
                    )}
                    
                    {/* Automated Copyright Footer */}
                    <div className="mt-8 pt-8 border-t border-white/5 text-[9px] text-slate-600 font-mono leading-relaxed space-y-1">
                        <p>℗ {new Date(song.releaseDate).getFullYear()} {song.releaseCompany || 'Willwi Music'}</p>
                        <p>© {new Date(song.releaseDate).getFullYear()} {song.publisher || song.releaseCompany || 'Willwi Music'}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;