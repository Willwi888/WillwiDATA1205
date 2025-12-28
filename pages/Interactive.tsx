
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
          // If returned from payment successfully, unlock gate
          // If no song selected, go to selection
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
      setMode('gate');
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      setIsAudioReady(false);
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

  const toggleAudition = () => {
      if (!isAuditioning) {
          // Start Practice
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.error("Play failed", e));
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

  // Helper: Find best supported MIME type for Mobile compatibility
  const getSupportedMimeType = () => {
      const types = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264',
          'video/webm',
          'video/mp4' // Some newer browsers support this via MediaRecorder
      ];
      for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
              console.log(`Using MIME Type: ${type}`);
              return type;
          }
      }
      return ''; // Let browser choose default
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

      // Initialize Audio Context for Recording
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
          const canvasStream = (canvasRef.current as any).captureStream(30); // Lower FPS for mobile stability
          const dest = ctx.createMediaStreamDestination();
          
          if (!audioSourceRef.current) {
              audioSourceRef.current = ctx.createMediaElementSource(audioRef.current);
          }
          audioSourceRef.current.connect(dest);
          audioSourceRef.current.connect(ctx.destination); // Hear it

          // Combine
          const combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
          ]);

          const mimeType = getSupportedMimeType();
          const options = mimeType ? { mimeType, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 }; // 2.5 Mbps is enough for mobile webm

          const recorder = new MediaRecorder(combinedStream, options);

          const chunks: Blob[] = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          
          // Important: Handle stop to move state
          recorder.onstop = () => {
              setRecordedChunks(chunks);
              setMode('contact'); // Only move to contact after data is ready
          };

          mediaRecorderRef.current = recorder;
          recorder.start(100); 
          
          await audioRef.current.play();
          renderLoop();
      } catch (e) { 
          console.error(e); 
          alert("Recording failed to initialize. Mobile browser might restrict capture.");
          setMode('setup');
      }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      const isInteractive = mode === 'playing' || (mode === 'setup' && isAuditioning);
      if (!isInteractive || !audioRef.current) return;

      // Debounce slightly
      const now = Date.now();
      if (now - lastTapTimeRef.current < 70) return;
      lastTapTimeRef.current = now;

      hitPulseRef.current = 1.0; 
      
      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              
              // Check for END in real recording
              if (mode === 'playing' && lyricsArrayRef.current[next] === "END") {
                  // Trigger finish sequence
                  const vanish = setInterval(() => {
                      exitAnimationRef.current -= 0.08;
                      if (exitAnimationRef.current <= 0) {
                          clearInterval(vanish);
                          finishRecording();
                      }
                  }, 40);
              }
              
              // Loop in practice
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
      // 1. Pause Audio First
      if (audioRef.current) audioRef.current.pause();
      
      // 2. Set UI to Rendering (Packaging)
      setMode('rendering');
      cancelAnimationFrame(animationFrameRef.current);

      // 3. Stop Recorder after small delay to flush buffer
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
      
      // Physics
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.15;
      hitPulseRef.current *= 0.92;

      // Draw Background
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          // Cinema Style: Blurred background always
          ctx.globalAlpha = 0.2 * exitAnimationRef.current;
          ctx.filter = 'blur(100px) grayscale(100%)';
          ctx.drawImage(bgImageRef.current, -200, -200, w + 400, h + 400);
          
          // Cover Art (Square) - Show if layout is cover
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

      // Draw Lyrics
      const lyricsX = config.alignHorizontal === 'left' ? 180 : config.alignHorizontal === 'right' ? w - 180 : w / 2;
      const baseFontSize = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 120 : 80;
      const lineHeight = baseFontSize * 2.2;
      const centerOffset = h / 2;

      ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      
      const items = lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          
          if (text === "[ READY ]" && isDynamic && lineIndex > 0) return; // Hide Ready
          if (text === "END") return; // Don't draw END marker

          let relPos = i - smoothIndexRef.current;
          let dist = Math.abs(relPos);
          let y = centerOffset + (relPos * lineHeight);
          
          let alpha = 1;
          let scale = 1;
          let blur = 0;
          let yOffset = 0;

          const isLineActive = isDynamic ? Math.round(smoothIndexRef.current) === i : i === targetIdx;

          // --- MOTION LOGIC ---
          if (config.motion === 'slide') {
              // Classic vertical scroll
              alpha = Math.max(0, 1 - dist * 0.35);
              if (dist > 3) alpha = 0;
              scale = isLineActive ? 1.1 + hitPulseRef.current * 0.1 : 0.9;
          } else if (config.motion === 'fade') {
              // Fade in center, others invisible
              alpha = Math.max(0, 1 - dist * 0.8); // Sharp falloff
              y = centerOffset + (relPos * (lineHeight * 0.5)); // Tighter spacing
              scale = isLineActive ? 1.1 + hitPulseRef.current * 0.05 : 0.8;
          } else if (config.motion === 'static') {
              // Single line replacement
              alpha = isLineActive ? 1 : 0;
              if (dist > 0.6) alpha = 0; // Quick cutoff
              y = centerOffset; // Fixed position
              scale = isLineActive ? 1 + hitPulseRef.current * 0.2 : 0;
          } else {
              // Default Slide
              alpha = Math.max(0, 1 - dist * 0.4);
          }

          if (alpha > 0.01) {
              ctx.save();
              ctx.translate(lyricsX, y);
              ctx.scale(scale, scale);
              ctx.globalAlpha = alpha * exitAnimationRef.current;
              
              if (blur > 0) ctx.filter = `blur(${blur}px)`;
              
              ctx.font = `900 ${baseFontSize}px Montserrat`;
              
              // Color Logic
              if (isLineActive) {
                  ctx.fillStyle = '#ffffff';
                  // Glow Effect
                  if (config.effect === 'glow') {
                      ctx.shadowColor = '#fbbf24';
                      ctx.shadowBlur = 40 + hitPulseRef.current * 60;
                  }
              } else {
                  ctx.fillStyle = '#666666';
                  ctx.shadowBlur = 0;
              }

              ctx.fillText(text, 0, 0);
              ctx.restore();
          }
      });

      // Watermark
      if (config.format === 'youtube' && config.layout !== 'cover') {
          ctx.save();
          ctx.globalAlpha = 1.0 * exitAnimationRef.current;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '900 36px Montserrat';
          ctx.textAlign = 'left';
          ctx.fillText(selectedSong!.title.toUpperCase(), 140, h - 160);
          ctx.fillStyle = '#ffffff33';
          ctx.font = '700 20px Montserrat';
          ctx.fillText(`Prod. Willwi`, 140, h - 110);
          ctx.restore();
      }
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      
      {/* INTRO */}
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.1)_0%,_transparent_70%)]"></div>
              <div className="max-w-2xl text-center z-10 space-y-8">
                  <div className="border border-brand-gold/30 inline-block px-4 py-1 text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mb-4">
                      {t('interactive_intro_method')}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                      {t('interactive_intro_title')}
                  </h2>
                  <p className="text-sm md:text-base text-slate-400 leading-loose whitespace-pre-line tracking-widest font-light">
                      {t('interactive_intro_desc')}
                  </p>
                  <button onClick={() => setMode('select')} className="px-10 py-4 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all text-xs shadow-[0_0_30px_rgba(255,255,255,0.2)]">
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
                                      {/* Spotify Embed for Preview */}
                                      {song.spotifyId && (
                                          <div className="rounded-lg overflow-hidden h-[80px]">
                                              <iframe src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                                          </div>
                                      )}
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
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative">
              {/* Help Modal */}
              {showHelp && (
                  <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowHelp(false)}>
                      <div className="bg-slate-900 border border-white/10 max-w-lg w-full p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                          <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-6">How to Play</h3>
                          
                          <div className="space-y-6">
                              <div className="space-y-2">
                                  <h4 className="text-brand-gold text-xs font-black uppercase tracking-widest">1. Visual Options (風格選項)</h4>
                                  <ul className="text-xs text-slate-300 space-y-2 pl-4 border-l border-white/10">
                                      <li><strong className="text-white">SLIDE</strong>: 經典滾動 (Scrolling lyrics, safe choice)</li>
                                      <li><strong className="text-white">FADE</strong>: 電影淡入 (Fade in/out, artistic)</li>
                                      <li><strong className="text-white">STATIC</strong>: 極簡切換 (Instant cut, for fast songs)</li>
                                  </ul>
                              </div>
                              <div className="space-y-2">
                                  <h4 className="text-brand-gold text-xs font-black uppercase tracking-widest">2. Operation (操作方式)</h4>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                      This is a rhythm game. When you hear the singer sing the <strong className="text-white">first word</strong> of a line:
                                  </p>
                                  <div className="flex gap-4 mt-2">
                                      <div className="flex-1 bg-white/10 p-3 text-center rounded border border-white/10">
                                          <span className="block text-[10px] text-slate-400 uppercase mb-1">PC</span>
                                          <span className="text-sm font-bold text-white">Press SPACE</span>
                                      </div>
                                      <div className="flex-1 bg-white/10 p-3 text-center rounded border border-white/10">
                                          <span className="block text-[10px] text-slate-400 uppercase mb-1">Mobile</span>
                                          <span className="text-sm font-bold text-white">TAP Screen</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <button onClick={() => setShowHelp(false)} className="w-full mt-8 py-3 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">
                              Got it
                          </button>
                      </div>
                  </div>
              )}

              {/* Controls */}
              <div className="w-full md:w-80 bg-black border-r border-white/5 p-8 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                  
                  <div className="mb-8">
                      {/* Visual Config 1: Motion */}
                      <div className="mb-6">
                          <div className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <span className="w-1 h-3 bg-brand-gold"></span>
                                  <span>Visual Motion</span>
                              </div>
                              <button onClick={() => setShowHelp(true)} className="text-[9px] text-slate-500 border border-slate-700 px-2 rounded hover:text-white hover:border-white transition-all">?</button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              {['slide', 'fade', 'static'].map((m) => (
                                  <button 
                                      key={m}
                                      onClick={() => setConfig({...config, motion: m as any})} 
                                      className={`flex flex-col items-center justify-center p-3 border transition-all ${config.motion === m ? 'bg-white text-black border-white' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/30 hover:text-white'}`}
                                  >
                                      <span className="text-[10px] font-black uppercase">{m}</span>
                                      <span className="text-[8px] opacity-60 mt-1 uppercase tracking-wider">{m === 'slide' ? 'Scroll' : m === 'fade' ? 'Cinema' : 'Cut'}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* Visual Config 2: Layout */}
                      <div className="mb-6">
                          <div className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className="w-1 h-3 bg-brand-gold"></span>
                              <span>Format & Layout</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                              <button onClick={() => setConfig({...config, format: 'youtube'})} className={`py-3 text-[9px] font-black uppercase border flex items-center justify-center gap-2 ${config.format === 'youtube' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10 hover:text-white'}`}>
                                  <span className="w-4 h-2 border border-current"></span> 16:9 PC
                              </button>
                              <button onClick={() => setConfig({...config, format: 'social'})} className={`py-3 text-[9px] font-black uppercase border flex items-center justify-center gap-2 ${config.format === 'social' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10 hover:text-white'}`}>
                                  <span className="w-2 h-3 border border-current"></span> 9:16 Mobile
                              </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setConfig({...config, layout: 'lyrics'})} className={`py-3 text-[9px] font-black uppercase border ${config.layout === 'lyrics' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10 hover:text-white'}`}>Lyrics Only</button>
                              <button onClick={() => setConfig({...config, layout: 'cover'})} className={`py-3 text-[9px] font-black uppercase border ${config.layout === 'cover' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10 hover:text-white'}`}>Cover Mode</button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto space-y-4">
                      {/* INLINE INSTRUCTIONS */}
                      <div className="bg-slate-900 border border-white/10 p-5 mb-4 relative overflow-hidden group cursor-pointer hover:border-brand-accent/50 transition-all" onClick={() => setShowHelp(true)}>
                          <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent"></div>
                          <div className="flex justify-between items-center mb-2">
                              <h5 className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Operation</h5>
                              <span className="text-[8px] text-slate-500 uppercase tracking-widest bg-black px-1">Click for info</span>
                          </div>
                          <p className="text-[9px] text-slate-300 leading-relaxed">
                              Press <span className="bg-white text-black px-1 rounded font-bold">SPACE</span> exactly when the lyrics start.
                          </p>
                      </div>

                      <button onClick={toggleAudition} className={`w-full py-4 border font-black uppercase text-[10px] tracking-[0.2em] transition-all ${isAuditioning ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:bg-white/10'}`}>
                          {isAuditioning ? 'STOP PREVIEW' : 'PRACTICE MODE (試玩)'}
                      </button>
                      <button onClick={startRecording} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-pulse">
                          {t('interactive_btn_start_record')}
                      </button>
                  </div>
              </div>

              {/* Canvas Preview */}
              <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-4 md:p-12 overflow-hidden" 
                   onMouseDown={isAuditioning ? handleLineClick : undefined}
                   onTouchStart={isAuditioning ? handleLineClick : undefined}
              >
                  <div className={`shadow-2xl border border-white/10 overflow-hidden transition-all duration-700 bg-black ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[80vh]' : 'aspect-video w-full max-w-5xl'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-cover" />
                  </div>
              </div>
          </div>
      )}

      {/* RECORDING MODE */}
      {mode === 'playing' && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in cursor-none">
              <div className="absolute top-10 left-10 z-[200] flex items-center gap-4 pointer-events-none">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_30px_red]"></div>
                  <span className="text-lg font-black uppercase tracking-[0.4em] text-white">REC • {currentTime.toFixed(1)}s</span>
              </div>
              
              {/* Full Screen Capture Area */}
              <div className="flex-1 flex items-center justify-center bg-black" onMouseDown={handleLineClick} onTouchStart={handleLineClick}>
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              {/* Controls Overlay (Bottom) */}
              <div className="absolute bottom-0 w-full p-12 flex justify-between items-end bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto">
                  <div className="text-left pointer-events-none">
                      <p className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.3em] mb-2 animate-pulse">{t('interactive_recording_hint_desktop')}</p>
                      <p className="text-4xl font-black text-white/20 uppercase truncate max-w-4xl opacity-50">{lyricsArrayRef.current[lineIndex]}</p>
                  </div>
                  <button onClick={finishRecording} className="pointer-events-auto px-8 py-3 border border-red-900 text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all backdrop-blur-md">ABORT (Retry)</button>
              </div>
          </div>
      )}

      {/* RENDERING / PACKAGING STATE */}
      {mode === 'rendering' && (
          <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center animate-fade-in">
              <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-800 border-t-brand-gold rounded-full animate-spin mb-8"></div>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] mb-4">Packaging Video...</h3>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                  Calculating Personal Imprint...<br/>
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
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all mt-8">CONFIRM & EXPORT</button>
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
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-8">{t('interactive_finished_desc')}</p>
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("System Packing...");
                        // Use stored mime type or default
                        const blob = new Blob(recordedChunks, { type: 'video/mp4' }); 
                        const url = URL.createObjectURL(blob); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}_${contactInfo.name}.mp4`; a.click(); 
                    }} 
                    className="w-full py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all shadow-lg"
                   >{t('interactive_btn_save_video')}</button>
                   <button onClick={() => setMode('select')} className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] hover:text-white hover:border-white transition-all">{t('interactive_btn_return')}</button>
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
            onError={() => { console.error("Audio Load Error"); setIsAudioReady(false); }}
          />
      )}
    </div>
  );
};

export default Interactive;
