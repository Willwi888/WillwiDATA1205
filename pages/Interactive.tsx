
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

type InteractionMode = 'intro' | 'select' | 'gate' | 'configure' | 'order_form' | 'ticket';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
}

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const location = useLocation();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', note: '' });
  const [showPayment, setShowPayment] = useState(false);
  
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [config, setConfig] = useState<LyricConfig>({
      layout: 'lyrics',
      format: 'social', 
      alignVertical: 'middle',
      alignHorizontal: 'center',
      textCase: 'uppercase',
      lyricStyle: 'none',
      effect: 'glow',
      motion: 'slide',
      motionTweaks: 'none',
      syncMode: 'line',
      fontSize: 'medium'
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lyricsArrayRef = useRef<string[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const lineIndexRef = useRef(0); 
  const smoothIndexRef = useRef(0);
  const hitPulseRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const activeSongs = songs.filter(s => s.isInteractiveActive);

  useEffect(() => {
      if (location.state?.targetSongId) {
          const s = songs.find(x => x.id === location.state.targetSongId);
          if (s) { setSelectedSong(s); setMode('gate'); }
      }
  }, [songs, location.state]);

  useEffect(() => {
      if (!selectedSong?.audioUrl) return;
      setAudioSrc(convertToDirectStream(selectedSong.audioUrl));
  }, [selectedSong]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setMode('gate');
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ PREVIEW ]", ...rawLines, "END"];
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = convertToDirectStream(selectedSong.coverUrl);
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('configure');
      setTimeout(() => {
          if(audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
          }
      }, 500);
  };

  const togglePreviewPlay = () => {
      if(audioRef.current) {
          if(isPlaying) audioRef.current.pause();
          else audioRef.current.play();
      }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const formatTime = (time: number) => {
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
  };

  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const onTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
          if (lyricsArrayRef.current.length > 0) {
              const lineDur = audio.duration / lyricsArrayRef.current.length;
              const idx = Math.floor(audio.currentTime / (lineDur || 3));
              if (idx !== lineIndexRef.current) {
                  lineIndexRef.current = Math.min(idx, lyricsArrayRef.current.length - 1);
                  hitPulseRef.current = 1.0;
                  if (config.motion === 'bubbling' || config.motion === 'popup') {
                      for(let k=0; k < 3; k++) {
                        particlesRef.current.push({
                            x: (canvasRef.current?.width || 0) / 2 + (Math.random() - 0.5) * 600,
                            y: (canvasRef.current?.height || 0) / 2 + (Math.random() - 0.5) * 200,
                            vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 1) * 5,
                            alpha: 1, size: Math.random() * 4 + 2
                        });
                      }
                  }
              }
          }
      };
      const onLoadedMetadata = () => setDuration(audio.duration);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      return () => {
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
  }, [config.motion]);

  useEffect(() => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mode === 'configure') {
          const loop = () => {
              draw();
              animationFrameRef.current = requestAnimationFrame(loop);
          };
          loop();
      }
      return () => cancelAnimationFrame(animationFrameRef.current);
  }, [mode, config, selectedSong]);

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;
      const w = canvas.width; const h = canvas.height;
      const targetIdx = lineIndexRef.current;
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.08;
      hitPulseRef.current *= 0.92;
      ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, w, h);
      if (bgImageRef.current?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.4; ctx.filter = 'blur(80px) brightness(0.6)';
          const img = bgImageRef.current;
          const imgAspect = img.width / img.height; const canvasAspect = w / h;
          let rW, rH, oX, oY;
          if (imgAspect > canvasAspect) { rH = h; rW = h * imgAspect; oX = (w - rW) / 2; oY = 0; }
          else { rW = w; rH = w / imgAspect; oX = 0; oY = (h - rH) / 2; }
          ctx.drawImage(img, oX, oY, rW, rH);
          ctx.restore();
          if (config.layout === 'cover') {
              const coverSize = (config.format === 'social' ? w * 0.75 : h * 0.55) * (1 + hitPulseRef.current * 0.02);
              const cX = config.format === 'social' ? (w/2 - coverSize/2) : (w * 0.7 - coverSize/2);
              const cY = config.format === 'social' ? (h * 0.35 - coverSize/2) : (h/2 - coverSize/2);
              ctx.drawImage(img, cX, cY, coverSize, coverSize);
          }
      }
      const baseFontSize = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 110 : 70;
      const lineHeight = baseFontSize * 1.8;
      let centerOffset = (config.layout === 'cover' && config.format === 'social') ? h * 0.75 : h / 2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lyricsArrayRef.current.forEach((text, i) => {
          if (text === "END") return;
          let relPos = i - smoothIndexRef.current; let dist = Math.abs(relPos);
          let alpha = Math.max(0, 1 - dist * 0.5);
          if (alpha > 0.01) {
              ctx.save(); ctx.globalAlpha = alpha;
              ctx.fillStyle = Math.round(smoothIndexRef.current) === i ? '#ffffff' : 'rgba(255,255,255,0.4)';
              ctx.font = `${Math.round(smoothIndexRef.current) === i ? 900 : 600} ${baseFontSize}px Montserrat`;
              ctx.fillText(config.textCase === 'uppercase' ? text.toUpperCase() : text, w/2, centerOffset + relPos * lineHeight);
              ctx.restore();
          }
      });
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-8">Lyric Video Studio</h1>
              <button onClick={() => setMode('select')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all text-xs">Start Creation</button>
          </div>
      )}

      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in max-w-7xl mx-auto w-full">
              <h3 className="text-3xl font-black uppercase text-white mb-10">Select Track</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {activeSongs.map(song => (
                      <div key={song.id} className="bg-slate-900 border border-white/5 cursor-pointer group" onClick={() => handleSelectSong(song)}>
                          <img src={song.coverUrl} className="w-full aspect-square object-cover opacity-50 group-hover:opacity-100 transition-all" alt="" />
                          <div className="p-5"><h4 className="text-white font-black uppercase text-lg">{song.title}</h4></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center">
                  <h3 className="text-2xl font-black uppercase text-white mb-8">Access Ticket</h3>
                  <img src={selectedSong.coverUrl} className="w-40 h-40 object-cover mx-auto mb-6" alt="" />
                  <p className="text-xl font-black text-white mb-8 uppercase">{selectedSong.title}</p>
                  <button onClick={() => setShowPayment(true)} className="w-full py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-widest hover:bg-white transition-all">Support & Unlock</button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {mode === 'configure' && selectedSong && (
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative bg-[#050505]">
              <div className="w-full md:w-80 bg-slate-950 border-r border-white/5 p-6 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                  <div className="mb-8 border-b border-white/10 pb-4">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">Visualizer Workbench</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Custom Styling Studio</p>
                  </div>
                  
                  {/* PLAYER WORKBENCH */}
                  <div className="bg-white/5 p-5 rounded-lg border border-white/10 mb-8 space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Master Player</span>
                          <span className="text-[10px] font-mono text-slate-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeekChange} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full" />
                      <div className="flex justify-center items-center gap-6">
                          <button onClick={togglePreviewPlay} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                              {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                          </button>
                      </div>
                  </div>

                  <div className="space-y-8 flex-1">
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Animation Style</div>
                          <select 
                            value={config.motion} 
                            onChange={(e) => setConfig({...config, motion: e.target.value as any})}
                            className="w-full bg-black border border-white/10 p-3 text-white text-xs font-black uppercase outline-none focus:border-brand-gold"
                          >
                              {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'expand', 'fill', 'bubbling'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                              ))}
                          </select>
                      </div>
                      
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Format</div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, format: 'youtube'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.format === 'youtube' ? 'bg-brand-accent text-black' : 'text-slate-500 border-white/10'}`}>16:9</button>
                              <button onClick={() => setConfig({...config, format: 'social'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.format === 'social' ? 'bg-brand-accent text-black' : 'text-slate-500 border-white/10'}`}>9:16</button>
                          </div>
                      </div>
                  </div>

                  <button onClick={() => setMode('order_form')} className="mt-8 w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">Next Step</button>
              </div>

              <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-10 overflow-hidden">
                  <div className={`shadow-2xl border border-white/5 transition-all duration-700 bg-black relative ${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
      )}

      {mode === 'order_form' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black animate-fade-in">
              <h2 className="text-3xl font-black uppercase mb-8 text-white tracking-tighter">Submit Order</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('ticket'); }} className="space-y-6 bg-slate-900 p-10 border border-white/10 max-w-lg w-full">
                  <div className="space-y-2"><label className="text-[10px] text-brand-gold font-bold uppercase">Name</label><input type="text" required className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-brand-gold outline-none" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] text-brand-gold font-bold uppercase">Email</label><input type="email" required className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-brand-gold outline-none" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} /></div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">Generate Ticket</button>
              </form>
          </div>
      )}

      {mode === 'ticket' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="max-w-md w-full text-center">
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Ticket Generated</h2>
                  <p className="text-slate-400 text-xs mb-8">Copy the info below and send to Willwi via LINE.</p>
                  <div className="bg-slate-900 border border-brand-gold/50 p-6 rounded text-left font-mono text-xs text-slate-300 mb-8">
                      <pre className="whitespace-pre-wrap">{`【WILLWI STUDIO】\nID: #${Date.now().toString().slice(-6)}\nName: ${contactInfo.name}\nEmail: ${contactInfo.email}\nTrack: ${selectedSong.title}\nStyle: ${config.motion.toUpperCase()}\nFormat: ${config.format}`}</pre>
                  </div>
                  <button onClick={() => window.location.href = '/'} className="mt-8 text-slate-500 text-xs hover:text-white">Back to Home</button>
              </div>
          </div>
      )}

      {selectedSong && <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" className="hidden" loop />}
    </div>
  );
};

export default Interactive;
