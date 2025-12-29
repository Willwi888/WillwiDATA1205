
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

// 統一的音檔轉換工具
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
    } catch (e) {
        return url;
    }
};

// New Mode State Machine
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
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', note: '' });
  const [showPayment, setShowPayment] = useState(false);
  
  // Audio State
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  // Visual Config
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
  
  // Animation Refs
  const lineIndexRef = useRef(0); 
  const smoothIndexRef = useRef(0);
  const hitPulseRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  // Filter Active Songs
  const activeSongs = songs.filter(s => s.isInteractiveActive);

  // Initialize from Route State
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      if (params.get('payment') === 'success') {
          if (!selectedSong) setMode('select');
          else setMode('configure'); 
      }
      
      if (location.state?.targetSongId) {
          const s = songs.find(x => x.id === location.state.targetSongId);
          if (s) handleSelectSong(s);
      } else if (location.state?.initialMode) {
          setMode(location.state.initialMode as InteractionMode);
      }
  }, [location.search, songs, location.state]);

  // Audio Loading
  useEffect(() => {
      if (!selectedSong?.audioUrl) return;
      const url = convertToDirectStream(selectedSong.audioUrl);
      setAudioSrc(url);
      setIsAudioLoading(true);
  }, [selectedSong]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setMode('gate');
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      // Parse lyrics
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ PREVIEW ]", ...rawLines, "END"];
      
      // Load Cover
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = convertToDirectStream(selectedSong.coverUrl);
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('configure');
      lineIndexRef.current = 0;
      smoothIndexRef.current = 0;
  };

  const togglePreviewPlay = () => {
      if(audioRef.current) {
          if(isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play().catch(e => console.error("Play Failed", e));
          }
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
      if (isNaN(time)) return "0:00";
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
  };

  // Render Loop
  useEffect(() => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mode === 'configure') {
          renderLoop();
      }
      return () => cancelAnimationFrame(animationFrameRef.current);
  }, [mode, config, selectedSong]);

  // Audio Event Listeners for Progress
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const onTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
          // Simulate line hits for preview based on rough duration division if real timestamps missing
          if (lyricsArrayRef.current.length > 0) {
              const lineDur = audio.duration / lyricsArrayRef.current.length;
              const idx = Math.floor(audio.currentTime / (lineDur || 3));
              if (idx !== lineIndexRef.current) {
                  lineIndexRef.current = Math.min(idx, lyricsArrayRef.current.length - 1);
                  hitPulseRef.current = 1.0;
                  // Spawn particles on "beat"
                  if (config.motion === 'bubbling' || config.motion === 'popup') {
                      for(let k=0; k < 3; k++) {
                        particlesRef.current.push({
                            x: (canvasRef.current?.width || 0) / 2 + (Math.random() - 0.5) * 600,
                            y: (canvasRef.current?.height || 0) / 2 + (Math.random() - 0.5) * 200,
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 1) * 5,
                            alpha: 1,
                            size: Math.random() * 4 + 2
                        });
                      }
                  }
              }
          }
      };
      
      const onLoadedMetadata = () => {
          setDuration(audio.duration);
          setIsAudioLoading(false);
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onWaiting = () => setIsAudioLoading(true);
      const onPlaying = () => setIsAudioLoading(false);

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('waiting', onWaiting);
      audio.addEventListener('playing', onPlaying);

      return () => {
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('play', onPlay);
          audio.removeEventListener('pause', onPause);
          audio.removeEventListener('waiting', onWaiting);
          audio.removeEventListener('playing', onPlaying);
      };
  }, [config.motion]);

  const renderLoop = () => {
      draw();
      if (mode === 'configure') {
          animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
  };

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      (ctx as any).letterSpacing = '0px';

      const targetIdx = lineIndexRef.current;
      
      if (config.motion === 'static') {
          smoothIndexRef.current = targetIdx;
      } else if (config.motion === 'slide') {
          smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.05; 
      } else {
          smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.08;
      }
      hitPulseRef.current *= 0.92;

      // 1. BACKGROUND
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          const isCinema = config.motion === 'fade' || config.motion === 'popup';
          ctx.globalAlpha = isCinema ? 0.3 : 0.4;
          ctx.filter = isCinema ? 'blur(120px) brightness(0.6)' : 'blur(80px) brightness(0.7)';
          const img = bgImageRef.current;
          const imgAspect = img.width / img.height;
          const canvasAspect = w / h;
          let renderW, renderH, offsetX, offsetY;
          if (imgAspect > canvasAspect) {
              renderH = h; renderW = h * imgAspect;
              offsetX = (w - renderW) / 2; offsetY = 0;
          } else {
              renderW = w; renderH = w / imgAspect;
              offsetX = 0; offsetY = (h - renderH) / 2;
          }
          ctx.drawImage(img, offsetX - (renderW * 0.1)/2, offsetY - (renderH * 0.1)/2, renderW * 1.1, renderH * 1.1);
          
          const gradient = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          
          if (config.layout === 'cover') {
              ctx.filter = 'none'; ctx.globalAlpha = 1.0;
              const baseScale = config.format === 'social' ? w * 0.75 : h * 0.55;
              const coverSize = baseScale * (1 + hitPulseRef.current * 0.02);
              const coverX = config.format === 'social' ? (w/2 - coverSize/2) : (w * 0.7 - coverSize/2);
              const coverY = config.format === 'social' ? (h * 0.35 - coverSize/2) : (h/2 - coverSize/2);
              ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
              ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
          }
          ctx.restore();
      }

      // PARTICLES
      if (config.motion === 'bubbling' || config.motion === 'popup') {
          ctx.save();
          particlesRef.current.forEach((p, idx) => {
              p.x += p.vx; p.y += p.vy; p.alpha -= 0.015;
              if (p.alpha > 0) {
                  ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha})`; ctx.shadowColor = 'rgba(251, 191, 36, 0.5)'; ctx.shadowBlur = 10;
                  ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
              } else particlesRef.current.splice(idx, 1);
          });
          ctx.restore();
      }

      // 2. LYRICS
      let lyricsX = w / 2;
      if (config.layout === 'cover' && config.format === 'youtube') lyricsX = w * 0.25;
      else if (config.layout === 'cover' && config.format === 'social') lyricsX = w / 2;
      else if (config.alignHorizontal === 'left') lyricsX = 180;
      else if (config.alignHorizontal === 'right') lyricsX = w - 180;

      const baseFontSize = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 110 : 70;
      const lineHeight = baseFontSize * 1.8;
      let centerOffset = h / 2;
      if (config.layout === 'cover' && config.format === 'social') centerOffset = h * 0.75;

      ctx.textAlign = 'center';
      if (config.layout === 'cover' && config.format === 'youtube') ctx.textAlign = 'center';
      else if (config.alignHorizontal) ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      
      const items = lyricsArrayRef.current;
      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          if (text === "END") return;

          let relPos = i - smoothIndexRef.current;
          let dist = Math.abs(relPos);
          let y = centerOffset + (relPos * lineHeight);
          if (config.motion !== 'slide') y = centerOffset;

          let alpha = 0; let scale = 1; let blur = 0; let offsetX = 0; let offsetY = 0;
          const isLineActive = Math.round(smoothIndexRef.current) === i;

          switch (config.motion) {
              case 'slide': if (dist < 4) { alpha = 1 - (dist * 0.35); scale = isLineActive ? 1.05 + hitPulseRef.current * 0.03 : 0.9; blur = isLineActive ? 0 : dist * 2; } break;
              case 'fade': if (dist < 0.5) { alpha = 1 - (dist * 2); scale = 1.0 + (1-dist)*0.1 + hitPulseRef.current * 0.05; blur = dist * 10; } break;
              case 'static': y = centerOffset; if (i === targetIdx) { alpha = 1; scale = 1.05 + hitPulseRef.current * 0.1; } break;
              case 'wipe': y = centerOffset; if (dist < 0.8) { alpha = 1 - dist; offsetX = dist * 20; } break;
              case 'popup': y = centerOffset; if (dist < 0.6) { alpha = 1 - (dist * 1.5); scale = Math.max(0, 1 - dist) * (1 + hitPulseRef.current * 0.1); } break;
              case 'mask': y = centerOffset; if (dist < 0.5) alpha = 1; break;
              case 'expand': y = centerOffset; if (dist < 0.5) alpha = 1 - (dist * 2); break;
              case 'fill': y = centerOffset; if (dist < 0.5) alpha = 1 - (dist * 2); break;
              case 'bubbling': y = centerOffset; if (dist < 0.5) { alpha = 1 - (dist * 2); offsetY = Math.sin(Date.now() / 300 + i) * 15; scale = 1 + Math.sin(Date.now() / 200) * 0.05; } break;
              default: if (dist < 4) alpha = 1 - (dist * 0.35); break;
          }

          if (alpha > 0.01) {
              ctx.save();
              if (config.motion === 'mask') {
                  const revealH = 200 * (1 - dist);
                  ctx.beginPath(); ctx.rect(0, y - revealH/2, w, revealH); ctx.clip();
              } else if (config.motion === 'wipe') {
                  const revealW = w * (1 - dist * 0.5);
                  ctx.beginPath(); ctx.rect((w - revealW)/2, 0, revealW, h); ctx.clip();
              }

              ctx.translate(lyricsX + offsetX, y + offsetY);
              ctx.scale(scale, scale); ctx.globalAlpha = alpha;
              if (blur > 0) ctx.filter = `blur(${blur}px)`;
              ctx.font = `${isLineActive ? 900 : 600} ${baseFontSize}px Montserrat, "Noto Sans TC", sans-serif`;
              if (config.motion === 'expand' && (ctx as any).letterSpacing !== undefined) {
                  const spacing = Math.max(0, (1 - dist * 2) * 40);
                  (ctx as any).letterSpacing = `${spacing}px`;
              }
              if (isLineActive) {
                  if (config.motion === 'fill') {
                      const gradient = ctx.createLinearGradient(0, -baseFontSize/2, 0, baseFontSize/2);
                      gradient.addColorStop(0, '#fbbf24'); gradient.addColorStop(1, '#ffffff');
                      ctx.fillStyle = gradient;
                  } else ctx.fillStyle = '#ffffff';
                  if (config.effect === 'glow' || config.motion === 'popup') {
                      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)'; ctx.shadowBlur = 30 + hitPulseRef.current * 30;
                  }
              } else { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 0; }
              ctx.fillText(text, 0, 0); ctx.restore();
          }
      });

      // 3. METADATA
      if (config.layout !== 'cover' || config.format === 'youtube') {
          ctx.save(); ctx.globalAlpha = 0.8;
          const metaX = config.format === 'social' ? w/2 : 100;
          const metaY = config.format === 'social' ? h - 200 : h - 100;
          ctx.textAlign = config.format === 'social' ? 'center' : 'left';
          ctx.fillStyle = '#fbbf24'; ctx.font = '900 32px Montserrat';
          if (config.motion === 'fade' || config.motion === 'popup') ctx.font = '900 40px Montserrat';
          ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
          ctx.fillText(selectedSong!.title.toUpperCase(), metaX, metaY);
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '700 18px Montserrat';
          ctx.fillText(`Prod. Willwi`, metaX, metaY + 35);
          ctx.restore();
      }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
      e.preventDefault();
      if(!contactInfo.name || !contactInfo.email) return alert("請填寫完整資訊");
      setMode('ticket');
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans selection:bg-brand-gold selection:text-black">
      
      {/* 1. INTRO & DISCLAIMER */}
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.1)_0%,_transparent_70%)]"></div>
              <div className="max-w-2xl text-center z-10 space-y-12">
                  <div className="border border-brand-gold/30 inline-block px-4 py-1 text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mb-4">Willwi Studio</div>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">客製化歌詞影片訂製</h1>
                  <p className="text-slate-400 text-xs uppercase tracking-widest leading-loose">無需親自動手 • 專業後台渲染<br/>您選擇風格 • 我們為您製作</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8">
                      <div className="p-4 border border-white/10 bg-white/5 rounded"><span className="text-brand-gold font-black text-lg block mb-2">01</span><h4 className="text-xs font-bold text-white uppercase mb-1">Select</h4><p className="text-[10px] text-slate-500">從精選歌單中挑選一首作品</p></div>
                      <div className="p-4 border border-white/10 bg-white/5 rounded"><span className="text-brand-gold font-black text-lg block mb-2">02</span><h4 className="text-xs font-bold text-white uppercase mb-1">Customize</h4><p className="text-[10px] text-slate-500">預覽並決定您要的視覺風格</p></div>
                      <div className="p-4 border border-white/10 bg-white/5 rounded"><span className="text-brand-gold font-black text-lg block mb-2">03</span><h4 className="text-xs font-bold text-white uppercase mb-1">Order</h4><p className="text-[10px] text-slate-500">送出工單，等待成品連結</p></div>
                  </div>
                  <button onClick={() => setMode('select')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all text-xs shadow-[0_0_30px_rgba(255,255,255,0.2)] mt-8">開始訂製</button>
              </div>
          </div>
      )}

      {/* 2. SELECT SONG */}
      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">{t('interactive_select_title')}</h3>
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-10">Limited Edition Selection</p>
                  {activeSongs.length === 0 ? (
                      <div className="p-20 text-center border border-white/10 text-slate-500 uppercase tracking-widest">目前無開放訂製曲目</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {activeSongs.map(song => (
                              <div key={song.id} className="bg-slate-900 border border-white/5 overflow-hidden flex flex-col shadow-lg hover:shadow-brand-gold/10 transition-shadow duration-500">
                                  <div className="aspect-square relative group cursor-pointer" onClick={() => handleSelectSong(song)}>
                                      <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0" alt="" />
                                      <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-all flex items-center justify-center"><span className="opacity-0 group-hover:opacity-100 bg-brand-gold text-black px-4 py-2 font-black text-xs uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-all">選擇此曲</span></div>
                                  </div>
                                  <div className="p-5"><h4 className="text-white font-black uppercase truncate text-lg">{song.title}</h4><p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Willwi • {song.releaseDate}</p></div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. GATE (Payment) */}
      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent"></div>
                  <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white mb-8">{t('interactive_gate_ticket')}</h3>
                  <div className="flex items-center justify-center gap-6 mb-10 bg-black/30 p-4 rounded-lg border border-white/5">
                      <img src={selectedSong.coverUrl} className="w-20 h-20 object-cover rounded shadow-lg" alt="" />
                      <div className="text-left"><div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t('interactive_gate_selected')}</div><div className="text-xl font-black text-white uppercase">{selectedSong.title}</div></div>
                  </div>
                  <div className="space-y-4 mb-10 border-t border-b border-white/5 py-8">
                      <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase tracking-widest">訂製費用</span><span className="text-white font-mono text-xl">NT$ 320</span></div>
                      <p className="text-[10px] text-slate-500 leading-relaxed text-left mt-2">費用包含：高畫質影片渲染服務、數位收藏證書。</p>
                  </div>
                  <button onClick={() => setShowPayment(true)} className="w-full py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-lg">{t('interactive_gate_pay_btn')}</button>
                  <button onClick={() => setMode('select')} className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-white">{t('form_btn_cancel')}</button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {/* 4. CONFIGURE & PREVIEW (Visualizer Workbench) */}
      {mode === 'configure' && selectedSong && (
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative bg-[#050505]">
              {/* Sidebar Controls */}
              <div className="w-full md:w-80 bg-slate-950 border-r border-white/5 p-6 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                  <div className="mb-8 border-b border-white/10 pb-4">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">Visualizer Workbench</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Custom Styling Studio</p>
                  </div>
                  
                  {/* Player Component */}
                  <div className="bg-white/5 p-5 rounded-lg border border-white/10 mb-8 space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Player</span>
                          <span className="text-[10px] font-mono text-slate-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      
                      <input 
                        type="range" 
                        min={0} 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeekChange}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full transition-all"
                      />

                      <div className="flex justify-center items-center gap-6">
                          <button onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0 }} className="text-slate-400 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
                          <button 
                            onClick={togglePreviewPlay} 
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
                            disabled={isAudioLoading}
                          >
                              {isAudioLoading ? (
                                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                              ) : isPlaying ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                              ) : (
                                  <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              )}
                          </button>
                          <button onClick={() => { if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } }} className="text-slate-400 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg></button>
                      </div>
                  </div>

                  <div className="space-y-8 flex-1">
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{t('interactive_panel_visual')}</div>
                          <div className="grid grid-cols-2 gap-2">
                              {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'expand', 'fill', 'bubbling'].map((m) => (
                                  <button 
                                      key={m}
                                      onClick={() => setConfig({...config, motion: m as any})} 
                                      className={`flex flex-col items-center justify-center p-3 border transition-all rounded-sm group ${config.motion === m ? 'bg-white text-black border-white ring-2 ring-brand-gold/50' : 'bg-transparent text-slate-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                  >
                                      <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{t('interactive_panel_format')}</div>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                              <button onClick={() => setConfig({...config, format: 'youtube'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm flex flex-col items-center gap-1 ${config.format === 'youtube' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:text-white'}`}>16:9 (PC)</button>
                              <button onClick={() => setConfig({...config, format: 'social'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm flex flex-col items-center gap-1 ${config.format === 'social' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:text-white'}`}>9:16 (Mobile)</button>
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{t('interactive_panel_composition')}</div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, layout: 'lyrics'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.layout === 'lyrics' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:text-white'}`}>Lyrics Only</button>
                              <button onClick={() => setConfig({...config, layout: 'cover'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.layout === 'cover' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:text-white'}`}>Cover Mode</button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto pt-8">
                      <button onClick={() => setMode('order_form')} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] rounded-sm">確認樣式 & 下一步</button>
                  </div>
              </div>

              {/* Canvas Preview Area */}
              <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-4 md:p-10 overflow-hidden">
                  <div className="absolute top-6 left-0 w-full text-center z-10 pointer-events-none">
                      <span className="bg-black/50 border border-white/10 text-brand-gold px-4 py-2 rounded-full text-[10px] uppercase tracking-widest backdrop-blur-md animate-pulse">Auto-Preview Mode • 所見即所得</span>
                  </div>
                  <div className={`shadow-2xl border border-white/5 transition-all duration-700 bg-black relative ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[85vh]' : 'aspect-video w-full max-w-6xl'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
      )}

      {/* 5. ORDER FORM */}
      {mode === 'order_form' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black animate-fade-in">
              <h2 className="text-3xl font-black uppercase mb-8 tracking-tighter text-white">收件資訊</h2>
              <form onSubmit={handleCreateOrder} className="space-y-6 bg-slate-900 p-10 border border-white/10 shadow-2xl max-w-lg w-full">
                  <div className="space-y-2"><label className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.2em]">{t('interactive_input_name')}</label><input type="text" required className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-brand-gold outline-none" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} placeholder="您的姓名 / 暱稱" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.2em]">Email (接收雲端連結)</label><input type="email" required className="w-full bg-black border border-white/20 p-4 text-white text-lg focus:border-brand-gold outline-none" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} placeholder="example@mail.com" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">備註 (選填)</label><input type="text" className="w-full bg-black border border-white/20 p-4 text-white text-sm focus:border-brand-gold outline-none" value={contactInfo.note} onChange={e => setContactInfo({...contactInfo, note: e.target.value})} placeholder="想對 Willwi 說的話..." /></div>
                  <div className="pt-6 border-t border-white/10 text-center space-y-4"><div className="text-[10px] text-slate-400">已選樣式：<span className="text-white font-bold">{config.motion.toUpperCase()} / {config.format.toUpperCase()}</span></div><button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all shadow-lg">產生數位工單</button><button type="button" onClick={() => setMode('configure')} className="text-xs text-slate-500 hover:text-white underline">返回修改樣式</button></div>
              </form>
          </div>
      )}

      {/* 6. TICKET / COMPLETED */}
      {mode === 'ticket' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-brand-gold rounded-full flex items-center justify-center mx-auto mb-8 text-black shadow-[0_0_40px_rgba(251,191,36,0.6)]"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">訂單已建立</h2>
                  <p className="text-slate-400 text-xs mb-8 leading-relaxed">請複製下方工單內容，傳送至 Willwi 官方 LINE。<br/>Willwi 將於確認後開始為您製作。</p>
                  <div className="bg-slate-900 border border-brand-gold/50 p-6 rounded relative mb-8 text-left font-mono text-xs text-slate-300 shadow-2xl"><div className="absolute top-0 left-0 w-full h-1 bg-brand-gold"></div><pre className="whitespace-pre-wrap leading-relaxed select-all">{`【WILLWI STUDIO 工單】\n-------------------------\n訂單編號: #${Date.now().toString().slice(-6)}\n訂購人: ${contactInfo.name}\n信箱: ${contactInfo.email}\n-------------------------\n曲目: ${selectedSong.title}\n風格: ${config.motion.toUpperCase()} (${config.layout})\n比例: ${config.format === 'social' ? '9:16 (手機)' : '16:9 (電腦)'}\n備註: ${contactInfo.note}\n-------------------------\n請協助製作，謝謝！`}</pre></div>
                  <button onClick={() => { const text = `【WILLWI STUDIO 工單】\n-------------------------\n訂單編號: #${Date.now().toString().slice(-6)}\n訂購人: ${contactInfo.name}\n信箱: ${contactInfo.email}\n-------------------------\n曲目: ${selectedSong.title}\n風格: ${config.motion.toUpperCase()} (${config.layout})\n比例: ${config.format === 'social' ? '9:16 (手機)' : '16:9 (電腦)'}\n備註: ${contactInfo.note}\n-------------------------\n請協助製作，謝謝！`; navigator.clipboard.writeText(text); alert("工單已複製！請切換至 LINE 貼上傳送。"); }} className="w-full py-4 bg-brand-accent text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all rounded shadow-lg mb-4">複製工單內容 (Copy)</button>
                  <a href="https://line.me/ti/p/@willwi" target="_blank" rel="noopener noreferrer" className="block w-full py-4 border border-white/20 text-white font-black uppercase text-xs tracking-[0.2em] hover:bg-[#06c755] hover:text-white hover:border-[#06c755] transition-all rounded">開啟 LINE 官方帳號</a>
                  <button onClick={() => window.location.href = '/'} className="mt-8 text-slate-500 text-xs hover:text-white">回到首頁</button>
              </div>
          </div>
      )}

      {audioSrc && <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" className="hidden" loop />}
    </div>
  );
};

export default Interactive;
