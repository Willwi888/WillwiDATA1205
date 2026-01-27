
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
            <div className="mb-16 flex justify-between items-center">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] font-black">← BACK TO CATALOG</Link>
                <div className="flex gap-4">
                    {/* 權限控制：僅管理員可在詳情頁進行播放測試 */}
                    {isAdmin && (
                        <button 
                            onClick={() => playSong(song)} 
                            className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isCurrentPlaying && isPlaying ? 'bg-brand-gold text-black' : 'bg-white text-black hover:bg-brand-gold'}`}
                        >
                            {isCurrentPlaying && isPlaying ? 'PLAYING TEST' : 'LISTEN (ADMIN ONLY)'}
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
                    <img src={cover} className="w-full aspect-square object-cover rounded shadow-2xl border border-white/10" alt="" />
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em] border-b border-white/10 pb-4">Album Tracks ({albumTracks.length})</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, idx) => (
                                <div key={track.id} className="flex items-center gap-6 p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group" onClick={() => navigate(`/song/${track.id}`)}>
                                    <span className="text-xs font-mono text-slate-600">{(idx+1).toString().padStart(2,'0')}</span>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold uppercase truncate text-white">{track.title}</h5>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={(e) => { e.stopPropagation(); playSong(track); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-gold text-[10px] font-black">PLAY</button>
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
                        <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter text-white leading-none">{displayTitle}</h1>
                    </div>
                    <div className="space-y-12">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em] border-b border-white/10 pb-6">Lyrics 歌詞</h3>
                        <div className="text-base md:text-lg text-slate-300 leading-relaxed whitespace-pre-line uppercase tracking-widest font-medium">
                            {displayLyrics || 'NO LYRICS AVAILABLE IN DATABASE'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
