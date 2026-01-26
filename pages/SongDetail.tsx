
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, getSong } = useData(); 
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) setSong(found);
    }
  }, [id, getSong]);

  const handlePlay = () => {
    if (!audioRef.current || !song) return;
    if (isPlayerActive) {
        audioRef.current.pause();
        setIsPlayerActive(false);
    } else {
        const url = resolveDirectLink(song.audioUrl || '');
        if (!url) return;
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
    <div className="min-h-screen bg-black relative flex flex-col font-sans font-light pt-32 px-10 lg:px-24 pb-60">
      
      {/* AUTHORITY ASSET HEADER */}
      <div className="flex flex-col lg:flex-row gap-20 mb-32 items-start border-b border-white/10 pb-24">
          <div className="w-full lg:w-[500px] shrink-0">
              <div className="aspect-square bg-slate-900 border border-white/10 relative overflow-hidden group shadow-2xl">
                  <img src={song.coverUrl} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-[1.5s]" />
                  <div className="absolute top-6 left-6 flex gap-3">
                      <span className="px-3 py-1 bg-brand-accent text-black text-[10px] font-black uppercase tracking-widest shadow-xl">MXM_VERIFIED</span>
                      <span className="px-3 py-1 bg-black/80 border border-white/20 text-white text-[10px] font-mono uppercase">{song.language}</span>
                  </div>
              </div>
          </div>

          <div className="flex-1 flex flex-col justify-between self-stretch py-2">
              <div className="space-y-8">
                  <div className="space-y-2">
                    <span className="text-[12px] text-white/20 uppercase tracking-[1em] font-bold">Global Asset ID: {song.id}</span>
                    <h1 className="text-7xl lg:text-[10rem] font-black text-white tracking-tighter uppercase leading-[0.8]">{song.title}</h1>
                  </div>

                  {/* DATA GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-16 border-t border-white/5">
                      <div className="space-y-3">
                          <span className="block text-[10px] text-white/20 uppercase tracking-[0.3em]">ISRC Identification</span>
                          <span className="block text-lg font-mono text-white tracking-tighter font-bold">{song.isrc || 'UNREGISTERED'}</span>
                      </div>
                      <div className="space-y-3">
                          <span className="block text-[10px] text-white/20 uppercase tracking-[0.3em]">UPC Repository</span>
                          <span className="block text-lg font-mono text-white tracking-tighter font-bold">{song.upc || 'UNREGISTERED'}</span>
                      </div>
                      <div className="space-y-3">
                          <span className="block text-[10px] text-white/20 uppercase tracking-[0.3em]">Release Cycle</span>
                          <span className="block text-lg font-mono text-white tracking-tighter font-bold">{song.releaseDate}</span>
                      </div>
                      <div className="space-y-3">
                          <span className="block text-[10px] text-white/20 uppercase tracking-[0.3em]">Status</span>
                          <span className="block text-lg font-mono text-emerald-500 tracking-tighter font-bold">ACTIVE_OK</span>
                      </div>
                  </div>
              </div>

              {/* INTERACTION TOOLS */}
              <div className="flex flex-wrap gap-6 pt-16">
                  <button 
                    onClick={handlePlay}
                    className="flex-1 min-w-[250px] py-7 bg-white text-black text-[12px] font-black uppercase tracking-[0.6em] hover:bg-brand-accent transition-all shadow-[0_20px_60px_rgba(255,255,255,0.05)]"
                  >
                    {isPlayerActive ? 'Terminate Stream' : 'Initiate Session'}
                  </button>
                  <button 
                    onClick={() => navigate('/interactive')}
                    className="px-16 py-7 border border-white/10 text-white text-[12px] font-black uppercase tracking-[0.6em] hover:border-brand-accent transition-all"
                  >
                    Enter Sync Studio
                  </button>
              </div>
          </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-32">
          <div className="lg:col-span-8 space-y-16">
              <h3 className="text-[11px] text-white/10 uppercase tracking-[1.2em] border-b border-white/5 pb-8">Official Curated Metadata (Lyrics)</h3>
              <div className="bg-white/[0.01] border border-white/5 p-20 lg:p-32 relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-brand-accent font-mono uppercase">Read-Only_Asset</span>
                  </div>
                  <pre className="text-4xl lg:text-7xl text-white font-light leading-[1.4] whitespace-pre-wrap uppercase tracking-tighter font-sans">
                    {song.lyrics || 'ASSET_LYRIC_NULL'}
                  </pre>
              </div>
          </div>

          <div className="lg:col-span-4 space-y-20">
              <div className="space-y-10">
                  <h3 className="text-[11px] text-white/10 uppercase tracking-[1.2em] border-b border-white/5 pb-8">Platform Routing</h3>
                  <div className="grid grid-cols-1 gap-5">
                      {song.spotifyLink && (
                          <a href={song.spotifyLink} target="_blank" className="flex justify-between items-center p-8 bg-white/[0.02] border border-white/5 hover:border-brand-accent transition-all group">
                              <span className="text-[12px] text-white font-bold uppercase tracking-widest">Spotify Asset</span>
                              <span className="text-[11px] font-mono text-brand-accent opacity-40 group-hover:opacity-100">→ CONNECTED</span>
                          </a>
                      )}
                      {song.appleMusicLink && (
                          <a href={song.appleMusicLink} target="_blank" className="flex justify-between items-center p-8 bg-white/[0.02] border border-white/5 hover:border-brand-accent transition-all group">
                              <span className="text-[12px] text-white font-bold uppercase tracking-widest">Apple ID</span>
                              <span className="text-[11px] font-mono text-brand-accent opacity-40 group-hover:opacity-100">→ CONNECTED</span>
                          </a>
                      )}
                      {song.youtubeUrl && (
                          <a href={song.youtubeUrl} target="_blank" className="flex justify-between items-center p-8 bg-white/[0.02] border border-white/5 hover:border-brand-accent transition-all group">
                              <span className="text-[12px] text-white font-bold uppercase tracking-widest">YouTube SRC</span>
                              <span className="text-[11px] font-mono text-brand-accent opacity-40 group-hover:opacity-100">→ CONNECTED</span>
                          </a>
                      )}
                  </div>
              </div>

              <div className="space-y-10">
                  <h3 className="text-[11px] text-white/10 uppercase tracking-[1.2em] border-b border-white/5 pb-8">Credit Registry</h3>
                  <pre className="text-[12px] font-mono text-slate-500 leading-loose uppercase tracking-[0.2em] whitespace-pre-wrap p-8 border border-white/5">
                    {song.credits || 'NO_CREDIT_RECORD_FOUND'}
                  </pre>
              </div>
          </div>
      </div>

      {/* FOOTER AUTHORITY PLAYER */}
      <div className={`fixed bottom-0 left-0 w-full z-[1000] transition-transform duration-1000 bg-black border-t border-white/10 ${isPlayerActive ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-screen-2xl mx-auto px-10 h-28 flex items-center justify-between">
              <div className="flex items-center gap-10 w-1/3">
                  <div className="w-16 h-16 bg-slate-900 border border-white/10 overflow-hidden shadow-2xl">
                    <img src={song.coverUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[14px] text-white font-black tracking-widest uppercase truncate">{song.title}</span>
                    <span className="block text-[9px] text-brand-accent font-mono uppercase tracking-tighter mt-1">{song.isrc}</span>
                  </div>
              </div>
              <div className="flex flex-col items-center gap-4 w-1/3">
                  <div className="w-full h-[2px] bg-white/5 relative overflow-hidden">
                      <div className="absolute h-full bg-brand-accent" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                  </div>
                  <div className="flex justify-between w-full px-1">
                      <span className="text-[10px] font-mono text-white/30 font-bold">{formatTime(currentTime)}</span>
                      <span className="text-[10px] font-mono text-white/30 font-bold">{formatTime(duration)}</span>
                  </div>
              </div>
              <div className="w-1/3 flex justify-end">
                  <button onClick={() => setIsPlayerActive(false)} className="text-[11px] text-white/20 hover:text-white uppercase tracking-[0.5em] px-10 py-4 border border-white/10 transition-all">TERMINATE_SESSION</button>
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
