
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong } = useData(); 
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

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-brand-gold animate-pulse font-black tracking-widest uppercase">Searching Catalog...</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        {/* Cinema Player 2.0 Static Backdrop */}
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-20 scale-125 transition-all duration-1000 animate-studio-breathe" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020617]/90 to-[#020617]"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex justify-between items-center">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] transition-all font-black flex items-center gap-4">
                    <span className="text-lg">←</span> BACK TO CATALOG
                </Link>
                {song.isInteractiveActive && (
                    <button onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} className="bg-brand-gold text-black px-10 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">
                        OPEN STUDIO
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-5 space-y-12">
                    <div className="aspect-square bg-slate-900 border border-white/10 shadow-2xl overflow-hidden rounded-sm group relative">
                        <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[5s]" alt="" />
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Album Tracks ({albumTracks.length})</h3>
                            <span className="text-[9px] text-slate-600 font-mono">{song.upc}</span>
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-6 p-5 border border-white/5 bg-white/[0.02] rounded-sm hover:border-brand-gold/30 transition-all cursor-pointer" onClick={() => navigate(`/song/${track.id}`)}>
                                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-mono text-slate-600">{(index + 1).toString().padStart(2, '0')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold uppercase truncate tracking-widest text-white">{track.title}</h5>
                                        <p className="text-[9px] text-slate-500 font-mono mt-1">{track.isrc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        {song.spotifyLink && <a href={song.spotifyLink} target="_blank" className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all">Spotify</a>}
                        {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" className="p-4 bg-red-600/10 border border-red-600/20 text-[10px] font-black uppercase text-center text-red-600 hover:bg-red-600 hover:text-white transition-all">YouTube</a>}
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
