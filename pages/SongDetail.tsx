
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const PlatformIcon = ({ name }: { name: string }) => {
    if (name === 'spotify') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>;
    if (name === 'apple') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.256 9.471c.882 3.033-1.605 5.922-3.896 5.584-3.567-.532-3.141-5.748.182-6.666 1.487-.411 3.25.109 3.714 1.082zm-9.98 4.793c1.996-2.583 2.502-6.526-.81-7.85-3.376-1.35-6.636 2.454-4.225 6.784 1.246 2.238 3.528 2.923 5.035 1.066zm8.851 5.679c-2.321 4.958-9.455 5.592-13.627 2.066-4.524-3.824-2.85-11.758 2.651-13.344 5.955-1.719 10.601 2.373 12.396 6.824.582 1.442.22 3.298-1.42 4.454zm-14.755-7.81c.216-4.135 4.312-6.551 7.42-4.996 3.109 1.554 3.791 6.221.725 8.783-3.035 2.535-7.957.575-8.145-3.787z"/></svg>;
    if (name === 'youtube') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>;
    if (name === 'tidal') return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 8.036l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571-3.572l-3.572-3.571-3.571 3.571 3.571 3.571 3.572-3.571zm7.143 3.572l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571 3.571l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm3.571 3.571l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm7.143 0l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571z"/></svg>;
    return null;
}

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong, globalSettings, playSong, currentSong, isPlaying } = useData(); 
  const { isAdmin } = useUser(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');

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

  // --- EMBED LOGIC ---
  const spotifyTrackId = useMemo(() => {
      if (!song?.spotifyLink) return null;
      const match = song.spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
  }, [song]);

  const appleMusicEmbedUrl = useMemo(() => {
      if (!song?.appleMusicLink) return null;
      return song.appleMusicLink.replace('music.apple.com', 'embed.music.apple.com');
  }, [song]);

  const youtubeVideoId = useMemo(() => {
      if (!song?.youtubeUrl) return null;
      const match = song.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
  }, [song]);

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-brand-gold animate-pulse font-black tracking-widest uppercase">Searching Catalog...</div>
    </div>
  );

  const cover = song.coverUrl || globalSettings.defaultCoverUrl;
  const isCurrentPlaying = currentSong?.id === song.id;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        {/* Cinema Player 2.0 Static Backdrop */}
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-20 scale-125 transition-all duration-1000 animate-studio-breathe" style={{ backgroundImage: `url(${cover})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020617]/90 to-[#020617]"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex justify-between items-center">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] transition-all font-black flex items-center gap-4">
                    <span className="text-lg">←</span> BACK TO CATALOG
                </Link>
                <div className="flex gap-4">
                    {/* LISTEN BUTTON: Admin Only */}
                    {isAdmin && (
                        <button 
                            onClick={() => playSong(song)} 
                            className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 ${isCurrentPlaying && isPlaying ? 'bg-white text-black' : 'border border-white/20 text-white hover:bg-white/10'}`}
                        >
                            {isCurrentPlaying && isPlaying ? (
                                <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> PLAYING (ADMIN)</>
                            ) : (
                                <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> TEST AUDIO (ADMIN)</>
                            )}
                        </button>
                    )}
                    
                    {/* STUDIO GATE */}
                    {song.isInteractiveActive ? (
                        <button 
                            onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} 
                            className="bg-brand-gold text-black px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)] flex items-center gap-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            ENTER STUDIO (解鎖收聽)
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
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Album Tracks ({albumTracks.length})</h3>
                            <span className="text-[9px] text-slate-600 font-mono">{song.upc}</span>
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-6 p-5 border border-white/5 bg-white/[0.02] rounded-sm hover:border-brand-gold/30 transition-all cursor-pointer group" onClick={() => navigate(`/song/${track.id}`)}>
                                    <div className="w-10 h-10 flex items-center justify-center shrink-0 text-slate-600 group-hover:text-brand-gold">
                                        <span className="text-xs font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold uppercase truncate tracking-widest text-white">{track.title}</h5>
                                        <p className="text-[9px] text-slate-500 font-mono mt-1">{track.isrc}</p>
                                    </div>
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); playSong(track); }}
                                            className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-brand-gold hover:text-black hover:border-brand-gold transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STREAMING CONSOLE: TIDAL-INSPIRED LIST AESTHETIC */}
                    <div className="pt-8 animate-fade-in-up space-y-6">
                        <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Streaming Console</h4>
                        
                        {/* 1. Embeds Area (Visual Priority) */}
                        <div className="space-y-4">
                            {spotifyTrackId && (
                                <div className="w-full rounded-sm overflow-hidden shadow-2xl border border-white/10">
                                    <iframe src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="bg-[#020617]"></iframe>
                                </div>
                            )}
                            {appleMusicEmbedUrl && (
                                <div className="w-full rounded-sm overflow-hidden shadow-2xl border border-white/10">
                                    <iframe allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" frameBorder="0" height="150" style={{width:'100%', maxWidth:'660px', overflow:'hidden', background:'transparent'}} sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" src={appleMusicEmbedUrl}></iframe>
                                </div>
                            )}
                            {youtubeVideoId && (
                                <div className="w-full aspect-video rounded-sm overflow-hidden shadow-2xl border border-white/10">
                                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${youtubeVideoId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                </div>
                            )}
                        </div>

                        {/* 2. Platform List (Clean TIDAL Style) */}
                        <div className="flex flex-col gap-2 mt-4">
                            {song.tidalUrl && (
                                <a href={song.tidalUrl} target="_blank" className="group flex items-center justify-between p-4 bg-[#0f172a]/50 border border-white/5 rounded-sm hover:border-white transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-white opacity-60 group-hover:opacity-100 transition-opacity"><PlatformIcon name="tidal" /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">TIDAL</span>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-white text-xs transition-colors">→</span>
                                </a>
                            )}
                            {song.spotifyLink && (
                                <a href={song.spotifyLink} target="_blank" className="group flex items-center justify-between p-4 bg-[#0f172a]/50 border border-white/5 rounded-sm hover:border-[#1DB954] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-white opacity-60 group-hover:opacity-100 group-hover:text-[#1DB954] transition-all"><PlatformIcon name="spotify" /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-[#1DB954] transition-colors">Spotify</span>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-[#1DB954] text-xs transition-colors">→</span>
                                </a>
                            )}
                            {song.appleMusicLink && (
                                <a href={song.appleMusicLink} target="_blank" className="group flex items-center justify-between p-4 bg-[#0f172a]/50 border border-white/5 rounded-sm hover:border-[#FA243C] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-white opacity-60 group-hover:opacity-100 group-hover:text-[#FA243C] transition-all"><PlatformIcon name="apple" /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-[#FA243C] transition-colors">Apple Music</span>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-[#FA243C] text-xs transition-colors">→</span>
                                </a>
                            )}
                            {song.youtubeUrl && (
                                <a href={song.youtubeUrl} target="_blank" className="group flex items-center justify-between p-4 bg-[#0f172a]/50 border border-white/5 rounded-sm hover:border-[#FF0000] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-white opacity-60 group-hover:opacity-100 group-hover:text-[#FF0000] transition-all"><PlatformIcon name="youtube" /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-[#FF0000] transition-colors">YouTube</span>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-[#FF0000] text-xs transition-colors">→</span>
                                </a>
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
                    
                    {/* THE STORYLINE */}
                    {(song.creativeNote || song.labLog) && (
                        <div className="border-t border-b border-white/10 py-12 space-y-12 animate-fade-in">
                            <h3 className="text-[12px] font-black text-brand-gold uppercase tracking-[0.6em]">The Storyline</h3>
                            {song.creativeNote && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] text-white font-black uppercase tracking-widest opacity-50">Creative Note (創作筆記)</h4>
                                    <p className="text-sm md:text-base text-slate-300 leading-loose whitespace-pre-line text-justify font-light tracking-wide">{song.creativeNote}</p>
                                </div>
                            )}
                            {song.labLog && (
                                <div className="space-y-4 pt-6">
                                    <h4 className="text-[10px] text-white font-black uppercase tracking-widest opacity-50">Lab Log (實驗室日誌)</h4>
                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-sm">
                                        <p className="text-xs text-slate-400 leading-loose whitespace-pre-line font-mono">{song.labLog}</p>
                                    </div>
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
                        <div className="text-base md:text-lg text-slate-300 leading-[2.8] whitespace-pre-line uppercase tracking-[0.2em] max-h-[600px] overflow-y-auto custom-scrollbar pr-10 font-medium">
                            {displayLyrics || 'NO LYRICS AVAILABLE IN DATABASE'}
                        </div>

                        {/* Credits Section */}
                        {song.credits && (
                            <div className="pt-12 border-t border-white/10 animate-fade-in-up">
                                <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em] mb-6">Credits (致謝)</h3>
                                <div className="text-xs text-slate-500 leading-loose whitespace-pre-line font-mono uppercase tracking-widest">
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
