
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

// Mode State Machine
type InteractionMode = 'intro' | 'select' | 'gate' | 'setup' | 'playing' | 'rendering' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  // Audio CORS State (Fallback mechanism)
  const [corsMode, setCorsMode] = useState<'anonymous' | undefined>('anonymous');
  
  // Help Modal State
  const [showHelp, setShowHelp] = useState(false);
  
  // Visual Config (Preset for Willwi)
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
  
  // Web Audio Context for Stream Merging
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Filter only active songs
  const activeSongs = songs.filter(s => s.isInteractiveActive);

  useEffect(() => {
      const params = new URLSearchParams(location.search);
      if (params.get('payment') === 'success') {
          if (!selectedSong) setMode('select');
          else setMode('setup'); 
      }
      
      if (location.state?.targetSongId) {
          const s = songs.find(x => x.id === location.state.targetSongId);
          if (s) {
              setSelectedSong(s);
              setMode('gate');
          }
      } else if (location.state?.initialMode) {
          setMode(location.state.initialMode as InteractionMode);
      }
  }, [location.search, songs, location.state]);

  // Key Listener for PC
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
      setCorsMode('anonymous'); // Reset CORS mode for new song
      setIsAudioReady(false);
      setMode('gate');
  };

  const handleAudioError = () => {
      console.warn("Audio Load Error encountered.");
      if (corsMode === 'anonymous') {
          console.warn("Attempting fallback to non-CORS mode (Recording audio might be disabled, but playback will work).");
          setCorsMode(undefined); // Retry without CORS
          // Audio element will reload due to prop change
      } else {
          setIsAudioReady(false);
          alert("無法載入音檔。請檢查連結是否有效。");
      }
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      // Parse lyrics
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ READY ]", ...rawLines, "END"];
      
      // Load Cover
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = convertToDirectStream(selectedSong.coverUrl);
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('setup');
      setLineIndex(0);
      setIsAuditioning(false);
      // Auto-show help on first entry to Setup
      setShowHelp(true);
  };

  const toggleAudition = async () => {
      if (!isAuditioning) {
          // Fix: Resume AudioContext if it exists and is suspended (e.g. from previous record attempt)
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              try { await audioContextRef.current.resume(); } catch(e) {}
          }

          // Start Practice
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.volume = 1.0; 
              audioRef.current.play().catch(e => {
                  console.error("Play failed", e);
                  alert("播放失敗。請點擊畫面任一處以啟用音訊權限，或檢查音檔連結是否有效。");
              });
          }
          setLineIndex(0);
          smoothIndexRef.current = 0;
          setIsAuditioning(true);
      } else {
          // Stop Practice
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
          setLineIndex(0);
          smoothIndexRef.current = 0;
          setIsAuditioning(false);
      }
  };

  const getSupportedMimeType = () => {
      const types = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264',
          'video/webm',
          'video/mp4'
      ];
      for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
              return type;
          }
      }
      return ''; 
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

      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      exitAnimationRef.current = 1;
      setRecordedChunks([]);
      
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0;

      try {
          // --- AUDIO GRAPH SETUP ---
          // Only attempt Web Audio capture if CORS mode is anonymous (secure).
          // If we fell back to undefined (insecure), we skip capture to avoid silence/errors.
          let audioTrack: MediaStreamTrack | null = null;

          if (corsMode === 'anonymous') {
              if (!audioContextRef.current) {
                  audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();

              const dest = ctx.createMediaStreamDestination();
              
              if (!audioSourceRef.current) {
                  audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
              } else {
                  // Clean up previous connections to avoid multi-routing issues
                  try { audioSourceRef.current.disconnect(); } catch(e) {}
              }
              
              // Connect for Recording
              audioSourceRef.current.connect(dest);
              // Connect for Hearing (Speakers)
              audioSourceRef.current.connect(ctx.destination); 
              
              if (dest.stream.getAudioTracks().length > 0) {
                  audioTrack = dest.stream.getAudioTracks()[0];
              }
          } else {
              console.warn("Recording in Non-CORS mode. Audio will NOT be in the video file, but playback works.");
          }

          const canvasStream = (canvasRef.current as any).captureStream(30);
          const tracks = [...canvasStream.getVideoTracks()];
          if (audioTrack) tracks.push(audioTrack);

          const combinedStream = new MediaStream(tracks);

          const mimeType = getSupportedMimeType();
          const options = mimeType ? { mimeType, videoBitsPerSecond: 5000000 } : { videoBitsPerSecond: 5000000 };

          const recorder = new MediaRecorder(combinedStream, options);

          const chunks: Blob[] = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          
          recorder.onstop = () => {
              setRecordedChunks(chunks);
              setMode('contact');
          };

          mediaRecorderRef.current = recorder;
          recorder.start(100); 
          
          await audioRef.current.play();
          renderLoop();
      } catch (e) { 
          console.error(e); 
          alert("Recording init failed. Proceeding with video-only capture.");
          // Fallback if audio graph fails
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
                      exitAnimationRef.current -= 0.05;
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
      if (audioRef.current) audioRef.current.pause();
      setMode('rendering');
      cancelAnimationFrame(animationFrameRef.current);
      setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
      }, 500);
  };

  const renderLoop = () => {
      draw();
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
          
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
      
      // Physics for Motion
      if (config.motion === 'slide') {
          // Classic Scroll: Smooth interpolation
          smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.12; 
      } else if (config.motion === 'static') {
          // Flash: Instant snap
          smoothIndexRef.current = targetIdx; 
      } else {
          // Cinema: Slower fade interpolation
          smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.08;
      }
      
      hitPulseRef.current *= 0.9;

      // --- 1. BACKGROUND RENDER ---
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          // Cinema Mode gets darker, blurrier background
          const isCinema = config.motion === 'fade';
          
          ctx.globalAlpha = (isCinema ? 0.3 : 0.4) * exitAnimationRef.current;
          // Heavy blur for atmosphere
          ctx.filter = isCinema ? 'blur(120px) brightness(0.6)' : 'blur(80px) brightness(0.7)';
          
          // Draw image covering canvas while maintaining aspect ratio
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
          // Scale up slightly to avoid edge bleed from blur
          const scale = 1.2;
          ctx.drawImage(img, offsetX - (renderW * (scale-1))/2, offsetY - (renderH * (scale-1))/2, renderW * scale, renderH * scale);
          
          // Optional: Vignette
          const gradient = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          
          // --- COVER MODE RENDER ---
          if (config.layout === 'cover') {
              ctx.filter = 'none';
              ctx.globalAlpha = 1.0 * exitAnimationRef.current;
              
              // Responsive cover size
              const baseScale = config.format === 'social' ? w * 0.75 : h * 0.55;
              const coverSize = baseScale * (1 + hitPulseRef.current * 0.02);
              
              // Position
              const coverX = config.format === 'social' ? (w/2 - coverSize/2) : (w * 0.7 - coverSize/2);
              const coverY = config.format === 'social' ? (h * 0.35 - coverSize/2) : (h/2 - coverSize/2);
              
              // Album Art Shadow
              ctx.shadowColor = 'rgba(0,0,0,0.6)';
              ctx.shadowBlur = 60;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 30;
              
              // Draw Cover
              ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
              
              // Reset Shadow
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.shadowOffsetY = 0;
          }
          ctx.restore();
      }

      // --- 2. LYRICS RENDER ---
      // Determine Text Position based on Layout
      let lyricsX = w / 2; // Default Center
      if (config.layout === 'cover' && config.format === 'youtube') lyricsX = w * 0.25; // Left side for PC Cover mode
      else if (config.layout === 'cover' && config.format === 'social') lyricsX = w / 2; // Center for Mobile Cover mode (below cover)
      else if (config.alignHorizontal === 'left') lyricsX = 180;
      else if (config.alignHorizontal === 'right') lyricsX = w - 180;

      const baseFontSize = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 110 : 70;
      const lineHeight = baseFontSize * 1.8;
      
      // Vertical Center Base
      let centerOffset = h / 2;
      if (config.layout === 'cover' && config.format === 'social') centerOffset = h * 0.75; // Move text down for mobile cover

      ctx.textAlign = 'center'; // Default
      if (config.layout === 'cover' && config.format === 'youtube') ctx.textAlign = 'center';
      else if (config.alignHorizontal) ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      
      ctx.textBaseline = 'middle';
      
      const items = lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          
          if (text === "[ READY ]" && isDynamic && lineIndex > 0) return;
          if (text === "END") return;

          let relPos = i - smoothIndexRef.current; // Relative position from current line
          let dist = Math.abs(relPos);
          
          let y = centerOffset + (relPos * lineHeight);
          let alpha = 0;
          let scale = 1;
          let blur = 0;

          const isLineActive = Math.round(smoothIndexRef.current) === i;

          // --- MOTION LOGIC ---
          if (config.motion === 'slide') {
              // SCROLL: Apple Music Style
              // Active line is big and bright. Others fade out quickly.
              if (dist < 4) {
                  alpha = 1 - (dist * 0.35);
                  scale = isLineActive ? 1.05 + hitPulseRef.current * 0.03 : 0.9;
                  blur = isLineActive ? 0 : dist * 2; // Blur non-active lines
              }
          } else if (config.motion === 'fade') {
              // CINEMA: Only one line at center, fades in/out
              y = centerOffset; // Force center
              if (dist < 0.5) {
                  alpha = 1 - (dist * 2);
                  scale = 1.0 + (1-dist)*0.1 + hitPulseRef.current * 0.05;
                  blur = dist * 10;
              } else {
                  alpha = 0; // Hide others
              }
          } else if (config.motion === 'static') {
              // FLASH: Instant, no interpolation effects
              y = centerOffset;
              if (i === targetIdx) {
                  alpha = 1;
                  scale = 1.05 + hitPulseRef.current * 0.1;
              } else {
                  alpha = 0;
              }
          }

          if (alpha > 0.01) {
              ctx.save();
              ctx.translate(lyricsX, y);
              ctx.scale(scale, scale);
              ctx.globalAlpha = alpha * exitAnimationRef.current;
              
              if (blur > 0) ctx.filter = `blur(${blur}px)`;
              
              // Font Weight: Active is heavier
              ctx.font = `${isLineActive ? 900 : 600} ${baseFontSize}px Montserrat, "Noto Sans TC", sans-serif`;
              
              // Color Logic
              if (isLineActive) {
                  ctx.fillStyle = '#ffffff';
                  // Glow Effect for Active Line
                  if (config.effect === 'glow') {
                      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)'; // Brand Gold
                      ctx.shadowBlur = 30 + hitPulseRef.current * 30;
                  }
              } else {
                  ctx.fillStyle = 'rgba(255,255,255,0.4)'; // Dim inactive
                  ctx.shadowBlur = 0;
              }

              // Text Stroke (Optional for better visibility)
              // ctx.lineWidth = 2;
              // ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              // ctx.strokeText(text, 0, 0);

              ctx.fillText(text, 0, 0);
              ctx.restore();
          }
      });

      // --- 3. METADATA / WATERMARK ---
      // Only show on YouTube format or if specified, subtle branding
      if (config.layout !== 'cover' || config.format === 'youtube') {
          ctx.save();
          ctx.globalAlpha = 0.8 * exitAnimationRef.current;
          
          const metaX = config.format === 'social' ? w/2 : 100;
          const metaY = config.format === 'social' ? h - 200 : h - 100;
          const align = config.format === 'social' ? 'center' : 'left';
          
          ctx.textAlign = align;

          // Song Title
          ctx.fillStyle = '#fbbf24';
          ctx.font = '900 32px Montserrat';
          if (config.motion === 'fade') ctx.font = '900 40px Montserrat'; // Bigger for cinema
          
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 10;
          
          ctx.fillText(selectedSong!.title.toUpperCase(), metaX, metaY);
          
          // Artist
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.font = '700 18px Montserrat';
          ctx.fillText(`Prod. Willwi`, metaX, metaY + 35);
          
          ctx.restore();
      }
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans selection:bg-brand-gold selection:text-black">
      
      {/* INTRO */}
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.1)_0%,_transparent_70%)]"></div>
              <div className="max-w-2xl text-center z-10 space-y-12">
                  <div className="border border-brand-gold/30 inline-block px-4 py-1 text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mb-4">
                      {t('interactive_intro_method')}
                  </div>
                  
                  {/* DISCLAIMER TEXT BLOCK - Styled to match screenshot emphasis */}
                  <div className="space-y-8 relative">
                      <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-brand-gold/50 to-transparent"></div>
                      
                      <div className="space-y-4">
                           <p className="text-xl md:text-2xl text-white font-bold leading-relaxed tracking-widest">
                               本平台所提供之內容<br/>
                               <span className="text-brand-accent">並非購買歌曲、歌詞或任何數位商品</span><br/>
                               <span className="text-brand-accent">亦不涉及著作權授權、轉讓或下載行為</span>
                           </p>
                      </div>

                      <div className="w-10 h-px bg-white/20 mx-auto"></div>

                      <div className="space-y-4">
                           <p className="text-sm md:text-lg text-slate-300 font-medium leading-relaxed tracking-widest">
                               <span className="text-brand-accent">相關費用係用於支持創作者投入之人工時間</span><br/>
                               <span className="text-brand-accent">包含手工歌詞對位與創作引導之參與過程</span>
                           </p>
                      </div>

                      <div className="w-10 h-px bg-white/20 mx-auto"></div>

                      <div className="space-y-4">
                           <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed tracking-widest">
                               如僅需聆聽音樂，請至各大音樂平台收聽<br/>
                               <span className="text-white font-bold">這裡不是購買歌曲，而是邀請您支持創作</span>
                           </p>
                      </div>
                  </div>

                  <button onClick={() => setMode('select')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all text-xs shadow-[0_0_30px_rgba(255,255,255,0.2)] mt-8">
                      {t('interactive_btn_participate')}
                  </button>
              </div>
          </div>
      )}

      {/* SELECT */}
      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">{t('interactive_select_title')}</h3>
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-10">{t('interactive_select_subtitle')}</p>
                  
                  {activeSongs.length === 0 ? (
                      <div className="p-20 text-center border border-white/10 text-slate-500 uppercase tracking-widest">{t('interactive_select_empty')}</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {activeSongs.map(song => (
                              <div key={song.id} className="bg-slate-900 border border-white/5 overflow-hidden flex flex-col shadow-lg hover:shadow-brand-gold/10 transition-shadow duration-500">
                                  {/* Cover */}
                                  <div className="aspect-square relative group cursor-pointer" onClick={() => handleSelectSong(song)}>
                                      <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0" alt="" />
                                      <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-all flex items-center justify-center">
                                          <span className="opacity-0 group-hover:opacity-100 bg-brand-gold text-black px-4 py-2 font-black text-xs uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-all">{t('interactive_select_start')}</span>
                                      </div>
                                  </div>
                                  <div className="p-5 flex flex-col gap-4">
                                      <div>
                                          <h4 className="text-white font-black uppercase truncate text-lg">{song.title}</h4>
                                          <p className="text-slate-500 text-[10px] uppercase tracking-widest">Willwi • {song.releaseDate}</p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
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
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative bg-[#050505]">
              {/* Help Modal */}
              {showHelp && (
                  <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowHelp(false)}>
                      <div className="bg-slate-900 border border-white/10 max-w-lg w-full p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                          <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-8 border-b border-white/10 pb-4">Studio Guide</h3>
                          
                          <div className="space-y-8">
                              <div className="space-y-3">
                                  <h4 className="text-brand-gold text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                      <span className="w-2 h-2 bg-brand-gold rounded-full"></span>
                                      Visual Style (視覺風格)
                                  </h4>
                                  <ul className="text-xs text-slate-300 space-y-3 pl-4 border-l border-white/10 ml-1">
                                      <li className="flex flex-col gap-1">
                                          <strong className="text-white text-[11px] uppercase tracking-wider">SCROLL (經典)</strong>
                                          <span className="text-[10px] text-slate-500">KTV 式的平滑滾動，最安全的選擇。</span>
                                      </li>
                                      <li className="flex flex-col gap-1">
                                          <strong className="text-white text-[11px] uppercase tracking-wider">CINEMA (電影)</strong>
                                          <span className="text-[10px] text-slate-500">淡入淡出，固定置中，適合慢歌與意境。</span>
                                      </li>
                                      <li className="flex flex-col gap-1">
                                          <strong className="text-white text-[11px] uppercase tracking-wider">FLASH (極簡)</strong>
                                          <span className="text-[10px] text-slate-500">瞬間切換無過場，適合節奏強烈的快歌。</span>
                                      </li>
                                  </ul>
                              </div>
                              <div className="space-y-3">
                                  <h4 className="text-brand-gold text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                      <span className="w-2 h-2 bg-brand-gold rounded-full"></span>
                                      How to Play (操作方式)
                                  </h4>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                      這是一個節奏遊戲。當你聽到歌手唱出<strong className="text-white mx-1">每一句的第一個字</strong>時：
                                  </p>
                                  <div className="grid grid-cols-2 gap-4 mt-2">
                                      <div className="bg-white/5 p-4 text-center rounded border border-white/10">
                                          <span className="block text-[9px] text-slate-500 uppercase mb-2">PC 電腦</span>
                                          <div className="inline-block px-3 py-1 bg-white text-black font-bold text-xs rounded">SPACE 空白鍵</div>
                                      </div>
                                      <div className="bg-white/5 p-4 text-center rounded border border-white/10">
                                          <span className="block text-[9px] text-slate-500 uppercase mb-2">Mobile 手機</span>
                                          <div className="inline-block px-3 py-1 bg-white text-black font-bold text-xs rounded">TAP 點擊螢幕</div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <button onClick={() => setShowHelp(false)} className="w-full mt-8 py-3 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">
                              I Understand (我了解了)
                          </button>
                      </div>
                  </div>
              )}

              {/* Controls Sidebar */}
              <div className="w-full md:w-80 bg-slate-950 border-r border-white/5 p-6 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                  <div className="mb-6 flex justify-between items-center">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm">Control Panel</h4>
                      <button onClick={() => setShowHelp(true)} className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/50 px-2 py-1 rounded hover:bg-brand-gold hover:text-black transition-all font-bold">HELP</button>
                  </div>
                  
                  <div className="space-y-8">
                      {/* Visual Config 1: Motion */}
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Visual Style</div>
                          <div className="grid grid-cols-1 gap-2">
                              {[
                                  { id: 'slide', label: 'SCROLL', sub: '經典滾動' },
                                  { id: 'fade', label: 'CINEMA', sub: '電影淡入' },
                                  { id: 'static', label: 'FLASH', sub: '極簡切換' }
                              ].map((m) => (
                                  <button 
                                      key={m.id}
                                      onClick={() => setConfig({...config, motion: m.id as any})} 
                                      className={`flex items-center justify-between p-3 border transition-all rounded-sm group ${config.motion === m.id ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                  >
                                      <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                                      <span className={`text-[9px] opacity-60 uppercase tracking-wider ${config.motion === m.id ? 'text-black' : 'group-hover:text-white'}`}>{m.sub}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* Visual Config 2: Format & Layout */}
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Canvas Format</div>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                              <button onClick={() => setConfig({...config, format: 'youtube'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm flex flex-col items-center gap-1 ${config.format === 'youtube' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:text-white'}`}>
                                  <span className="w-6 h-3 border border-current mb-1"></span> 16:9 (PC)
                              </button>
                              <button onClick={() => setConfig({...config, format: 'social'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm flex flex-col items-center gap-1 ${config.format === 'social' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:text-white'}`}>
                                  <span className="w-3 h-5 border border-current mb-1"></span> 9:16 (Mobile)
                              </button>
                          </div>
                          
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Composition</div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, layout: 'lyrics'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.layout === 'lyrics' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:text-white'}`}>Lyrics Only</button>
                              <button onClick={() => setConfig({...config, layout: 'cover'})} className={`py-3 text-[9px] font-black uppercase border rounded-sm ${config.layout === 'cover' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:text-white'}`}>Cover Mode</button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto pt-8 space-y-3">
                      <div className="text-center mb-2">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest animate-pulse">Ready to sync?</p>
                      </div>
                      <button onClick={toggleAudition} className={`w-full py-4 border font-black uppercase text-[10px] tracking-[0.2em] transition-all rounded-sm ${isAuditioning ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:bg-white/10'}`}>
                          {isAuditioning ? 'STOP PREVIEW' : 'PRACTICE MODE (試玩)'}
                      </button>
                      <button onClick={startRecording} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] rounded-sm">
                          {t('interactive_btn_start_record')}
                      </button>
                  </div>
              </div>

              {/* Canvas Preview Area */}
              <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-4 md:p-10 overflow-hidden" 
                   onMouseDown={isAuditioning ? handleLineClick : undefined}
                   onTouchStart={isAuditioning ? handleLineClick : undefined}
              >
                  {/* Guide Overlay in Setup Mode */}
                  {!isAuditioning && (
                      <div className="absolute top-6 left-0 w-full text-center z-10 pointer-events-none">
                          <span className="bg-black/50 border border-white/10 text-slate-400 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest backdrop-blur-md">
                              Preview Mode • Setup your visual style
                          </span>
                      </div>
                  )}

                  <div className={`shadow-2xl border border-white/5 transition-all duration-700 bg-black relative ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[85vh]' : 'aspect-video w-full max-w-6xl'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
      )}

      {/* RECORDING MODE */}
      {mode === 'playing' && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in cursor-none select-none">
              <div className="absolute top-10 left-10 z-[200] flex items-center gap-4 pointer-events-none">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_20px_red]"></div>
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-white font-mono">{currentTime.toFixed(1)}s</span>
              </div>
              
              {/* Full Screen Capture Area */}
              <div className="flex-1 flex items-center justify-center bg-black" onMouseDown={handleLineClick} onTouchStart={handleLineClick}>
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              {/* Interaction Hint Overlay */}
              <div className="absolute bottom-10 w-full text-center pointer-events-none">
                   <div className="inline-block bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full">
                       <p className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.3em] animate-pulse">
                           {t('interactive_recording_hint_desktop')}
                       </p>
                   </div>
              </div>

              {/* Abort Button */}
              <button onClick={finishRecording} className="absolute top-10 right-10 pointer-events-auto px-6 py-2 border border-white/20 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-red-900/50 hover:text-white hover:border-red-500 transition-all backdrop-blur-md rounded-sm">ABORT / FINISH</button>
          </div>
      )}

      {/* RENDERING / PACKAGING STATE */}
      {mode === 'rendering' && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center animate-fade-in">
              <div className="relative">
                  <div className="w-20 h-20 border-4 border-slate-800 border-t-brand-gold rounded-full animate-spin mb-10"></div>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-4">Rendering Video</h3>
              <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">
                  High Quality Export (5Mbps)<br/>
                  Please do not close this tab.
              </p>
          </div>
      )}

      {/* CONTACT & EXPORT */}
      {mode === 'contact' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
              <h2 className="text-5xl font-black uppercase mb-12 tracking-tighter text-white">Production Wrapped</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-8 bg-slate-900 p-16 border border-white/10 shadow-2xl max-w-2xl w-full">
                  <div className="space-y-2">
                      <label className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.2em]">{t('interactive_input_name')}</label>
                      <input type="text" required className="w-full bg-black border border-white/20 p-4 text-white text-xl focus:border-brand-gold outline-none font-bold uppercase tracking-widest" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} autoFocus placeholder="YOUR NAME" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all mt-8 shadow-lg">CONFIRM & EXPORT</button>
              </form>
          </div>
      )}

      {/* FINISHED */}
      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              {/* WARM ENDING MESSAGE */}
              <div className="text-center mb-16 space-y-4 max-w-3xl">
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 leading-tight">
                      {t('interactive_finished_desc').split('\n').map((line, i) => (
                          <span key={i} className="block">{line}</span>
                      ))}
                  </h2>
                  <div className="w-16 h-1 bg-brand-gold mx-auto"></div>
              </div>

              <div className="bg-slate-900 p-12 border border-white/10 shadow-2xl space-y-6 max-w-md w-full text-center relative z-10">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">{t('interactive_finished_warning')}</p>
                   
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("System Packing...");
                        const blob = new Blob(recordedChunks, { type: 'video/mp4' }); 
                        const url = URL.createObjectURL(blob); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}_${contactInfo.name}.mp4`; a.click(); 
                    }} 
                    className="w-full py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all shadow-lg rounded-sm"
                   >{t('interactive_btn_save_video')}</button>
                   
                   <div className="pt-6 border-t border-white/5">
                        <button onClick={() => setMode('select')} className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] hover:text-white hover:border-white transition-all rounded-sm">{t('interactive_btn_return')}</button>
                   </div>
              </div>
          </div>
      )}

      {selectedSong && (
          <audio 
            ref={audioRef} 
            src={convertToDirectStream(selectedSong.audioUrl)} 
            crossOrigin={corsMode} // Dynamic CORS mode
            className="hidden" 
            onCanPlayThrough={() => setIsAudioReady(true)}
            onError={handleAudioError} // Robust Error Handling
          />
      )}
    </div>
  );
};

export default Interactive;
