
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
          // Auto switch to translation if available and current lang is not original
          if (lang !== 'zh' && found.translations?.[lang]?.lyrics) {
              setLyricsView('translated');
          }
      }
    }
  }, [id, getSong, lang]);

  const displayTitle = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.title) || song.title;
  }, [song, lyricsView, lang]);

  const displayLyrics = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.lyrics) || song.lyrics;
  }, [song, lyricsView, lang]);

  if (!song) return null;

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black">
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-10 scale-125 transition-all duration-1000" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16 flex justify-between items-center">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] transition-all font-black">
                    ← BACK TO CATALOG
                </Link>
                {song.isInteractiveActive && (
                    <button onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} className="bg-brand-gold text-black px-10 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                        ENTER STUDIO
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-5 space-y-12">
                    <div className="aspect-square bg-slate-900 border border-white/10 shadow-2xl overflow-hidden rounded-sm group">
                        <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {song.spotifyLink && <a href={song.spotifyLink} target="_blank" className="p-4 bg-white/5 border border-white/10 text-[9px] font-black uppercase text-center hover:bg-emerald-500 hover:text-black transition-all">Spotify</a>}
                        {song.appleMusicLink && <a href={song.appleMusicLink} target="_blank" className="p-4 bg-white/5 border border-white/10 text-[9px] font-black uppercase text-center hover:bg-rose-500 hover:text-black transition-all">Apple Music</a>}
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-16">
                    <div>
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white leading-none mb-6">{displayTitle}</h1>
                        <div className="flex gap-6 text-slate-500 font-mono text-[10px] tracking-widest uppercase">
                            <span>{song.isrc}</span>
                            <span className="text-brand-gold">{song.language}</span>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[1em]">Lyrics 歌詞</h3>
                            {song.translations?.[lang] && (
                                <div className="flex bg-white/5 rounded-sm p-1">
                                    <button onClick={() => setLyricsView('original')} className={`px-4 py-1 text-[8px] font-black rounded-sm transition-all ${lyricsView === 'original' ? 'bg-brand-gold text-black' : 'text-slate-500'}`}>ORIGINAL</button>
                                    <button onClick={() => setLyricsView('translated')} className={`px-4 py-1 text-[8px] font-black rounded-sm transition-all ${lyricsView === 'translated' ? 'bg-brand-gold text-black' : 'text-slate-500'}`}>{lang.toUpperCase()}</button>
                                </div>
                            )}
                        </div>
                        <div className="text-sm text-slate-300 leading-[2.5] whitespace-pre-line uppercase tracking-[0.2em] max-h-[500px] overflow-y-auto custom-scrollbar pr-6">
                            {displayLyrics || 'NO LYRICS AVAILABLE'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
