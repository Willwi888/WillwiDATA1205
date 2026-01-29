
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

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) {
          setSong(found);
          if (lang !== 'zh' && found.translations?.[lang]?.lyrics) setLyricsView('translated');
      }
    }
  }, [id, getSong, lang]);

  const spotifyId = useMemo(() => {
      if (!song?.spotifyLink) return null;
      const match = song.spotifyLink.match(/track\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
  }, [song]);

  const displayTitle = (lyricsView === 'translated' && song?.translations?.[lang]?.title) || song?.title;
  const displayLyrics = (lyricsView === 'translated' && song?.translations?.[lang]?.lyrics) || song?.lyrics;
  const lyricsLines = useMemo(() => displayLyrics ? displayLyrics.split('\n') : [], [displayLyrics]);

  if (!song) return <div className="min-h-screen flex items-center justify-center bg-black"><span className="text-brand-gold animate-pulse font-medium uppercase tracking-widest">Finding Master Copy...</span></div>;

  const cover = song.coverUrl || globalSettings.defaultCoverUrl;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        <div className="fixed inset-0 z-[-1]">
            <div className="absolute inset-0 bg-cover bg-center blur-[150px] opacity-30 scale-150 animate-pulse-glow" style={{ backgroundImage: `url(${cover})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/80 to-black"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] font-medium transition-colors">← CATALOG</Link>
                <div className="flex gap-4">
                    {isAdmin && (
                        <button onClick={() => navigate(`/add?edit=${song.id}`)} className="px-8 py-3 text-[10px] font-medium uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all">EDIT TRACK</button>
                    )}
                    <button onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} className="bg-brand-accent text-black px-10 py-4 text-[11px] font-medium uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl">ENTER STUDIO</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-5 space-y-12">
                    <div className="relative group">
                        <img src={cover} className="w-full aspect-square object-cover rounded shadow-2xl border border-white/10" alt="" />
                    </div>
                    
                    {/* Spotify Embed Player */}
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-medium text-brand-gold uppercase tracking-[0.6em] opacity-80">Official Spotify Stream</h3>
                        {spotifyId ? (
                            <iframe 
                                style={{ borderRadius: '4px' }} 
                                src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`} 
                                width="100%" 
                                height="152" 
                                frameBorder="0" 
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                loading="lazy"
                            ></iframe>
                        ) : (
                            <div className="p-12 border border-white/5 bg-white/[0.01] text-center">
                                <span className="text-[10px] font-medium text-slate-700 uppercase tracking-[0.4em]">Spotify Link Pending</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-16">
                    <div>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-medium uppercase tracking-widest">{song.releaseCategory || 'SINGLE'}</span>
                            <span className="text-slate-500 text-[9px] font-mono">{song.releaseDate}</span>
                            {song.isrc && <span className="text-slate-700 text-[9px] font-mono opacity-60">ISRC: {song.isrc}</span>}
                        </div>
                        <h1 className="text-5xl md:text-8xl font-medium uppercase tracking-tighter text-white leading-[0.9] opacity-90">
                            {displayTitle}
                        </h1>
                    </div>

                    <div className="space-y-12">
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.6em]">Lyrics 歌詞</h3>
                        </div>
                        <div className="relative space-y-8">
                            {lyricsLines.length > 0 ? (
                                lyricsLines.map((line, idx) => (
                                    <p key={idx} className={`text-xl md:text-2xl font-normal uppercase tracking-[0.1em] transition-all duration-700 ${idx === activeLine ? 'text-white opacity-100' : 'text-slate-800 opacity-20'}`}>
                                        {line}
                                    </p>
                                ))
                            ) : (
                                <p className="text-slate-800 text-sm uppercase tracking-widest italic opacity-40">[ NO LYRICS DATA ]</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
