
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
type InteractionMode = 'intro' | 'select' | 'gate' | 'setup' | 'playing' | 'contact' | 'finished';

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
          setMode('setup'); // Actually should go to selection if song not selected, but usually flow is maintained.
          // For simplicity in this static demo, we assume user selects song first, then pays.
          // If returned from external payment, we might need to restore state.
          // Here we just redirect to select if no song.
          if (!selectedSong) setMode('select');
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
          const canvasStream = (canvasRef.current as any).captureStream(60);
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

      // Debounce slightly
      const now = Date.now();
      if (now - lastTapTimeRef.current < 100) return;
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
      
      // Physics
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.1;
      hitPulseRef.current *= 0.9;

      // Draw Background
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          // Cinema Style: Blurred background
          ctx.globalAlpha = 0.3 * exitAnimationRef.current;
          ctx.filter = 'blur(80px)';
          ctx.drawImage(bgImageRef.current, -100, -100, w + 200, h + 200);
          ctx.restore();
          
          // Cover Art (Square)
          if (config.layout !== 'lyrics') {
              // Draw small cover if requested
          }
      }

      // Draw Lyrics
      const lyricsX = w / 2;
      const baseFontSize = config.fontSize === 'small' ? 40 : config.fontSize === 'large' ? 80 : 60;
      const lineHeight = baseFontSize * 2.5;
      const centerOffset = h / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const items = lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          
          if (text === "[ READY ]" && isDynamic && lineIndex > 0) return; // Hide Ready
          if (text === "END") return; // Don't draw END marker

          let relPos = i - smoothIndexRef.current;
          let dist = Math.abs(relPos);
          
          // Fade Logic
          let alpha = Math.max(0, 1 - dist * 0.5);
          if (dist > 2) alpha = 0;
          
          let y = centerOffset + (relPos * lineHeight);
          
          // Current Line Effect
          let scale = 1;
          let blur = 0;
          if (dist < 0.5) {
              scale = 1.1 + hitPulseRef.current * 0.1;
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 20 + hitPulseRef.current * 30;
          } else {
              blur = dist * 2;
          }

          if (alpha > 0.01) {
              ctx.save();
              ctx.translate(lyricsX, y);
              ctx.scale(scale, scale);
              ctx.globalAlpha = alpha * exitAnimationRef.current;
              
              if (blur > 0) ctx.filter = `blur(${blur}px)`;
              
              ctx.font = `900 ${baseFontSize}px Montserrat`;
              ctx.fillStyle = dist < 0.5 ? '#ffffff' : '#aaaaaa';
              ctx.fillText(text, 0, 0);
              
              // Reflection / Glow
              if (dist < 0.5 && hitPulseRef.current > 0.1) {
                  ctx.fillStyle = `rgba(251, 191, 36, ${hitPulseRef.current * 0.5})`;
                  ctx.fillText(text, 0, 0);
              }

              ctx.restore();
          }
      });

      // Watermark
      ctx.save();
      ctx.globalAlpha = 0.5 * exitAnimationRef.current;
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 24px Montserrat';
      ctx.textAlign = 'right';
      ctx.fillText("CREATED WITH WILLWI STUDIO", w - 50, h - 50);
      ctx.restore();
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
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden">
              {/* Controls */}
              <div className="w-full md:w-80 bg-slate-900 border-r border-white/5 p-8 flex flex-col z-20 shadow-2xl">
                  <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-8">{t('interactive_tool_prepare_title')}</h4>
                  
                  <div className="space-y-4 mb-8">
                      <div className={`p-3 border rounded text-[10px] uppercase font-bold tracking-widest flex justify-between ${isAudioReady ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-white/10 text-slate-500'}`}>
                          <span>{t('interactive_tool_checklist_1')}</span>
                          <span>{isAudioReady ? 'OK' : '...'}</span>
                      </div>
                      <div className="p-3 border border-emerald-500/30 text-emerald-500 bg-emerald-500/5 rounded text-[10px] uppercase font-bold tracking-widest flex justify-between">
                          <span>{t('interactive_tool_checklist_2')}</span>
                          <span>OK</span>
                      </div>
                  </div>

                  <div className="mt-auto space-y-4">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                          {t('interactive_tool_guide_1')}<br/>
                          <span className="text-white hidden md:inline">{t('interactive_tool_guide_2_desktop')}</span>
                          <span className="text-white md:hidden">{t('interactive_tool_guide_2_mobile')}</span>
                      </p>
                      <button onClick={toggleAudition} className={`w-full py-4 border font-black uppercase text-[10px] tracking-[0.2em] transition-all ${isAuditioning ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:bg-white/10'}`}>
                          {isAuditioning ? 'STOP PREVIEW' : 'PRACTICE MODE'}
                      </button>
                      <button onClick={startRecording} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-pulse">
                          {t('interactive_btn_start_record')}
                      </button>
                  </div>
              </div>

              {/* Canvas Preview */}
              <div className="flex-1 bg-black relative flex items-center justify-center p-4 md:p-12 overflow-hidden" 
                   onMouseDown={isAuditioning ? handleLineClick : undefined}
                   onTouchStart={isAuditioning ? handleLineClick : undefined}
              >
                  <div className="relative shadow-2xl border border-white/5 aspect-video w-full max-w-5xl bg-black">
                      <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
                      {/* Overlay Hints */}
                      {isAuditioning && (
                          <div className="absolute top-4 right-4 text-[10px] text-brand-gold font-bold uppercase tracking-widest bg-black/50 px-2 py-1 border border-brand-gold/30">
                              Preview Mode
                          </div>
                      )}
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
              <div className="flex-1 flex items-center justify-center" onMouseDown={handleLineClick} onTouchStart={handleLineClick}>
                  <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain max-h-screen" />
              </div>

              {/* Controls Overlay (Bottom) */}
              <div className="absolute bottom-0 w-full p-12 flex justify-between items-end bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                  <div className="text-left">
                      <p className="text-[10px] text-brand-gold font-bold uppercase tracking-[0.3em] mb-2 animate-pulse">{t('interactive_recording_hint_desktop')}</p>
                      <p className="text-4xl font-black text-white/20 uppercase truncate max-w-4xl">{lyricsArrayRef.current[lineIndex]}</p>
                  </div>
                  <button onClick={finishRecording} className="pointer-events-auto px-8 py-3 border border-red-900 text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all">ABORT</button>
              </div>
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
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}_${contactInfo.name}.webm`; a.click(); 
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
