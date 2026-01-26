
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong } = useData(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerActive, setIsPlayerActive] = useState(false);

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

  const albumTracks = useMemo(() => {
    if (!song) return [];
    if (!song.upc) return [song];
    const normalizedUpc = (song.upc || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
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
        setIsPlayerActive(false);
    } else {
        const url = resolveDirectLink(track.audioUrl || track.dropboxUrl || '');
        if (!url) return alert("此曲目尚未配置音訊");
        setActiveTrackId(track.id);
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlayerActive(true);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (!song) return null;

  return (
    <div className="min-h-screen bg-black relative flex flex-col overflow-hidden">
      
      {/* Immersive Background - Prioritize Video if available */}
      <div className="absolute inset-0 z-0">
          {activeTrack?.videoUrl ? (
             <video 
               src={resolveDirectLink(activeTrack.videoUrl)} 
               autoPlay loop muted playsInline 
               className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[20px]" 
             />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-[100px] scale-125 transition-all duration-[3000ms]"
              style={{ backgroundImage: `url(${activeTrack?.coverUrl})` }}
            ></div>
          )}
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col md:flex-row pt-40 px-10 md:px-24 gap-16 md:gap-32">
          
          {/* Left: Art & Tracklist */}
          <div className="w-full md:w-[400px] space-y-16 animate-fade-in shrink-0">
              <div className="aspect-square w-full bg-slate-900 border border-white/10 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative group">
                  <img src={activeTrack?.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[8s]" alt="" />
              </div>

              <div className="space-y-10">
                  <div className="flex justify-between items-end border-b border-white/10 pb-6">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Album Tracks</h3>
                      <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest">{albumTracks.length} Items</span>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                      {albumTracks.map((track, idx) => (
                          <div 
                            key={track.id} 
                            onClick={() => handlePlay(track)}
                            className={`group flex items-center justify-between p-4 cursor-pointer transition-all border-l-2 ${activeTrackId === track.id ? 'bg-white/5 border-brand-gold' : 'border-transparent hover:bg-white/[0.02] hover:border-white/20'}`}
                          >
                             <div className="flex items-center gap-6">
                                <span className={`text-[10px] font-mono ${activeTrackId === track.id ? 'text-brand-gold' : 'text-slate-600'}`}>{(idx+1).toString().padStart(2, '0')}</span>
                                <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${activeTrackId === track.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{track.title}</span>
                             </div>
                             {activeTrackId === track.id && isPlayerActive && (
                                 <div className="flex gap-1 items-end h-3">
                                    <div className="w-0.5 h-full bg-brand-gold animate-bounce"></div>
                                    <div className="w-0.5 h-2/3 bg-brand-gold animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-0.5 h-1/2 bg-brand-gold animate-bounce [animation-delay:0.4s]"></div>
                                 </div>
                             )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Right: Detailed Info & Lyrics */}
          <div className="flex-1 space-y-24 animate-fade-in-up [animation-delay:0.3s] pb-40">
              <div className="space-y-8">
                  <div className="flex items-center gap-6">
                      <div className="w-12 h-[1px] bg-brand-gold"></div>
                      <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.6em]">{activeTrack?.releaseCompany || activeTrack?.projectType}</span>
                  </div>
                  <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-none">{activeTrack?.title}</h1>
                  <div className="flex flex-wrap items-center gap-8 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Release Date</span>
                        <span className="text-sm font-black text-white">{activeTrack?.releaseDate}</span>
                      </div>
                      <div className="w-[1px] h-8 bg-white/10"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">ISRC</span>
                        <span className="text-sm font-mono text-slate-300 tracking-wider">{activeTrack?.isrc || 'NO ISRC'}</span>
                      </div>
                      {activeTrack?.publisher && (
                        <>
                          <div className="w-[1px] h-8 bg-white/10"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Publisher</span>
                            <span className="text-sm font-black text-white">{activeTrack?.publisher}</span>
                          </div>
                        </>
                      )}
                  </div>
              </div>

              {/* Lyrics Block */}
              <div className="space-y-16">
                  <div className="flex items-center gap-12 border-b border-white/5 pb-8">
                      <button onClick={() => setLyricsView('original')} className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${lyricsView === 'original' ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                        Lyrics
                        {lyricsView === 'original' && <div className="absolute -bottom-8 left-0 w-full h-1 bg-brand-gold"></div>}
                      </button>
                      <button onClick={() => setLyricsView('translated')} className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${lyricsView === 'translated' ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                        Translation
                        {lyricsView === 'translated' && <div className="absolute -bottom-8 left-0 w-full h-1 bg-brand-gold"></div>}
                      </button>
                      <Link to="/interactive" className="ml-auto flex items-center gap-3 group">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold group-hover:text-white transition-colors">Start Interactive Session</span>
                        <div className="w-8 h-8 rounded-full border border-brand-gold flex items-center justify-center group-hover:bg-brand-gold group-hover:text-black transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                      </Link>
                  </div>

                  <div className="max-w-4xl">
                      <pre className="text-3xl md:text-5xl font-black uppercase leading-tight text-white/80 whitespace-pre-wrap font-sans tracking-tight cinema-lyrics-blur">
                        {lyricsView === 'original' ? activeTrack?.lyrics : (activeTrack?.translations?.[lang]?.lyrics || activeTrack?.lyrics)}
                      </pre>
                  </div>

                  {activeTrack?.credits && (
                      <div className="pt-24 border-t border-white/5">
                          <h4 className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-8">Production Credits</h4>
                          <pre className="text-xs font-mono text-slate-500 leading-loose uppercase tracking-widest whitespace-pre-wrap">
                            {activeTrack?.credits}
                          </pre>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Persistent Mini Player at Bottom */}
      <div className={`fixed bottom-0 left-0 w-full z-[100] transition-transform duration-700 bg-black/80 backdrop-blur-3xl border-t border-white/10 ${isPlayerActive ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-screen-2xl mx-auto px-10 h-24 flex items-center justify-between">
              <div className="flex items-center gap-6 w-1/3">
                  <img src={activeTrack?.coverUrl} className="w-12 h-12 rounded-sm border border-white/5" />
                  <div className="overflow-hidden">
                    <span className="block text-xs font-black uppercase tracking-widest text-white truncate">{activeTrack?.title}</span>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase truncate">{activeTrack?.projectType}</span>
                  </div>
              </div>
              <div className="flex flex-col items-center gap-3 w-1/3">
                  <div className="flex items-center gap-8">
                      <button className="text-slate-600 hover:text-white transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
                      <button onClick={() => { if(audioRef.current) isPlayerActive ? audioRef.current.pause() : audioRef.current.play(); setIsPlayerActive(!isPlayerActive); }} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold transition-all">
                        {isPlayerActive ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                      <button className="text-slate-600 hover:text-white transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 18h2V6h-2zM14.5 12l-8.5 6V6z"/></svg></button>
                  </div>
                  <div className="w-full max-w-md flex items-center gap-4">
                      <span className="text-[9px] font-mono text-slate-500">{formatTime(currentTime)}</span>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer">
                          <div className="absolute h-full bg-brand-gold transition-all" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">{formatTime(duration)}</span>
                  </div>
              </div>
              <div className="w-1/3 flex justify-end gap-6 items-center">
                  <button onClick={() => setIsPlayerActive(false)} className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest">Minimize</button>
              </div>
          </div>
      </div>

      <audio 
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlayerActive(false)}
        crossOrigin="anonymous"
      />
    </div>
  );
}; export default SongDetail;
