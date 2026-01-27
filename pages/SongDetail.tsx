
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const PlatformIcon = ({ name }: { name: string }) => {
    if (name === 'spotify') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>;
    if (name === 'apple') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.256 9.471c.882 3.033-1.605 5.922-3.896 5.584-3.567-.532-3.141-5.748.182-6.666 1.487-.411 3.25.109 3.714 1.082zm-9.98 4.793c1.996-2.583 2.502-6.526-.81-7.85-3.376-1.35-6.636 2.454-4.225 6.784 1.246 2.238 3.528 2.923 5.035 1.066zm8.851 5.679c-2.321 4.958-9.455 5.592-13.627 2.066-4.524-3.824-2.85-11.758 2.651-13.344 5.955-1.719 10.601 2.373 12.396 6.824.582 1.442.22 3.298-1.42 4.454zm-14.755-7.81c.216-4.135 4.312-6.551 7.42-4.996 3.109 1.554 3.791 6.221.725 8.783-3.035 2.535-7.957.575-8.145-3.787z"/></svg>;
    if (name === 'youtube') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>;
    if (name === 'tidal') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 8.036l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571-3.572l-3.572-3.571-3.571 3.571 3.571 3.571 3.572-3.571zm7.143 3.572l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571 3.571l-3.571-3.571-3.572 3.571 3.572 3.571 3.571-3.571zm3.571 3.571l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm7.143 0l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571z"/></svg>;
    return null;
}

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong, globalSettings, playSong, currentSong, isPlaying, setIsPlaying } = useData(); 
  const { isAdmin } = useUser(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');

  // Local sync for progress visualization in the Master Player
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) {
          setSong(found);
          if (lang !== 'zh' && found.translations?.[lang]?.lyrics) {
              setLyricsView('translated');
          }
      }
    }
  }, [id, getSong, lang]);

  // Handle local player seeking - this will talk to GlobalPlayer's audio element if possible
  // In this simplified version, we'll assume GlobalPlayer handles the heavy lifting
  // but we can simulate a more local feel.
  useEffect(() => {
    const timer = setInterval(() => {
        const audio = document.querySelector('audio');
        if (audio && currentSong?.id === song?.id) {
            setLocalProgress(audio.currentTime);
            setLocalDuration(audio.duration || 0);
        }
    }, 500);
    return () => clearInterval(timer);
  }, [currentSong, song]);

  const albumTracks = useMemo(() => {
    if (!song) return [];
    if (!song.upc) return [song];
    const normalizedUpc = song.upc.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return songs.filter(s => {
      const sUpc = (s.upc || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return sUpc === normalizedUpc;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [song, songs]);

  const displayTitle = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.title) || song.title;
  }, [song, lyricsView, lang]);

  const displayLyrics = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.lyrics) || song.lyrics;
  }, [song, lyricsView, lang]);

  // Fix for "Cannot find name 'spotifyTrackId'"
  const spotifyTrackId = useMemo(() => {
    if (!song?.spotifyLink) return null;
    const match = song.spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }, [song]);

  // Fix for "Cannot find name 'appleMusicEmbedUrl'"
  const appleMusicEmbedUrl = useMemo(() => {
    if (!song?.appleMusicLink) return null;
    return song.appleMusicLink.replace('music.apple.com', 'embed.music.apple.com');
  }, [song]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isCurrentPlaying = currentSong?.id === song?.id;

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-brand-gold animate-pulse font-black tracking-widest uppercase">Searching Catalog...</div>
    </div>
  );

  const cover = song.coverUrl || globalSettings.defaultCoverUrl;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        {/* Cinema Background Effect */}
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-20 scale-125 transition-all duration-1000 animate-studio-breathe" style={{ backgroundImage: `url(${cover})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020617]/90 to-[#020617]"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] transition-all font-black flex items-center gap-4">
                    <span className="text-lg">←</span> BACK TO CATALOG
                </Link>
                <div className="flex flex-wrap gap-4">
                    {/* 訪客按鈕：引導進入錄製室解鎖 */}
                    {song.isInteractiveActive ? (
                        <button 
                            onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} 
                            className="bg-brand-gold text-black px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)] flex items-center gap-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            ENTER STUDIO (解鎖製作)
                        </button>
                    ) : (
                         <div className="px-6 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                             STUDIO CLOSED
                         </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-5 space-y-12">
                    <div className="aspect-square bg-slate-900 border border-white/10 shadow-2xl overflow-hidden rounded-sm group relative">
                        <img src={cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[5s]" alt="" />
                        
                        {/* ADMIN MASTER MONITOR OVERLAY */}
                        {isAdmin && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8 backdrop-blur-[2px]">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-brand-gold uppercase tracking-[0.3em]">Master Digital Link</span>
                                            <p className="text-xs text-white font-mono truncate max-w-[200px]">{song.audioUrl || 'No Direct Link'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Format</span>
                                            <p className="text-xs text-white font-mono uppercase">24-Bit / 48kHz</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                            <span>{formatTime(localProgress)}</span>
                                            <span>{formatTime(localDuration)}</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 relative cursor-pointer group/bar" onClick={(e) => {
                                            const audio = document.querySelector('audio');
                                            if (audio && isCurrentPlaying) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const pct = x / rect.width;
                                                audio.currentTime = pct * audio.duration;
                                            }
                                        }}>
                                            <div className="h-full bg-brand-gold shadow-[0_0_10px_#fbbf24]" style={{ width: `${(localProgress / (localDuration || 1)) * 100}%` }}></div>
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-lg border-2 border-brand-gold" style={{ left: `${(localProgress / (localDuration || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-8">
                                        <button onClick={() => playSong(song)} className="w-16 h-16 rounded-full bg-brand-gold text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                                            {isCurrentPlaying && isPlaying ? (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                            ) : (
                                                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            )}
                                        </button>
                                    </div>
                                    
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.5em]">Admin Monitoring Console</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Album Tracks</h3>
                            <span className="text-[9px] text-slate-600 font-mono">{song.upc}</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-6 p-4 border border-white/5 bg-white/[0.02] rounded-sm hover:border-brand-gold/30 transition-all cursor-pointer group" onClick={() => navigate(`/song/${track.id}`)}>
                                    <span className="text-[10px] font-mono text-slate-600 group-hover:text-brand-gold">{(index + 1).toString().padStart(2, '0')}</span>
                                    <h5 className="flex-1 text-xs font-bold uppercase truncate tracking-widest text-white">{track.title}</h5>
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); playSong(track); }}
                                            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-brand-gold hover:text-black transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STREAMING CONSOLE */}
                    <div className="pt-10 animate-fade-in-up space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h4 className="text-[11px] text-brand-gold font-black uppercase tracking-[0.4em]">Streaming Console</h4>
                            <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">Digital Hub</span>
                        </div>
                        
                        <div className="space-y-10">
                            {spotifyTrackId && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 text-[#1DB954]"><PlatformIcon name="spotify" /></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Spotify Player</span>
                                        </div>
                                        <a href={song.spotifyLink} target="_blank" className="text-[8px] font-black text-slate-500 hover:text-white transition-colors uppercase">OPEN ↗</a>
                                    </div>
                                    <div className="w-full rounded-md overflow-hidden shadow-2xl border border-white/5 bg-[#121212]">
                                        <iframe 
                                            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`} 
                                            width="100%" 
                                            height="152" 
                                            frameBorder="0" 
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                            loading="lazy"
                                        ></iframe>
                                    </div>
                                </div>
                            )}
                            
                            {appleMusicEmbedUrl && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-5 h-5 text-[#FA243C]"><PlatformIcon name="apple" /></div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Apple Music</span>
                                    </div>
                                    <div className="w-full rounded-md overflow-hidden shadow-2xl border border-white/5">
                                        <iframe allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" frameBorder="0" height="150" style={{width:'100%', maxWidth:'100%', overflow:'hidden', background:'transparent'}} sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" src={appleMusicEmbedUrl}></iframe>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-20">
                    <div>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-widest">{song.releaseCategory || 'SINGLE'}</span>
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{song.releaseDate}</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-8">{displayTitle}</h1>
                    </div>
                    
                    {/* Storyline Section */}
                    {(song.creativeNote || song.labLog) && (
                        <div className="border-t border-b border-white/10 py-12 space-y-12 animate-fade-in">
                            <h3 className="text-[12px] font-black text-brand-gold uppercase tracking-[0.6em]">The Storyline</h3>
                            {song.creativeNote && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] text-white font-black uppercase tracking-widest opacity-50">Creative Note</h4>
                                    <p className="text-sm md:text-base text-slate-300 leading-loose whitespace-pre-line text-justify font-light tracking-wide">{song.creativeNote}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-12">
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Lyrics 歌詞</h3>
                            {song.translations?.[lang] && (
                                <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
                                    <button onClick={() => setLyricsView('original')} className={`px-6 py-1.5 text-[9px] font-black rounded-full transition-all ${lyricsView === 'original' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>ORIGINAL</button>
                                    <button onClick={() => setLyricsView('translated')} className={`px-6 py-1.5 text-[9px] font-black rounded-full transition-all ${lyricsView === 'translated' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>{lang.toUpperCase()}</button>
                                </div>
                            )}
                        </div>
                        <div className="text-base md:text-lg text-slate-300 leading-[2.8] whitespace-pre-line uppercase tracking-[0.2em] font-medium">
                            {displayLyrics || 'NO LYRICS AVAILABLE IN DATABASE'}
                        </div>

                        {song.credits && (
                            <div className="pt-12 border-t border-white/10">
                                <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em] mb-6">Credits</h3>
                                <div className="text-xs text-slate-600 leading-loose whitespace-pre-line font-mono uppercase tracking-widest">
                                    {song.credits}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; 

export default SongDetail;
