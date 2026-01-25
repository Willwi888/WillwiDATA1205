
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong, setCurrentSong, setIsPlaying, isPlaying, currentSong } = useData(); 
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

  // 專輯邏輯：找出同 UPC 的所有曲目
  const albumTracks = useMemo(() => {
    if (!song) return [];
    if (!song.upc) return [song];
    
    const normalizedUpc = song.upc.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return songs.filter(s => {
      const sUpc = (s.upc || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return sUpc === normalizedUpc;
    }).sort((a, b) => {
        // 預設按標題或自定義邏輯排序
        return a.title.localeCompare(b.title);
    });
  }, [song, songs]);

  const displayTitle = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.title) || song.title;
  }, [song, lyricsView, lang]);

  const displayLyrics = useMemo(() => {
      if (!song) return '';
      return (lyricsView === 'translated' && song.translations?.[lang]?.lyrics) || song.lyrics;
  }, [song, lyricsView, lang]);

  const handlePlayTrack = (track: Song) => {
    if (currentSong?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(track);
      setIsPlaying(true);
    }
  };

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-brand-gold animate-pulse font-black tracking-widest uppercase">Searching Catalog...</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black overflow-x-hidden">
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-10 scale-125 transition-all duration-1000" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"></div>
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
                {/* 左側：專輯曲目清單 */}
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
                                <div 
                                    key={track.id} 
                                    onClick={() => handlePlayTrack(track)}
                                    className={`flex items-center gap-6 p-5 border transition-all cursor-pointer group rounded-sm ${currentSong?.id === track.id ? 'bg-brand-gold/10 border-brand-gold/50' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                        {currentSong?.id === track.id && isPlaying ? (
                                            <div className="flex gap-1 items-end h-4">
                                                <div className="w-1 bg-brand-gold animate-[bounce_1.2s_infinite_0.1s]"></div>
                                                <div className="w-1 bg-brand-gold animate-[bounce_1.2s_infinite_0.3s]"></div>
                                                <div className="w-1 bg-brand-gold animate-[bounce_1.2s_infinite_0.5s]"></div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-mono text-slate-600 group-hover:text-brand-gold">{(index + 1).toString().padStart(2, '0')}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className={`text-sm font-bold uppercase truncate tracking-widest ${currentSong?.id === track.id ? 'text-brand-gold' : 'text-white'}`}>{track.title}</h5>
                                        <p className="text-[9px] text-slate-500 font-mono mt-1">{track.isrc}</p>
                                    </div>
                                    <button className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${currentSong?.id === track.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white/40 group-hover:border-white/40 group-hover:text-white'}`}>
                                        {currentSong?.id === track.id && isPlaying ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 外連按鈕 */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        {song.spotifyLink && <a href={song.spotifyLink} target="_blank" className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all">Spotify</a>}
                        {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" className="p-4 bg-red-600/10 border border-red-600/20 text-[10px] font-black uppercase text-center text-red-600 hover:bg-red-600 hover:text-white transition-all">YouTube</a>}
                    </div>
                </div>

                {/* 右側：歌詞資訊 */}
                <div className="lg:col-span-7 space-y-16">
                    <div>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-widest">{song.releaseCategory || 'SINGLE'}</span>
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{song.releaseDate}</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-8">{displayTitle}</h1>
                    </div>

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
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
