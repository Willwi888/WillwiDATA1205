
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import PaymentModal from '../components/PaymentModal';

// Robust Direct Stream Converter for Dropbox/GDrive
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
  const { isAdmin } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', note: '' });
  const [showPayment, setShowPayment] = useState(false);
  
  // Audio Playback State
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
      } else if (location.state?.initialMode) {
          setMode(location.state.initialMode as InteractionMode);
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
              ctx.save();
              ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 100;
              ctx.drawImage(img, cX, cY, coverSize, coverSize);
              ctx.restore();
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
              ctx.font = `${Math.round(smoothIndexRef.current) === i ? 900 : 600} ${baseFontSize}px Montserrat, "Noto Sans TC", sans-serif`;
              ctx.fillText(config.textCase === 'uppercase' ? text.toUpperCase() : text, w/2, centerOffset + relPos * lineHeight);
              ctx.restore();
          }
      });
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      {/* 1. INTRO PAGE */}
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in text-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.05)_0%,_transparent_70%)] pointer-events-none"></div>
              <div className="max-w-2xl z-10">
                  <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6">INTERACTIVE<br/><span className="text-brand-gold">STUDIO</span></h1>
                  <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.4em] mb-12 leading-loose">
                      打造專屬於您的動態歌詞體驗。<br/>選擇曲目、設定風格、預覽成品。
                  </p>
                  <button onClick={() => setMode('select')} className="px-16 py-6 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all text-xs shadow-2xl">
                      開始參與製作
                  </button>
              </div>
          </div>
      )}

      {/* 2. SELECT SONG PAGE */}
      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-16 animate-fade-in max-w-7xl mx-auto w-full">
              <div className="mb-16">
                  <h3 className="text-4xl font-black uppercase text-white tracking-tighter">選擇製作曲目</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-[0.5em] mt-2 font-bold">Select Active Track</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {activeSongs.map(song => (
                      <div key={song.id} className="bg-slate-900 border border-white/5 cursor-pointer group hover:border-brand-gold/30 transition-all shadow-xl overflow-hidden" onClick={() => handleSelectSong(song)}>
                          <div className="relative aspect-square overflow-hidden bg-black">
                             <img src={song.coverUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" alt="" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                             <div className="absolute bottom-6 left-6 right-6">
                                <h4 className="text-white font-black uppercase text-xl truncate drop-shadow-2xl">{song.title}</h4>
                                <p className="text-brand-gold text-[9px] font-black uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">SELECT THIS TRACK →</p>
                             </div>
                          </div>
                      </div>
                  ))}
                  {activeSongs.length === 0 && (
                      <div className="col-span-full py-40 text-center border border-white/5 bg-white/[0.01]">
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">目前暫無開放製作曲目</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. PAYMENT GATE */}
      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold"></div>
                  <h3 className="text-2xl font-black uppercase text-white mb-10 tracking-[0.3em]">解鎖製作權限</h3>
                  <div className="flex flex-col items-center gap-8 mb-12">
                      <div className="w-48 h-48 bg-black shadow-2xl relative">
                          <img src={selectedSong.coverUrl} className="w-full h-full object-cover border border-white/10" alt="" />
                          <div className="absolute -bottom-4 -right-4 bg-brand-gold text-black px-3 py-1 text-[9px] font-black uppercase tracking-widest">Active</div>
                      </div>
                      <div className="text-center">
                          <p className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">{selectedSong.title}</p>
                          <span className="text-[10px] bg-white/10 text-slate-300 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest border border-white/5">單次製作費用 • NT$ 320</span>
                      </div>
                  </div>
                  <button onClick={() => setShowPayment(true)} className="w-full py-5 bg-brand-gold text-black font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-xl">
                      贊助並解鎖實驗室
                  </button>
                  <button onClick={() => setMode('select')} className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] hover:text-white transition-colors">
                      取消並返回列表
                  </button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {/* 4. VISUALIZER WORKBENCH */}
      {mode === 'configure' && selectedSong && (
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative bg-[#050505]">
              <div className="w-full md:w-80 bg-slate-950 border-r border-white/10 p-6 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                  <div className="mb-10 border-b border-white/5 pb-4">
                      <h4 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-1">Visualizer Lab</h4>
                      <p className="text-[9px] text-brand-gold font-black uppercase tracking-widest">Workbench v2.0</p>
                  </div>
                  
                  {/* MASTER PLAYER WORKBENCH */}
                  <div className="bg-white/5 p-6 rounded-sm border border-white/10 mb-10 space-y-6">
                      <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Master Timeline</span>
                          <span className="text-[10px] font-mono text-brand-gold">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      
                      <div className="relative">
                          <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeekChange} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full transition-all" />
                      </div>

                      <div className="flex justify-center items-center gap-8">
                          <button 
                            onClick={togglePreviewPlay} 
                            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-xl"
                          >
                              {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                          </button>
                      </div>
                  </div>

                  <div className="space-y-10 flex-1">
                      {/* ANIMATION DROPDOWN */}
                      <div className="space-y-4">
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 pb-2">文字動態樣式 (Text Motion)</div>
                          <div className="relative">
                              <select 
                                value={config.motion} 
                                onChange={(e) => setConfig({...config, motion: e.target.value as any})}
                                className="w-full bg-black border border-white/20 p-4 text-white text-[11px] font-black uppercase outline-none focus:border-brand-gold appearance-none cursor-pointer hover:border-white/40 transition-all rounded-sm"
                              >
                                  <option value="slide">Slide (縱向滑動)</option>
                                  <option value="fade">Fade (淡入淡出)</option>
                                  <option value="wipe">Wipe (擦拭掃描)</option>
                                  <option value="static">Static (靜止聚焦)</option>
                                  <option value="popup">Popup (縮放彈出)</option>
                                  <option value="mask">Mask (遮罩切割)</option>
                                  <option value="expand">Expand (字距擴張)</option>
                                  <option value="fill">Fill (漸層填充)</option>
                                  <option value="bubbling">Bubbling (動態氣泡)</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-4">
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 pb-2">畫布比例 (Format)</div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, format: 'youtube'})} className={`py-4 text-[10px] font-black uppercase border rounded-sm transition-all ${config.format === 'youtube' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>16:9 PC</button>
                              <button onClick={() => setConfig({...config, format: 'social'})} className={`py-4 text-[10px] font-black uppercase border rounded-sm transition-all ${config.format === 'social' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>9:16 Mobile</button>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 pb-2">版面構成 (Composition)</div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, layout: 'lyrics'})} className={`py-4 text-[10px] font-black uppercase border rounded-sm transition-all ${config.layout === 'lyrics' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>Lyrics Only</button>
                              <button onClick={() => setConfig({...config, layout: 'cover'})} className={`py-4 text-[10px] font-black uppercase border rounded-sm transition-all ${config.layout === 'cover' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>Cover Mode</button>
                          </div>
                      </div>
                  </div>

                  <button onClick={() => setMode('order_form')} className="mt-10 w-full py-5 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] hover:bg-brand-gold transition-all shadow-2xl rounded-sm">
                      確認樣式 & 完成製作
                  </button>
              </div>

              {/* REAL-TIME PREVIEW AREA */}
              <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-6 md:p-12 overflow-hidden">
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <span className="bg-black/60 border border-white/10 text-brand-gold px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-xl shadow-2xl animate-pulse">
                          WYSWYG PRODUCTION PREVIEW
                      </span>
                  </div>
                  <div className={`shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/5 transition-all duration-1000 ease-out bg-black relative ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[85vh]' : 'aspect-video w-full max-w-6xl'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
      )}

      {/* 5. ORDER FORM */}
      {mode === 'order_form' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black animate-fade-in">
              <h2 className="text-4xl font-black uppercase mb-12 text-white tracking-tighter">提交製作申請</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('ticket'); }} className="space-y-8 bg-slate-900 p-12 border border-white/10 max-w-xl w-full shadow-2xl">
                  <div className="space-y-2">
                      <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">正式姓名 (用於證書)</label>
                      <input type="text" required className="w-full bg-black border border-white/20 p-5 text-white text-lg focus:border-brand-gold outline-none transition-all placeholder-slate-700" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} placeholder="請輸入姓名..." />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">接收信箱 (成品寄送)</label>
                      <input type="email" required className="w-full bg-black border border-white/20 p-5 text-white text-lg focus:border-brand-gold outline-none transition-all placeholder-slate-700" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} placeholder="delivery@mail.com" />
                  </div>
                  <div className="pt-8 border-t border-white/10">
                    <p className="text-[10px] text-slate-500 mb-8 uppercase tracking-[0.2em]">已選樣式：<span className="text-white font-black">{config.motion.toUpperCase()} / {config.format.toUpperCase()}</span></p>
                    <button type="submit" className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all shadow-xl">
                        產生數位工單
                    </button>
                  </div>
              </form>
          </div>
      )}

      {/* 6. TICKET / LINE REDIRECT */}
      {mode === 'ticket' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="max-w-md w-full text-center">
                  <div className="w-24 h-24 bg-brand-gold rounded-full flex items-center justify-center mx-auto mb-10 text-black shadow-[0_0_60px_rgba(251,191,36,0.4)]">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 leading-none">製作工單<br/>已建立</h2>
                  <p className="text-slate-400 text-xs mb-12 leading-relaxed uppercase tracking-widest font-bold">請將下方指令塊傳送至<br/>WILLWI LINE 官方帳號進行確認。</p>
                  
                  <div className="bg-slate-900 border border-brand-gold/50 p-10 rounded-sm text-left font-mono text-[11px] text-slate-300 mb-12 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold"></div>
                      <pre className="whitespace-pre-wrap select-all leading-loose">{`【WILLWI STUDIO TICKET】\nID: #${Date.now().toString().slice(-6)}\nCLIENT: ${contactInfo.name}\nEMAIL: ${contactInfo.email}\n--------------------------\nTRACK: ${selectedSong.title}\nSTYLE: ${config.motion.toUpperCase()}\nLAYOUT: ${config.layout.toUpperCase()}\nFORMAT: ${config.format.toUpperCase()}\n--------------------------\nPLEASE RENDER THIS PROJECT.`}</pre>
                  </div>
                  
                  <button onClick={() => { const text = `【WILLWI STUDIO TICKET】\nID: #${Date.now().toString().slice(-6)}\nCLIENT: ${contactInfo.name}\nEMAIL: ${contactInfo.email}\n--------------------------\nTRACK: ${selectedSong.title}\nSTYLE: ${config.motion.toUpperCase()}\nLAYOUT: ${config.layout.toUpperCase()}\nFORMAT: ${config.format.toUpperCase()}\n--------------------------\nPLEASE RENDER THIS PROJECT.`; navigator.clipboard.writeText(text); alert("工單已複製！"); }} className="w-full py-6 bg-brand-accent text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-white transition-all shadow-xl mb-6">
                      複製工單內容
                  </button>
                  <a href="https://line.me/ti/p/@willwi" target="_blank" rel="noopener noreferrer" className="block w-full py-6 border border-[#06c755] text-[#06c755] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#06c755] hover:text-white transition-all shadow-xl">
                      開啟 LINE 傳送工單
                  </a>
                  
                  <button onClick={() => navigate('/')} className="mt-16 text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] hover:text-white transition-colors">
                      返回終端首頁
                  </button>
              </div>
          </div>
      )}

      {selectedSong && <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" className="hidden" loop />}
    </div>
  );
};

export default Interactive;
