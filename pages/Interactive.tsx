import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        if (url.includes('dropbox.com')) {
            let newUrl = url;
            if (newUrl.includes('dl=0')) newUrl = newUrl.replace('dl=0', 'raw=1');
            else if (newUrl.includes('dl=1')) newUrl = newUrl.replace('dl=1', 'raw=1');
            else if (!newUrl.includes('raw=1')) {
                 newUrl += (newUrl.includes('?') ? '&' : '?') + 'raw=1';
            }
            return newUrl;
        }
        return url;
    } catch (e) { return url; }
};

// 簡化模式：移除 intro，直接進入 select
type InteractionMode = 'select' | 'gate' | 'setup' | 'playing' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const location = useLocation();
  
  // 預設直接進入 select (選歌大廳)
  const [mode, setMode] = useState<InteractionMode>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  const [config, setConfig] = useState<LyricConfig>({
      layout: 'lyrics',
      format: 'youtube',
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

  const [lineIndex, setLineIndex] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  // Audition State
  const [isAuditioning, setIsAuditioning] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const smoothIndexRef = useRef<number>(0);
  const hitPulseRef = useRef<number>(0);
  const exitAnimationRef = useRef<number>(1);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
      const params = new URLSearchParams(location.search);
      if (params.get('payment') === 'success') {
          setMode('select'); 
      }
  }, [location.search]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              if (mode === 'playing' || (mode === 'setup' && isAuditioning)) {
                  e.preventDefault(); 
                  handleLineClick();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isAuditioning]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setMode('gate');
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      setIsAudioReady(false);
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ READY ]", ...rawLines, "END"];
      
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = convertToDirectStream(selectedSong.coverUrl);
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('setup');
      setLineIndex(0);
      setIsAuditioning(false);
  };

  const startRecording = async () => {
      if (!canvasRef.current || !audioRef.current || !isAudioReady) {
          alert("Audio is loading... please wait a moment.");
          return;
      }
      if (isAuditioning) {
          audioRef.current.pause();
          setIsAuditioning(false);
      }

      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      exitAnimationRef.current = 1;
      setRecordedChunks([]);
      
      audioRef.current.currentTime = 0;

      try {
          const canvasStream = (canvasRef.current as any).captureStream(60);
          const dest = ctx.createMediaStreamDestination();
          
          if (!audioSourceRef.current) {
              audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
          }
          audioSourceRef.current.connect(dest);
          audioSourceRef.current.connect(ctx.destination);

          const combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
          ]);

          const recorder = new MediaRecorder(combinedStream, { 
              mimeType: 'video/webm;codecs=vp9,opus', 
              videoBitsPerSecond: 25000000 
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => setRecordedChunks(chunks);

          mediaRecorderRef.current = recorder;
          recorder.start(100); 
          
          await audioRef.current.play();
          renderLoop();
      } catch (e) { 
          console.error(e); 
          alert("Recording failed to initialize. Please try refreshing.");
          setMode('setup');
      }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      const isInteractive = mode === 'playing' || (mode === 'setup' && isAuditioning);
      if (!isInteractive || !audioRef.current) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 70) return;
      lastTapTimeRef.current = now;

      hitPulseRef.current = 1.0; 
      
      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              
              if (mode === 'playing' && lyricsArrayRef.current[next] === "END") {
                  const vanish = setInterval(() => {
                      exitAnimationRef.current -= 0.08;
                      if (exitAnimationRef.current <= 0) {
                          clearInterval(vanish);
                          finishRecording();
                      }
                  }, 40);
              }
              
              if (mode === 'setup' && lyricsArrayRef.current[next] === "END") {
                  toggleAudition();
                  return 0;
              }
              return next;
          }
          return prev;
      });
  };

  const finishRecording = () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      setMode('contact');
      cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
  };

  const renderLoop = () => {
      draw();
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
          
          const isPlaying = !audioRef.current.paused && !audioRef.current.ended;
          if (mode === 'playing' || mode === 'setup') {
              animationFrameRef.current = requestAnimationFrame(renderLoop);
          }
      }
  };

  useEffect(() => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mode === 'setup' || mode === 'playing') {
          renderLoop();
      }
      return () => cancelAnimationFrame(animationFrameRef.current);
  }, [mode, config, selectedSong, lineIndex, isAuditioning]);

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      
      const isDynamic = mode === 'playing' || (mode === 'setup' && isAuditioning);
      const targetIdx = isDynamic ? lineIndex : (lyricsArrayRef.current.length > 1 ? 1 : 0);
      
      // Smooth Scroll Physics
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.15;
      hitPulseRef.current *= 0.92;

      // Background
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.2 * exitAnimationRef.current;
          ctx.filter = 'blur(100px) grayscale(100%)';
          ctx.drawImage(bgImageRef.current, -200, -200, w + 400, h + 400);
          
          // Small Cover Logic
          if (config.layout === 'cover') {
              ctx.filter = 'none';
              ctx.globalAlpha = 0.9 * exitAnimationRef.current;
              const baseScale = config.format === 'social' ? w * 0.75 : 520;
              const coverSize = baseScale * (1 + hitPulseRef.current * 0.06) * exitAnimationRef.current;
              const coverX = config.format === 'social' ? (w/2 - coverSize/2) : (w - coverSize - 140);
              const coverY = h/2 - coverSize/2;
              
              ctx.shadowColor = 'rgba(0,0,0,1)';
              ctx.shadowBlur = 80;
              ctx.drawImage(bgImageRef.current, coverX, coverY, coverSize, coverSize);
          }
          ctx.restore();
      }

      // -----------------------------
      // 9 MOTIONS IMPLEMENTATION
      // -----------------------------
      const lyricsX = config.alignHorizontal === 'left' ? 180 : config.alignHorizontal === 'right' ? w - 180 : w / 2;
      const lineHeight = config.fontSize === 'small' ? 110 : config.fontSize === 'large' ? 280 : 190;
      let baseOffset = h / 2;
      
      // Override center for Static mode
      if (config.motion === 'static') baseOffset = h / 2;
      else if (config.alignVertical === 'top') baseOffset = h * 0.3;
      else if (config.alignVertical === 'bottom') baseOffset = h * 0.7;

      ctx.textBaseline = 'middle';
      ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      
      const items = lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          
          if (text === "[ READY ]" && isDynamic && lineIndex > 0) return;
          if (text === "END") return;

          let relPos = i - smoothIndexRef.current;
          let dist = Math.abs(relPos);
          let y = baseOffset + (relPos * lineHeight);
          
          // Motion Physics Variables
          let alpha = 1;
          let scale = 1;
          let yOffset = 0;
          let xOffset = 0;
          let blur = 0;
          let spacing = 0;
          let isFillMode = false;

          const isLineActive = isDynamic ? Math.round(smoothIndexRef.current) === i : i === targetIdx;

          // --- MOTION LOGIC ---
          switch (config.motion) {
              case 'slide': // 經典垂直滾動
                  alpha = Math.max(0, 1 - dist * 0.35);
                  scale = isLineActive ? 1.2 + hitPulseRef.current * 0.1 : 0.9;
                  break;

              case 'fade': // 依距離透明
                  alpha = Math.max(0, 1 - dist * 0.6);
                  scale = isLineActive ? 1.1 : 0.9;
                  y = baseOffset + (relPos * (lineHeight * 0.8)); // Tighter spacing
                  break;

              case 'static': // 鎖定單行
                  if (dist > 0.6) alpha = 0;
                  else alpha = 1 - dist;
                  y = baseOffset; // Fixed Y
                  scale = isLineActive ? 1.2 + hitPulseRef.current * 0.1 : 0;
                  break;

              case 'popup': // 彈跳感
                  alpha = Math.max(0, 1 - dist * 0.4);
                  if (isLineActive) {
                      scale = 1.0 + hitPulseRef.current * 0.6; // Dramatic scale
                  } else {
                      scale = 0.6;
                  }
                  break;

              case 'mask': // 中央遮罩
                  if (dist > 1.2) alpha = 0;
                  else alpha = 1;
                  scale = 1;
                  break;

              case 'expand': // 字間距擴張 (Simulated via scaleX)
                  alpha = Math.max(0, 1 - dist * 0.4);
                  if (isLineActive) {
                      scale = 1 + hitPulseRef.current * 0.2;
                      spacing = 10 + hitPulseRef.current * 20; // Extra spacing
                  } else {
                      scale = 0.8;
                  }
                  break;

              case 'fill': // 進度條填充感 (Stroke vs Fill)
                  alpha = Math.max(0, 1 - dist * 0.3);
                  scale = isLineActive ? 1.1 : 0.9;
                  isFillMode = true; // Use special draw logic
                  break;

              case 'bubbling': // 漂浮感
                  alpha = Math.max(0, 1 - dist * 0.3);
                  yOffset = Math.sin((Date.now() / 400) + i) * 15;
                  scale = isLineActive ? 1.1 + hitPulseRef.current * 0.1 : 0.85;
                  break;
                  
              case 'wipe': // 擦拭效果 (Gradient)
                  alpha = 1;
                  scale = isLineActive ? 1.1 : 0.9;
                  if (dist > 2) alpha = 0;
                  break;

              default: // standard slide fallback
                  alpha = Math.max(0, 1 - dist * 0.3);
                  scale = 1;
          }

          if (alpha <= 0.01) return; // Optimization

          ctx.save();
          ctx.translate(lyricsX + xOffset, y + yOffset);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha * exitAnimationRef.current;

          // Font Settings
          const fontSizeVal = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 140 : 95;
          ctx.font = `900 ${fontSizeVal}px Montserrat`;

          // --- RENDER TEXT ---
          
          if (config.motion === 'wipe') {
              if (isLineActive) {
                 const gradient = ctx.createLinearGradient(-300, 0, 300, 0);
                 const progress = Math.min(1, Math.max(0, 1 - dist)); // Rough wipe progress based on scroll
                 gradient.addColorStop(0, '#fbbf24');
                 gradient.addColorStop(0.5 + hitPulseRef.current * 0.5, '#fbbf24');
                 gradient.addColorStop(1, '#ffffff');
                 ctx.fillStyle = gradient;
                 ctx.fillText(text, 0, 0);
              } else {
                 ctx.fillStyle = '#333333';
                 ctx.fillText(text, 0, 0);
              }
          } else if (config.motion === 'fill') {
               // Stroke background
               ctx.strokeStyle = '#333333';
               ctx.lineWidth = 4;
               ctx.strokeText(text, 0, 0);
               
               if (isLineActive) {
                   ctx.fillStyle = '#fbbf24';
                   ctx.fillText(text, 0, 0);
               }
          } else {
              // Standard & Other Effects
              if (config.effect === 'glow' && isLineActive) {
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 40 + hitPulseRef.current * 60;
              }

              if (config.lyricStyle === 'cutout') {
                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5; ctx.strokeText(text, 0, 0);
              } else {
                  ctx.fillStyle = isLineActive ? '#fbbf24' : '#ffffff';
                  // Simulate letter spacing for 'expand'
                  if (config.motion === 'expand' && spacing > 0) {
                      // Canvas doesn't support letter-spacing easily, simplistic approach
                      // Just scaling X more than Y to simulate expansion
                      ctx.scale(1 + (spacing/100), 1); 
                  }
                  ctx.fillText(text, 0, 0);
              }
          }

          ctx.restore();
      });

      // Watermark
      if (config.format === 'youtube' && config.layout !== 'cover') {
          ctx.save();
          ctx.globalAlpha = 1.0 * exitAnimationRef.current;
          ctx.fillStyle = '#fbbf24'; ctx.font = '900 36px Montserrat'; ctx.textAlign = 'left';
          ctx.fillText(selectedSong!.title.toUpperCase(), 140, h - 160);
          ctx.fillStyle = '#ffffff33'; ctx.font = '700 20px Montserrat';
          ctx.fillText(`Prod. Willwi`, 140, h - 110);
          ctx.restore();
      }
  };

  const toggleAudition = async () => {
      if (!audioRef.current) return;
      if (isAuditioning) { 
          audioRef.current.pause(); 
          setIsAuditioning(false); 
          setLineIndex(0); 
      } else { 
          audioRef.current.currentTime = 0;
          setLineIndex(0);
          smoothIndexRef.current = 0;
          setIsAuditioning(true);
          try { await audioRef.current.play(); } 
          catch(e) { console.error("Audio Play Error:", e); setIsAuditioning(false); }
      }
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      
      {/* SELECT & EXPLORE (合併了 Intro 與 Select) */}
      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                  {/* Header Area with Disclaimer */}
                  <div className="mb-12 border-b border-white/10 pb-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                          <div>
                              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">
                                  {t('interactive_select_title')}
                              </h2>
                              <div className="text-sm text-slate-400 max-w-2xl leading-relaxed space-y-2">
                                  <p>{t('interactive_intro_desc')}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Song Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {songs.map(song => (
                          <div key={song.id} className="bg-slate-900 border border-white/5 overflow-hidden flex flex-col shadow-lg hover:shadow-brand-gold/10 transition-shadow duration-500">
                              {/* Cover Art - UPDATED: Ensure full color (removed grayscale) */}
                              <div className="aspect-square relative group">
                                  <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
                                  
                                  <div className="absolute bottom-0 left-0 p-6 w-full">
                                      <h3 className="text-2xl font-black text-white uppercase truncate drop-shadow-md">{song.title}</h3>
                                      <p className="text-xs text-brand-gold uppercase tracking-widest">{song.releaseDate} • {song.language}</p>
                                  </div>
                              </div>

                              {/* Controls Area */}
                              <div className="p-6 bg-black flex flex-col gap-4">
                                  {/* Spotify Player - Always Visible */}
                                  {song.spotifyId ? (
                                      <iframe 
                                        src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`} 
                                        width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"
                                        className="rounded-lg bg-slate-800"
                                      ></iframe>
                                  ) : (
                                      <div className="h-20 bg-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest border border-white/5">
                                          Spotify Preview Unavailable
                                      </div>
                                  )}

                                  {/* Action Button */}
                                  <button 
                                    onClick={() => handleSelectSong(song)}
                                    className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-lg flex items-center justify-center gap-2"
                                  >
                                      <span>Create Video</span>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* GATE (Payment) */}
      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent"></div>
                  <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white mb-8">{t('interactive_gate_ticket')}</h3>
                  
                  <div className="flex items-center justify-center gap-6 mb-10 bg-black/30 p-4 rounded-lg border border-white/5">
                      <img src={selectedSong.coverUrl} className="w-20 h-20 object-cover rounded shadow-lg" alt="" />
                      <div className="text-left">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Selected Track</div>
                          <div className="text-xl font-black text-white uppercase">{selectedSong.title}</div>
                      </div>
                  </div>

                  <div className="space-y-4 mb-10 border-t border-b border-white/5 py-8">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-bold uppercase tracking-widest">Entry Fee</span>
                          <span className="text-white font-mono text-xl">NT$ 320</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed text-left mt-2">
                          {t('interactive_gate_pay_note')}
                      </p>
                  </div>

                  <button 
                    onClick={() => setShowPayment(true)}
                    className="w-full py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-lg"
                  >
                      {t('interactive_gate_pay_btn')}
                  </button>
                  <button onClick={() => setMode('select')} className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-white">Cancel</button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {/* SETUP (The Lab) */}
      {mode === 'setup' && selectedSong && (
          <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden">
              <div className="w-80 bg-black border-r border-white/5 p-8 overflow-y-auto custom-scrollbar space-y-12 hidden md:block">
                  
                  {/* NEW: Material Dashboard */}
                  <section>
                      <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Material Board</h4>
                      <div className="bg-slate-900/50 p-4 rounded border border-white/5 flex gap-4 items-center">
                          <img src={selectedSong.coverUrl} className="w-16 h-16 object-cover shadow-lg border border-white/10" alt="" />
                          <div>
                              <div className="text-[9px] text-brand-gold font-bold uppercase tracking-wider mb-1 px-1.5 py-0.5 border border-brand-gold/30 inline-block rounded">Willwi Verified</div>
                              <h5 className="text-sm font-black text-white uppercase leading-tight line-clamp-2">{selectedSong.title}</h5>
                          </div>
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Visual Motion (9 Styles)</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'expand', 'fill', 'bubbling'].map(m => (
                              <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-3 text-[9px] font-black uppercase transition-all border ${config.motion === m ? 'bg-white text-black border-white' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/50 hover:text-white'}`}>
                                  {m}
                              </button>
                          ))}
                      </div>
                  </section>
                  <section>
                      <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Text Layout</h4>
                      <div className="space-y-2">
                          {['youtube', 'social'].map(f => (
                              <button key={f} onClick={() => setConfig({...config, format: f as any})} className={`w-full py-3 text-[9px] font-black uppercase transition-all border flex justify-between px-4 ${config.format === f ? 'bg-white text-black border-white' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/50'}`}>
                                  <span>{f === 'youtube' ? '16:9' : '9:16'}</span>
                                  <span>{f === 'youtube' ? '📺' : '📱'}</span>
                              </button>
                          ))}
                      </div>
                  </section>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950 relative">
                  <div 
                    className="flex-1 flex items-center justify-center p-4 md:p-12 bg-slate-900/50"
                  >
                      <div 
                        className={`shadow-2xl border border-white/10 overflow-hidden transition-all duration-700 bg-black cursor-pointer ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[70vh]' : 'aspect-video w-full max-w-5xl'}`}
                        onMouseDown={isAuditioning ? handleLineClick : undefined}
                        onTouchStart={isAuditioning ? handleLineClick : undefined}
                      >
                          <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  <div className="bg-black border-t border-white/10 p-6 flex items-center gap-6">
                      <div className="flex flex-col items-center gap-2">
                          <button onClick={toggleAudition} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform shadow-lg rounded-full ${isAuditioning ? 'bg-brand-gold text-black' : 'bg-white text-black'}`}>
                              {isAuditioning ? <div className="w-4 h-4 bg-black"></div> : <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-[14px] border-l-black ml-1"></div>}
                          </button>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{isAuditioning ? 'STOP' : 'PRACTICE'}</span>
                      </div>
                      
                      <div className="flex-grow pl-4 border-l border-white/10 hidden md:block">
                           <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">
                              <span className={`${isAuditioning ? 'text-brand-gold animate-pulse' : ''}`}>
                                  {isAuditioning ? 'PRESS SPACEBAR TO SYNC' : 'PREVIEW MODE'}
                              </span>
                              <span>{selectedSong.title}</span>
                          </div>
                          <div className="h-10 bg-white/[0.02] flex items-end gap-[2px] border-b border-white/5">
                              {Array.from({ length: 100 }).map((_, i) => (
                                  <div key={i} className={`w-full transition-all duration-100 ${ (i / 100) < (currentTime / duration) ? 'bg-brand-gold' : 'bg-slate-800' }`} 
                                       style={{ height: `${(Math.sin(i * 0.2) * 40 + 50) * (isAuditioning ? Math.random() : 0.2)}%`, opacity: (i / 100) < (currentTime / duration) ? 1 : 0.3 }}></div>
                              ))}
                          </div>
                      </div>
                      
                      <button onClick={startRecording} className="ml-auto px-8 py-4 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all transform hover:scale-105 shadow-xl whitespace-nowrap">
                          START REC
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* RECORDING MODE */}
      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in cursor-none">
              <div className="absolute top-10 left-10 z-[300] flex items-center gap-4 pointer-events-none">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_30px_red]"></div>
                  <span className="text-lg font-black uppercase tracking-[0.4em] text-white">REC • {currentTime.toFixed(1)}s</span>
              </div>
              <div className="absolute inset-0 z-[200] cursor-pointer" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              
              <div className="flex-1 flex items-center justify-center bg-black">
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              <div className="bg-[#020202] p-12 flex justify-between items-center border-t border-white/10 relative z-[300]">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-brand-gold font-bold uppercase mb-2 animate-pulse tracking-[0.2em]">WAITING FOR INPUT...</span>
                      <span className="text-4xl font-black text-white uppercase truncate max-w-4xl tracking-tight opacity-50">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-12 py-6 border border-red-900 text-red-600 text-xs font-black uppercase tracking-[0.4em] hover:bg-red-900 hover:text-white transition-all pointer-events-auto">Abort</button>
              </div>
          </div>
      )}

      {/* CONTACT FORM */}
      {mode === 'contact' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
              <h2 className="text-5xl font-black uppercase mb-12 tracking-tighter text-white">Production Wrapped</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-8 bg-slate-900 p-16 border border-white/10 shadow-2xl max-w-2xl w-full">
                  <div className="space-y-2">
                      <label className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.2em]">Director Name</label>
                      <input type="text" required className="w-full bg-black border border-white/20 p-4 text-white text-xl focus:border-brand-gold outline-none font-bold uppercase tracking-widest" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} autoFocus placeholder="YOUR NAME" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all mt-8">Confirm & Export</button>
              </form>
          </div>
      )}

      {/* FINISHED */}
      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <div className="relative">
                  <div className="absolute inset-0 bg-brand-gold blur-[100px] opacity-20"></div>
                  <h2 className="text-[8rem] font-black uppercase mb-10 tracking-tighter text-white leading-none relative z-10">SAVED</h2>
              </div>
              <div className="bg-slate-900 p-12 border border-white/10 shadow-2xl space-y-8 max-w-md w-full text-center relative z-10">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-8">Your unique video is ready.</p>
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("System Packing...");
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}_${contactInfo.name}.webm`; a.click(); 
                    }} 
                    className="w-full py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all shadow-lg"
                   >Download Video</button>
                   <button onClick={() => setMode('select')} className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] hover:text-white hover:border-white transition-all">Back to Lobby</button>
              </div>
          </div>
      )}

      {selectedSong && (
          <audio 
            ref={audioRef} 
            src={convertToDirectStream(selectedSong.audioUrl)} 
            crossOrigin="anonymous" 
            className="hidden" 
            onCanPlayThrough={() => setIsAudioReady(true)}
            onError={() => { setIsAudioReady(false); }}
          />
      )}
    </div>
  );
};

export default Interactive;