
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Song, Language, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

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

const formatToLRC = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
};

type InteractionMode = 'menu' | 'setup' | 'playing' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  
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
  const [lrcContent, setLrcContent] = useState<string>('');
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const tapLogRef = useRef<{ text: string; time: number }[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  
  const smoothIndexRef = useRef<number>(0);
  const hitPulseRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) handleSelectSong(s);
    }
  }, [location.state, songs]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      const rawLines = (song.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ READY ]", ...rawLines, "END"];
      
      if (song.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = convertToDirectStream(song.coverUrl);
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('setup');
  };

  const startRecording = async () => {
      if (!canvasRef.current || !audioRef.current) return;
      setIsAuditioning(false);
      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      tapLogRef.current = [];
      setRecordedChunks([]);

      try {
          const canvasStream = (canvasRef.current as any).captureStream(60);
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          
          const source = ctx.createMediaElementSource(audioRef.current);
          const dest = ctx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(ctx.destination);

          const combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
          ]);

          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
              ? 'video/webm;codecs=vp9,opus' : 'video/webm';
          
          const recorder = new MediaRecorder(combinedStream, { 
              mimeType, videoBitsPerSecond: 30000000, audioBitsPerSecond: 128000
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => setRecordedChunks(chunks);

          mediaRecorderRef.current = recorder;
          recorder.start(200);
          
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          renderLoop();
      } catch (e) { 
          console.error(e); 
          alert("Recording Error. Please use Chrome/Edge.");
          setMode('setup');
      }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mode !== 'playing' || !audioRef.current) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 100) return;
      lastTapTimeRef.current = now;

      hitPulseRef.current = 1.0; 
      const time = audioRef.current.currentTime;
      const currentText = lyricsArrayRef.current[lineIndex];

      if (currentText !== "[ READY ]") tapLogRef.current.push({ text: currentText, time });

      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              if (lyricsArrayRef.current[next] === "END") setTimeout(finishRecording, 1500); 
              return next;
          }
          return prev;
      });
  };

  const finishRecording = () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      setLrcContent(tapLogRef.current.map(log => `${formatToLRC(log.time)}${log.text}`).join('\n'));
      setMode('contact');
      cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
  };

  const renderLoop = () => {
      draw();
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
          if (!audioRef.current.paused && !audioRef.current.ended) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
          } else if (audioRef.current?.ended) { finishRecording(); }
      }
  };

  useEffect(() => {
    let frame: number;
    const previewLoop = () => {
        if (mode === 'setup') {
            draw();
            frame = requestAnimationFrame(previewLoop);
        }
    };
    if (mode === 'setup') frame = requestAnimationFrame(previewLoop);
    return () => cancelAnimationFrame(frame);
  }, [mode, config, selectedSong]);

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      const targetIdx = mode === 'setup' ? 1 : lineIndex;
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.1;
      hitPulseRef.current *= 0.94;

      // 1. Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          // Blur effect if not in "Cover" focus layout
          if (config.layout === 'cover') {
              ctx.globalAlpha = 1;
              const size = Math.min(w, h) * 0.7 * (1 + hitPulseRef.current * 0.02);
              ctx.drawImage(bgImageRef.current, w/2 - size/2, h/2 - size/2, size, size);
          } else {
              ctx.globalAlpha = 0.2;
              ctx.filter = 'blur(40px)';
              ctx.drawImage(bgImageRef.current, -100, -100, w + 200, h + 200);
              
              // Secondary Floating Cover
              ctx.filter = 'none';
              ctx.globalAlpha = 0.5;
              const coverSize = 400 * (1 + (config.motionTweaks === 'floating' ? Math.sin(Date.now()/1000)*0.05 : 0));
              ctx.drawImage(bgImageRef.current, w - coverSize - 100, h/2 - coverSize/2, coverSize, coverSize);
          }
          ctx.restore();
      }

      // 2. Lyrics
      const lyricsX = config.alignHorizontal === 'left' ? 150 : config.alignHorizontal === 'right' ? w - 150 : w / 2;
      const lineHeight = config.fontSize === 'small' ? 100 : config.fontSize === 'large' ? 240 : 160;
      let baseOffset = h / 2;
      if (config.alignVertical === 'top') baseOffset = h * 0.2;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.8;

      ctx.textBaseline = 'middle';
      ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      
      const items = mode === 'setup' ? ["PREVIEW LINE 01", "CURRENT ACTIVE LYRIC", "PREVIEW LINE 02"] : lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          else if (config.textCase === 'capitalize') text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

          const relPos = mode === 'setup' ? (i - 1) : (i - smoothIndexRef.current);
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (text === "END" || dist > 3) return;

          ctx.save();
          const isActive = mode === 'setup' ? i === 1 : dist < 0.5;
          let alpha = isActive ? 1 : Math.max(0, 0.4 - dist * 0.15);
          
          let fontSizeVal = config.fontSize === 'small' ? 40 : config.fontSize === 'large' ? 100 : 70;
          let scale = 1;
          
          if (isActive) {
              if (config.motion === 'scaling') scale = 1.3 + hitPulseRef.current * 0.4;
              else if (config.motion === 'popup') scale = 1.1 + hitPulseRef.current * 0.2;
              else scale = 1.1 + (mode === 'playing' ? hitPulseRef.current * 0.1 : 0);
          } else {
              scale = 0.9 - dist * 0.05;
          }
          
          ctx.translate(lyricsX, y);
          if (config.motionTweaks === 'floating' && isActive) {
              ctx.translate(Math.sin(Date.now()/500) * 10, Math.cos(Date.now()/700) * 10);
          }
          
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha;

          if (config.effect === 'glow' && isActive) {
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 30 + hitPulseRef.current * 50;
          }

          ctx.font = `900 ${fontSizeVal}px Montserrat`;

          // Style Rendering
          if (config.lyricStyle === 'cutout') {
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 2;
              ctx.strokeText(text, 0, 0);
          } else if (config.lyricStyle === 'broken') {
              // Draw text in segments
              const parts = text.split(' ');
              let curX = -ctx.measureText(text).width / 2;
              if (config.alignHorizontal === 'left') curX = 0;
              if (config.alignHorizontal === 'right') curX = -ctx.measureText(text).width;

              parts.forEach((p, idx) => {
                  ctx.save();
                  if (isActive) ctx.translate(0, Math.sin(Date.now()/200 + idx) * 5);
                  ctx.fillText(p, curX, 0);
                  curX += ctx.measureText(p + ' ').width;
                  ctx.restore();
              });
          } else if (config.lyricStyle === 'layered') {
              ctx.fillStyle = '#fbbf2422';
              ctx.fillText(text, 5, 5);
              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, 0, 0);
          } else {
              ctx.fillStyle = isActive ? '#fbbf24' : '#ffffff';
              ctx.fillText(text, 0, 0);
          }

          ctx.restore();
      });

      // 3. Metadata Overlay
      if (config.format === 'youtube' && config.layout !== 'cover') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '900 24px Montserrat';
          ctx.textAlign = 'left';
          ctx.fillText(selectedSong.title.toUpperCase(), 100, h - 100);
          ctx.fillStyle = '#ffffff55';
          ctx.font = '700 16px Montserrat';
          ctx.fillText(`Willwi - ${selectedSong.releaseCompany}`, 100, h - 70);
      }
  };

  const toggleAudition = () => {
      if (!audioRef.current) return;
      if (isAuditioning) { audioRef.current.pause(); setIsAuditioning(false); }
      else { audioRef.current.play(); setIsAuditioning(true); }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 flex flex-col">
      {mode === 'menu' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-6xl font-black uppercase tracking-tighter mb-4 text-gold-glow">Creative Field</h2>
              <p className="text-slate-500 text-xs tracking-[0.5em] uppercase mb-16">Lyric Sync & Visual Synthesis</p>
              <div onClick={() => navigate('/database')} className="p-20 bg-slate-900/40 border border-white/5 hover:border-brand-gold cursor-pointer transition-all rounded-sm backdrop-blur-xl group">
                  <h3 className="text-brand-gold font-black text-2xl uppercase tracking-[0.2em] mb-4 group-hover:scale-110 transition-transform">Start Production</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest text-center">Select a track from the library to begin</p>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden">
              {/* Left Sidebar: Animation & Motion */}
              <div className="w-80 bg-black/40 border-r border-white/5 p-6 overflow-y-auto custom-scrollbar space-y-10">
                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Layout</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['lyrics', 'subtitles', 'cover'].map(l => (
                              <button key={l} onClick={() => setConfig({...config, layout: l as any})} className={`py-4 text-[9px] font-black uppercase border rounded ${config.layout === l ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>{l}</button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Animation</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'scaling', 'fill', 'bubbling'].map(m => (
                              <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-4 text-[8px] font-black uppercase border rounded truncate px-1 ${config.motion === m ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/5 text-slate-600'}`}>
                                  {m === 'slide' ? 'Slide' : m === 'fade' ? 'Fade' : m === 'wipe' ? 'Wipe' : m === 'static' ? 'Static' : m === 'popup' ? 'PopUp' : m === 'mask' ? 'Mask' : m === 'scaling' ? 'Scaling' : m === 'fill' ? 'Fill' : 'Bubbl.'}
                              </button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Motion Tweaks</h4>
                      <div className="flex gap-2">
                          <button onClick={() => setConfig({...config, motionTweaks: 'none'})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.motionTweaks === 'none' ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>NONE</button>
                          <button onClick={() => setConfig({...config, motionTweaks: 'floating'})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.motionTweaks === 'floating' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-slate-500'}`}>FLOATING</button>
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Sync Mode</h4>
                      <div className="flex gap-2">
                          <button onClick={() => setConfig({...config, syncMode: 'line'})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.syncMode === 'line' ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>LINE BY LINE</button>
                          <button className={`flex-1 py-3 text-[9px] font-black border rounded border-white/5 text-slate-700 cursor-not-allowed`}>WORD BY WORD</button>
                      </div>
                  </section>
              </div>

              {/* Main Content: Preview Canvas */}
              <div className="flex-1 flex flex-col bg-black relative">
                  <div className="absolute top-6 right-6 flex gap-3 z-10">
                      <button onClick={() => setConfig({...config, format: 'youtube'})} className={`px-4 py-2 text-[9px] font-black rounded border transition-all ${config.format === 'youtube' ? 'bg-white text-black border-white' : 'border-white/20 text-slate-500'}`}>YOUTUBE</button>
                      <button onClick={() => setConfig({...config, format: 'social'})} className={`px-4 py-2 text-[9px] font-black rounded border transition-all ${config.format === 'social' ? 'bg-white text-black border-white' : 'border-white/20 text-slate-500'}`}>SOCIAL REEL</button>
                  </div>

                  <div className="flex-1 flex items-center justify-center p-12">
                      <div className={`shadow-[0_0_50px_rgba(0,0,0,1)] border border-white/5 overflow-hidden transition-all duration-500 ${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full max-w-5xl'}`}>
                          <canvas ref={canvasRef} width={1280} height={config.format === 'social' ? 2275 : 720} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  {/* Bottom Timeline Bar */}
                  <div className="bg-[#111] border-t border-white/5 p-6 flex items-center gap-8">
                      <button onClick={toggleAudition} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                          {isAuditioning ? <div className="w-3 h-3 bg-black"></div> : <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-black ml-1"></div>}
                      </button>
                      <div className="flex-grow">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-2">
                              <span>{currentTime.toFixed(1)} / {duration.toFixed(1)}s</span>
                              <span className="uppercase tracking-widest">Mastering Waveform (Simulated)</span>
                          </div>
                          <div className="h-12 bg-white/5 rounded-sm relative overflow-hidden flex items-end gap-[1px] px-1">
                              {/* Fake Waveform */}
                              {Array.from({ length: 120 }).map((_, i) => (
                                  <div key={i} className="bg-slate-700 w-full" style={{ height: `${Math.random() * 80 + 10}%`, opacity: (i / 120) < (currentTime / duration) ? 1 : 0.3 }}></div>
                              ))}
                              <div className="absolute top-0 left-0 h-full bg-brand-gold/10 pointer-events-none transition-all" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                          </div>
                      </div>
                      <button onClick={startRecording} className="px-10 py-5 bg-brand-gold text-slate-950 font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all transform hover:scale-105 shadow-2xl">Start Record</button>
                  </div>
              </div>

              {/* Right Sidebar: Font & Style */}
              <div className="w-80 bg-black/40 border-l border-white/5 p-6 overflow-y-auto custom-scrollbar space-y-10">
                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Font Size</h4>
                      <div className="flex gap-2">
                          {['small', 'medium', 'large'].map(s => (
                              <button key={s} onClick={() => setConfig({...config, fontSize: s as any})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.fontSize === s ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>{s.toUpperCase()}</button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Align Horizontal</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['left', 'center', 'right'].map(a => (
                              <button key={a} onClick={() => setConfig({...config, alignHorizontal: a as any})} className={`py-4 text-lg border rounded ${config.alignHorizontal === a ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>
                                  {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                              </button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Align Vertical</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['top', 'middle', 'bottom'].map(v => (
                              <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`py-4 text-lg border rounded ${config.alignVertical === v ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>
                                  {v === 'top' ? '↑' : v === 'middle' ? '÷' : '↓'}
                              </button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Lyrics Style</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {['none', 'broken', 'cutout', 'layered'].map(s => (
                              <button key={s} onClick={() => setConfig({...config, lyricStyle: s as any})} className={`py-3 text-[9px] font-black uppercase border rounded ${config.lyricStyle === s ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/5 text-slate-600'}`}>{s}</button>
                          ))}
                      </div>
                  </section>

                  <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Effect</h4>
                      <div className="flex gap-2">
                          <button onClick={() => setConfig({...config, effect: 'none'})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.effect === 'none' ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>NONE</button>
                          <button onClick={() => setConfig({...config, effect: 'glow'})} className={`flex-1 py-3 text-[9px] font-black border rounded ${config.effect === 'glow' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-slate-500'}`}>GLOW</button>
                      </div>
                  </section>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in cursor-none">
              <div className="absolute top-10 left-10 z-[300] flex items-center gap-4 pointer-events-none">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_20px_red]"></div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-white">RECORDING LIVE • {currentTime.toFixed(2)}s</span>
              </div>
              <div className="absolute inset-0 z-[200]" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              
              <div className="flex-1 flex items-center justify-center bg-black">
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              <div className="bg-[#050505] p-12 flex justify-between items-center border-t border-white/5 relative z-[300]">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-brand-gold font-black uppercase mb-3 animate-pulse tracking-widest">TAP ANYWHERE TO SYNC LYRICS</span>
                      <span className="text-4xl font-black text-white uppercase truncate max-w-4xl">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-12 py-5 border border-red-900 text-red-500 text-xs font-black uppercase tracking-[0.4em] hover:bg-red-900 hover:text-white transition-all">STOP</button>
              </div>
          </div>
      )}

      {mode === 'contact' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-4xl font-black uppercase mb-12 tracking-[0.4em]">Session Finished</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-6 bg-slate-900/60 backdrop-blur-xl p-12 border border-white/5 shadow-2xl max-w-md w-full">
                  <div className="space-y-3">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Participant Name</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-5 text-white text-sm focus:border-brand-gold outline-none font-bold uppercase tracking-widest" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-brand-gold transition-all">Unlock Results</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-7xl font-black uppercase mb-16 tracking-tighter text-gold-glow">SUCCESS</h2>
              <div className="bg-slate-900/60 backdrop-blur-xl p-16 border border-white/5 shadow-2xl space-y-8 max-w-2xl w-full">
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("Generation in progress...");
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}.webm`; a.click(); 
                    }} 
                    className="w-full py-8 bg-white text-black font-black uppercase text-sm tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl"
                   >Save Video (HD + Audio)</button>

                   <button 
                    onClick={() => { 
                        const b = new Blob([lrcContent], { type: 'text/plain' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `${selectedSong?.title}.lrc`; a.click(); 
                    }} 
                    className="w-full py-5 border border-brand-gold text-brand-gold font-black uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-black transition-all"
                   >Export LRC Script</button>

                   <button onClick={() => navigate('/')} className="w-full mt-4 py-5 border border-white/10 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">Back to Home</button>
              </div>
          </div>
      )}

      {selectedSong && (
          <audio ref={audioRef} src={selectedSong.audioUrl} crossOrigin="anonymous" className="hidden" />
      )}
    </div>
  );
};

export default Interactive;
