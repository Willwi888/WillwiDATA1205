
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { songs, getSong } = useData(); 
  const { lang } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [lyricsView, setLyricsView] = useState<'original' | 'translated'>('original');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

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
    if (!song || !song.upc) return song ? [song] : [];
    const normalizedUpc = (song.upc || '').trim().toUpperCase();
    return songs.filter(s => (s.upc || '').trim().toUpperCase() === normalizedUpc)
                .sort((a, b) => a.title.localeCompare(b.title));
  }, [song, songs]);

  const activeTrack = useMemo(() => albumTracks.find(t => t.id === activeTrackId) || song, [albumTracks, activeTrackId, song]);

  const handlePlay = (track: Song) => {
    if (!audioRef.current) return;
    if (activeTrackId === track.id && !audioRef.current.paused) {
        audioRef.current.pause(); 
        setIsPlayerActive(false);
    } else {
        const url = resolveDirectLink(track.audioUrl || track.dropboxUrl || '');
        if (!url) return alert("AUDIO ASSET NOT CONFIGURED");
        setActiveTrackId(track.id);
        setIsBuffering(true);
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.error("Playback failed", e));
        setIsPlayerActive(true);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60); const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (!song) return null;

  return (
    <div className="min-h-screen bg-black relative flex flex-col overflow-hidden">
      
      {/* Cinema Player 2.0 Dynamic Background */}
      <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-[120px] scale-150 animate-pulse-glow" 
            style={{ backgroundImage: `url(${activeTrack?.coverUrl})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/90"></div>
          {/* Subtle noise overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col md:flex-row pt-48 px-10 md:px-24 gap-20 md:gap-40">
          <div className="w-full md:w-[450px] space-y-20 shrink-0">
              <div className="aspect-square w-full bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative group">
                  <img src={activeTrack?.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[15s] ease-out" alt="" />
                  {isBuffering && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-10 h-10 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin"></div>
                    </div>
                  )}
              </div>

              <div className="space-y-12">
                  <div className="flex justify-between items-end border-b border-white/5 pb-8">
                      <h3 className="text-[10px] font-thin text-slate-600 uppercase tracking-[0.6em]">Album Tracks</h3>
                      <span className="text-[9px] text-slate-800 font-mono tracking-widest">UPC: {activeTrack?.upc || 'N/A'}</span>
                  </div>
                  <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-6">
                      {albumTracks.map((track, idx) => (
                          <div key={track.id} onClick={() => handlePlay(track)} className={`group flex items-center justify-between py-6 px-4 cursor-pointer transition-all border-l-[0.5px] ${activeTrackId === track.id ? 'bg-white/[0.03] border-brand-gold' : 'border-transparent hover:bg-white/[0.01]'}`}>
                             <div className="flex items-center gap-8">
                                <span className={`text-[10px] font-mono ${activeTrackId === track.id ? 'text-brand-gold' : 'text-slate-700'}`}>{(idx+1).toString().padStart(2, '0')}</span>
                                <span className={`text-[11px] font-thin uppercase tracking-[0.2em] transition-colors ${activeTrackId === track.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{track.title}</span>
                             </div>
                             {activeTrackId === track.id && isPlayerActive && <div className="w-3 h-3 rounded-full bg-brand-gold animate-ping"></div>}
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="flex-1 space-y-32 animate-fade-in-up pb-60">
              <div className="space-y-12">
                  <div className="flex items-center gap-8">
                      <div className="w-20 h-[0.5px] bg-brand-gold opacity-30"></div>
                      <span className="text-brand-gold text-[10px] font-thin uppercase tracking-[0.8em]">{activeTrack?.releaseCompany || 'Independent'}</span>
                  </div>
                  <h1 className="text-7xl md:text-11xl font-thin text-white tracking-tighter uppercase leading-none animate-blur-shift">{activeTrack?.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-10 pt-6">
                      {activeTrack?.appleMusicLink && <a href={activeTrack.appleMusicLink} target="_blank" rel="noreferrer" className="px-10 py-3 border border-brand-gold/30 text-brand-gold text-[9px] font-thin uppercase tracking-[0.4em] hover:bg-brand-gold hover:text-black transition-all duration-700">Apple Music</a>}
                      {activeTrack?.spotifyLink && <a href={activeTrack.spotifyLink} target="_blank" rel="noreferrer" className="px-10 py-3 border border-white/10 text-white/40 text-[9px] font-thin uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all">Spotify</a>}
                      <div className="w-[0.5px] h-10 bg-white/5"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-600 font-thin uppercase tracking-[0.4em] mb-2">ISRC Code</span>
                        <span className="text-xs font-mono text-white tracking-widest">{activeTrack?.isrc || 'NOT_REGISTERED'}</span>
                      </div>
                  </div>
              </div>

              <div className="space-y-24">
                  <div className="flex items-center gap-16 border-b border-white/5 pb-10">
                      <button onClick={() => setLyricsView('original')} className={`text-[11px] font-thin uppercase tracking-[0.6em] transition-all relative ${lyricsView === 'original' ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>Lyrics</button>
                      <button onClick={() => setLyricsView('translated')} className={`text-[11px] font-thin uppercase tracking-[0.6em] transition-all relative ${lyricsView === 'translated' ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>Translation</button>
                      
                      <Link to="/interactive" className="ml-auto flex items-center gap-4 group">
                        <span className="text-[10px] font-thin uppercase tracking-[0.4em] text-brand-gold/60 group-hover:text-white transition-colors">Participate Sync</span>
                        <div className="w-10 h-10 rounded-full border border-brand-gold/20 flex items-center justify-center group-hover:bg-brand-gold transition-all">
                          <svg className="w-4 h-4 text-brand-gold group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                      </Link>
                  </div>

                  <div className="max-w-4xl">
                      <pre className="text-3xl md:text-5xl font-thin uppercase leading-[1.8] text-white/60 whitespace-pre-wrap font-sans tracking-tight animate-blur-shift">
                        {lyricsView === 'original' ? activeTrack?.lyrics : activeTrack?.translations?.[lang]?.lyrics}
                      </pre>
                  </div>

                  {(activeTrack?.description || activeTrack?.storyline) && (
                      <div className="pt-40 border-t border-white/5 space-y-16">
                          {activeTrack.description && (
                            <div>
                                <h4 className="text-[10px] text-brand-gold font-thin uppercase tracking-[1em] mb-8">Creative Notes</h4>
                                <p className="text-lg font-thin text-slate-400 leading-loose italic tracking-[0.1em]">{activeTrack.description}</p>
                            </div>
                          )}
                          {activeTrack.storyline && (
                            <div>
                                <h4 className="text-[10px] text-slate-700 font-thin uppercase tracking-[1em] mb-8">Lab Journal</h4>
                                <p className="text-xs font-mono text-slate-600 leading-loose tracking-widest">{activeTrack.storyline}</p>
                            </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>

      <div className={`fixed bottom-0 left-0 w-full z-[100] transition-transform duration-1000 bg-black/95 backdrop-blur-3xl border-t border-white/5 ${isPlayerActive ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-screen-2xl mx-auto px-10 h-28 flex items-center justify-between">
              <div className="flex items-center gap-10 w-1/3">
                  <img src={activeTrack?.coverUrl} className="w-14 h-14 border border-white/5" />
                  <div className="overflow-hidden">
                    <span className="block text-[11px] font-thin uppercase tracking-[0.3em] text-white truncate mb-1">{activeTrack?.title}</span>
                    <span className="block text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] truncate">{activeTrack?.isrc}</span>
                  </div>
              </div>
              <div className="flex flex-col items-center gap-5 w-1/3">
                  <button onClick={() => { if(audioRef.current) isPlayerActive ? audioRef.current.pause() : audioRef.current.play(); setIsPlayerActive(!isPlayerActive); }} className="w-14 h-14 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    {isPlayerActive ? '||' : '>'}
                  </button>
                  <div className="w-full max-w-lg flex items-center gap-6">
                      <span className="text-[9px] font-mono text-slate-700">{formatTime(currentTime)}</span>
                      <div className="flex-1 h-[0.5px] bg-white/5 relative">
                          <div className="absolute h-full bg-brand-gold transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-700">{formatTime(duration)}</span>
                  </div>
              </div>
              <div className="w-1/3 flex justify-end">
                  <button onClick={() => setIsPlayerActive(false)} className="text-[9px] font-thin text-slate-700 uppercase tracking-[0.6em]">Minimize</button>
              </div>
          </div>
      </div>

      <audio 
        ref={audioRef} 
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setIsBuffering(false); }} 
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => setIsPlayerActive(false)} 
        crossOrigin="anonymous" 
      />
    </div>
  );
}; export default SongDetail;
