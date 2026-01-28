
import React, { useState, useEffect, useMemo } from 'react';
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

  if (!song) return <div className="min-h-screen flex items-center justify-center bg-black"><span className="text-brand-gold animate-pulse font-black uppercase">Searching...</span></div>;

  const cover = song.coverUrl || globalSettings.defaultCoverUrl;
  const isCurrentPlaying = currentSong?.id === song.id;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        <div className="absolute inset-0 z-[-1]">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-20 scale-125" style={{ backgroundImage: `url(${cover})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020617]/90 to-[#020617]"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] font-black transition-all">← BACK TO CATALOG</Link>
                <div className="flex flex-wrap gap-4">
                    {isAdmin && (
                        <button 
                            onClick={() => playSong(song)} 
                            className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isCurrentPlaying && isPlaying ? 'bg-brand-gold text-black' : 'bg-white text-black hover:bg-brand-gold'}`}
                        >
                            {isCurrentPlaying && isPlaying ? 'DIAGNOSTIC ACTIVE' : 'TEST STREAM (ADMIN)'}
                        </button>
                    )}
                    
                    {song.isInteractiveActive ? (
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
                <div className="lg:col-span-5 space-y-12">
                    <div className="relative group">
                        <img src={cover} className="w-full aspect-square object-cover rounded shadow-2xl border border-white/10 transition-transform duration-[2s] group-hover:scale-[1.02]" alt="" />
                        <div className="absolute inset-0 border border-white/10 rounded pointer-events-none"></div>
                    </div>
                    
                    {/* Spotify Embed Player Section */}
                    {spotifyId && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em] flex items-center gap-3">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.673.464-1.027.249-2.85-1.741-6.439-2.134-10.665-1.168-.405.093-.811-.16-.904-.565-.093-.404.16-.811.565-.904 4.634-1.06 8.59-.61 11.782 1.339.354.215.465.673.249 1.027zm1.464-3.26c-.271.44-.847.579-1.287.308-3.262-2.004-8.235-2.586-12.093-1.414-.495.15-1.023-.129-1.173-.624-.15-.495.129-1.023.624-1.173 4.414-1.34 9.904-.683 13.621 1.595.44.27.579.847.308 1.287zm.126-3.41c-3.913-2.324-10.366-2.538-14.128-1.396-.6.182-1.23-.16-1.412-.76-.182-.6.16-1.23.76-1.412 4.316-1.31 11.439-1.056 15.952 1.623.54.32.716 1.014.396 1.554-.32.54-1.014.716-1.554.396z"/>
                                    </svg>
                                    Streaming Access
                                </h3>
                                {song.spotifyLink && (
                                    <a 
                                        href={song.spotifyLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black text-slate-500 hover:text-emerald-500 uppercase tracking-widest transition-colors flex items-center gap-2"
                                    >
                                        Open App <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                )}
                            </div>
                            
                            <div className="w-full overflow-hidden rounded-xl shadow-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md group relative">
                                <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                <iframe 
                                    style={{ borderRadius: '12px', background: 'transparent' }} 
                                    src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`} 
                                    width="100%" 
                                    height="152" 
                                    frameBorder="0" 
                                    allowFullScreen 
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                    loading="lazy"
                                    className="relative z-10"
                                ></iframe>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                    Full fidelity audio powered by Spotify
                                </p>
                                <a 
                                    href={song.spotifyLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 bg-[#1DB954] hover:bg-[#1ed760] text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-lg hover:scale-105 active:scale-95"
                                >
                                    Play on Spotify
                                </a>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Album Tracks</h3>
                            <span className="text-[10px] text-slate-600 font-mono">({albumTracks.length})</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, idx) => (
                                <div 
                                    key={track.id} 
                                    className={`flex items-center gap-6 p-4 border rounded-sm transition-all cursor-pointer group ${track.id === song.id ? 'bg-white/10 border-brand-gold/50 shadow-inner' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`} 
                                    onClick={() => navigate(`/song/${track.id}`)}
                                >
                                    <span className={`text-xs font-mono ${track.id === song.id ? 'text-brand-gold' : 'text-slate-600'}`}>
                                        {(idx+1).toString().padStart(2,'0')}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <h5 className={`text-sm font-bold uppercase truncate ${track.id === song.id ? 'text-white' : 'text-slate-300'}`}>
                                            {track.title}
                                        </h5>
                                    </div>
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); playSong(track); }} 
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-gold text-[10px] font-black"
                                        >
                                            TEST
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-20">
                    <div>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-widest">{song.releaseCategory || 'SINGLE'}</span>
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{song.releaseDate}</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-white leading-[0.85] break-words filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                            {displayTitle}
                        </h1>
                    </div>

                    {/* Lyrics Section */}
                    <div className="space-y-12">
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Lyrics 歌詞</h3>
                            {song.translations?.[lang]?.lyrics && (
                                <button onClick={() => setLyricsView(prev => prev === 'original' ? 'translated' : 'original')} className="text-[9px] font-black text-brand-gold uppercase tracking-widest hover:text-white transition-colors">
                                    {lyricsView === 'original' ? `VIEW ${lang.toUpperCase()}` : 'VIEW ORIGINAL'}
                                </button>
                            )}
                        </div>
                        <div className="text-base md:text-xl text-slate-300 leading-[2.2] whitespace-pre-line uppercase tracking-[0.2em] font-medium animate-fade-in">
                            {displayLyrics ? displayLyrics : <span className="opacity-20 italic font-light tracking-normal">[ LYRICS PENDING ARCHIVAL ]</span>}
                        </div>
                    </div>

                    {/* Credits Section */}
                    <div className="space-y-12 pt-20 border-t border-white/5">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Credits 製作名單</h3>
                        <div className="text-xs md:text-sm text-slate-400 leading-relaxed whitespace-pre-line font-mono tracking-wider opacity-80">
                            {song.credits ? song.credits : <span className="opacity-20 italic font-light tracking-normal">[ PRODUCTION CREDITS INFORMATION PENDING ]</span>}
                        </div>
                    </div>
                    
                    {song.creativeNote && (
                        <div className="pt-20 border-t border-white/5 space-y-8 opacity-80">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Creative Note 創作筆記</h4>
                            <p className="text-sm md:text-base text-slate-400 leading-relaxed tracking-wide font-light italic text-justify max-w-2xl">
                                {song.creativeNote}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
