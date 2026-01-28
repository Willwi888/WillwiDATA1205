
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong, globalSettings, playSong, currentSong, isPlaying } = useData(); 
  const { isAdmin } = useUser(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');
  const [activeLine, setActiveLine] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) {
          setSong(found);
          if (lang !== 'zh' && found.translations?.[lang]?.lyrics) setLyricsView('translated');
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

  const spotifyId = useMemo(() => {
      if (!song?.spotifyLink) return null;
      const match = song.spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
  }, [song]);

  const displayTitle = (lyricsView === 'translated' && song?.translations?.[lang]?.title) || song?.title;
  const displayLyrics = (lyricsView === 'translated' && song?.translations?.[lang]?.lyrics) || song?.lyrics;
  const lyricsLines = useMemo(() => displayLyrics ? displayLyrics.split('\n') : [], [displayLyrics]);

  if (!song) return <div className="min-h-screen flex items-center justify-center bg-black"><span className="text-brand-gold animate-pulse font-black uppercase">Searching...</span></div>;

  const cover = song.coverUrl || globalSettings.defaultCoverUrl;
  const isCurrentPlaying = currentSong?.id === song.id;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        {/* Cinema Player 2.0: Dynamic Background Gradient */}
        <div className="fixed inset-0 z-[-1]">
            <div 
                className="absolute inset-0 bg-cover bg-center blur-[150px] opacity-30 scale-150 transition-all duration-[5s] animate-pulse-glow" 
                style={{ backgroundImage: `url(${cover})` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/80 to-black"></div>
            <div className="absolute inset-0 studio-ambient-glow opacity-40"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] font-black transition-all">← CATALOG</Link>
                <div className="flex flex-wrap gap-4">
                    {isAdmin && (
                        <button 
                            onClick={() => playSong(song)} 
                            className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isCurrentPlaying && isPlaying ? 'bg-brand-gold text-black' : 'bg-white text-black hover:bg-brand-gold'}`}
                        >
                            {isCurrentPlaying && isPlaying ? 'DIAGNOSTIC ACTIVE' : 'TEST STREAM'}
                        </button>
                    )}
                    
                    {song.isInteractiveActive || isAdmin ? (
                        <button 
                            onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} 
                            className="bg-brand-accent text-black px-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl"
                        >
                            ENTER STUDIO
                        </button>
                    ) : (
                         <div className="px-6 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">STUDIO CLOSED</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                {/* Visual Section */}
                <div className="lg:col-span-5 space-y-12">
                    <div className="relative group">
                        <img src={cover} className="w-full aspect-square object-cover rounded shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 transition-transform duration-[3s] group-hover:scale-[1.02]" alt="" />
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-gold/10 blur-3xl rounded-full"></div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Streaming Access</h3>
                        </div>

                        {spotifyId ? (
                            <div className="space-y-6 animate-fade-in group bg-white/[0.02] p-8 border border-white/5">
                                <iframe 
                                    style={{ borderRadius: '8px' }} 
                                    src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`} 
                                    width="100%" 
                                    height="152" 
                                    frameBorder="0" 
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                    loading="lazy"
                                ></iframe>
                                <a 
                                    href={song.spotifyLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block w-full py-4 bg-[#1DB954] text-white text-[10px] font-black uppercase tracking-[0.4em] rounded text-center transition-all hover:bg-[#1ed760] shadow-xl"
                                >
                                    OPEN ON SPOTIFY
                                </a>
                            </div>
                        ) : (
                            <div className="p-12 border border-white/5 bg-white/[0.01] text-center">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Resource Pending</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Narrative & Cinema Lyrics */}
                <div className="lg:col-span-7 space-y-20">
                    <div>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-widest">{song.releaseCategory || 'SINGLE'}</span>
                            <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">{song.releaseDate}</span>
                            {song.upc && <span className="text-slate-700 text-[9px] font-mono font-bold">UPC: {song.upc}</span>}
                        </div>
                        <h1 className="text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-white leading-[0.85] break-words">
                            {displayTitle}
                        </h1>
                    </div>

                    {/* Dynamic Lyrics Engine */}
                    <div className="space-y-12">
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Lyrics 歌詞</h3>
                            {song.translations?.[lang]?.lyrics && (
                                <button onClick={() => setLyricsView(prev => prev === 'original' ? 'translated' : 'original')} className="text-[9px] font-black text-brand-gold uppercase tracking-widest hover:text-white transition-colors">
                                    {lyricsView === 'original' ? `VIEW ${lang.toUpperCase()}` : 'VIEW ORIGINAL'}
                                </button>
                            )}
                        </div>
                        <div className="relative space-y-6">
                            {lyricsLines.length > 0 ? (
                                lyricsLines.map((line, idx) => (
                                    <p 
                                        key={idx}
                                        className={`text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-[0.1em] transition-all duration-700 ${idx === activeLine ? 'text-white opacity-100' : 'text-slate-800 opacity-20 blur-[2px] hover:blur-0 hover:opacity-40 cursor-pointer'}`}
                                        onClick={() => setActiveLine(idx)}
                                    >
                                        {line}
                                    </p>
                                ))
                            ) : (
                                <p className="text-slate-800 text-sm uppercase tracking-widest italic">[ ARCHIVAL IN PROGRESS ]</p>
                            )}
                        </div>
                    </div>

                    {/* The Storyline: Creative Note & Lab Log */}
                    <div className="pt-20 border-t border-white/5 space-y-24">
                        {song.creativeNote && (
                            <div className="space-y-8 animate-fade-in">
                                <h4 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.4em]">Creative Note 創作筆記</h4>
                                <p className="text-base md:text-xl text-slate-300 leading-relaxed font-light italic max-w-2xl border-l border-brand-gold/30 pl-8">
                                    {song.creativeNote}
                                </p>
                            </div>
                        )}
                        
                        {song.labLog && (
                            <div className="space-y-8 animate-fade-in opacity-60">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Lab Log 實驗室日誌</h4>
                                <div className="text-[11px] md:text-xs text-slate-400 font-mono tracking-wider leading-loose p-8 bg-white/[0.01] border border-white/5">
                                    {song.labLog}
                                </div>
                            </div>
                        )}

                        <div className="space-y-10">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Credits 製作名單</h3>
                            <div className="text-xs md:text-sm text-slate-500 leading-relaxed whitespace-pre-line font-mono opacity-80">
                                {song.credits || '[ CREDITS INFORMATION PENDING ]'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
