
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong, setCurrentSong, currentSong, isPlaying, setIsPlaying } = useData(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) {
          setSong(found);
          setActiveTrackId(found.id);
      }
    }
  }, [id, getSong]);

  // 獲取該專輯（UPC）下的所有曲目
  const albumTracks = useMemo(() => {
    if (!song) return [];
    if (!song.upc) return [song];
    const normalizedUpc = song.upc.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return songs.filter(s => {
      const sUpc = (s.upc || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
      return sUpc === normalizedUpc;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [song, songs]);

  const activeTrack = useMemo(() => {
      return albumTracks.find(t => t.id === activeTrackId) || song;
  }, [albumTracks, activeTrackId, song]);

  const handlePlay = (track: Song) => {
    if (!audioRef.current) return;
    
    if (activeTrackId === track.id && !audioRef.current.paused) {
        audioRef.current.pause();
    } else {
        const url = resolveDirectLink(track.audioUrl || track.dropboxUrl || '');
        if (!url) {
            alert("此曲目尚未配置音訊連結");
            return;
        }
        setActiveTrackId(track.id);
        audioRef.current.src = url;
        audioRef.current.play();
    }
  };

  if (!song) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-brand-gold animate-pulse font-black tracking-widest uppercase">Catalog Sync...</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-60 pt-48 px-6 md:px-24 animate-fade-in relative bg-black">
        <audio ref={audioRef} crossOrigin="anonymous" />
        
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-10 scale-125" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"></div>
        </div>

        <div className="max-w-[1700px] mx-auto">
            <div className="mb-16">
                <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-[0.5em] transition-all font-black flex items-center gap-4">
                    <span className="text-lg">←</span> BACK TO CATALOG
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                {/* 左側：專輯封面與曲目清單 */}
                <div className="lg:col-span-5 space-y-12">
                    <div className="aspect-square bg-slate-900 border border-white/10 shadow-2xl overflow-hidden rounded-sm group">
                        <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[5s]" alt="" />
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <h3 className="text-[11px] font-black text-brand-gold uppercase tracking-[0.6em]">Album Tracklist</h3>
                            <span className="text-[9px] text-slate-600 font-mono">UPC: {song.upc || 'N/A'}</span>
                        </div>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            {albumTracks.map((track, index) => (
                                <div 
                                    key={track.id} 
                                    onClick={() => setActiveTrackId(track.id)}
                                    className={`flex items-center gap-6 p-5 rounded-sm cursor-pointer transition-all border ${activeTrackId === track.id ? 'bg-brand-gold/10 border-brand-gold/50' : 'bg-white/[0.02] border-transparent hover:bg-white/5'}`}
                                >
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${activeTrackId === track.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20 text-white hover:border-brand-gold'}`}
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h5 className={`text-sm font-black uppercase truncate tracking-widest ${activeTrackId === track.id ? 'text-brand-gold' : 'text-white'}`}>{track.title}</h5>
                                        <p className="text-[9px] text-slate-500 font-mono mt-1">{track.isrc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {activeTrack?.spotifyLink && <a href={activeTrack.spotifyLink} target="_blank" className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase text-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all">Spotify</a>}
                        {activeTrack?.youtubeUrl && <a href={activeTrack.youtubeUrl} target="_blank" className="p-4 bg-red-600/10 border border-red-600/20 text-[10px] font-black uppercase text-center text-red-600 hover:bg-red-600 hover:text-white transition-all">YouTube</a>}
                    </div>
                </div>

                {/* 右側：歌詞與詳細資料 */}
                <div className="lg:col-span-7 space-y-16">
                    <div className="animate-fade-in" key={activeTrack?.id}>
                        <div className="flex items-center gap-6 mb-8">
                            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-widest">{activeTrack?.language || 'CORE'}</span>
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{activeTrack?.releaseDate}</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white leading-none mb-4">{activeTrack?.title}</h1>
                        <p className="text-brand-gold/60 text-xs font-black uppercase tracking-[0.5em]">{activeTrack?.isrc}</p>
                    </div>

                    <div className="space-y-12">
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-[0.6em]">Lyrics 歌詞內容</h3>
                            <div className="flex gap-4">
                               <button onClick={() => setLyricsView('original')} className={`text-[10px] font-black uppercase tracking-widest ${lyricsView === 'original' ? 'text-brand-gold' : 'text-slate-500'}`}>Original</button>
                               <button onClick={() => setLyricsView('translated')} className={`text-[10px] font-black uppercase tracking-widest ${lyricsView === 'translated' ? 'text-brand-gold' : 'text-slate-500'}`}>Translation</button>
                            </div>
                        </div>
                        <div className="text-base md:text-lg text-slate-300 leading-[2.8] whitespace-pre-line uppercase tracking-[0.2em] max-h-[600px] overflow-y-auto custom-scrollbar pr-10 font-medium animate-fade-in" key={`${activeTrack?.id}-${lyricsView}`}>
                            {lyricsView === 'original' ? activeTrack?.lyrics : (activeTrack?.translations?.[lang]?.lyrics || 'NO TRANSLATION')}
                            {!activeTrack?.lyrics && <p className="text-slate-700 italic">No lyrics provided in database</p>}
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/5 space-y-6">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Credits 製作名單</h3>
                         <p className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-line">
                            {activeTrack?.credits || '© WILLWI MUSIC. ALL RIGHTS RESERVED.'}
                         </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}; export default SongDetail;
