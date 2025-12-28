import React, { useState, useEffect, useRef } from 'react';
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

type InteractionMode = 'menu' | 'setup' | 'playing' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [isAudioReady, setIsAudioReady] = useState(false);
  
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
  const exitAnimationRef = useRef<number>(1); // 1 = normal, 0 = vanishing
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) handleSelectSong(s);
    }
  }, [location.state, songs]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setIsAudioReady(false);
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
      if (!canvasRef.current || !audioRef.current || !isAudioReady) {
          alert("Preparing Studio...");
          return;
      }
      
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      setIsAuditioning(false);
      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      exitAnimationRef.current = 1;
      setRecordedChunks([]);

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
              videoBitsPerSecond: 50000000 
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
          alert("Recording Initialization Failed.");
          setMode('setup');
      }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mode !== 'playing' || !audioRef.current) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 70) return;
      lastTapTimeRef.current = now;

      hitPulseRef.current = 1.0; 
      const currentText = lyricsArrayRef.current[lineIndex];

      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              // 當點擊到 END 時，啟動縮小消失特效並結束錄製
              if (lyricsArrayRef.current[next] === "END") {
                  const vanish = setInterval(() => {
                      exitAnimationRef.current -= 0.08;
                      if (exitAnimationRef.current <= 0) {
                          clearInterval(vanish);
                          finishRecording();
                      }
                  }, 40);
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
          if (!audioRef.current.paused && !audioRef.current.ended) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
          } else if (audioRef.current?.ended) { finishRecording(); }
          else {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
          }
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
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.18;
      hitPulseRef.current *= 0.93;

      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.2 * exitAnimationRef.current;
          ctx.filter = 'blur(100px) grayscale(100%)';
          ctx.drawImage(bgImageRef.current, -200, -200, w + 400, h + 400);
          
          ctx.filter = 'none';
          ctx.globalAlpha = 0.9 * exitAnimationRef.current;
          const baseScale = config.format === 'social' ? w * 0.75 : 520;
          const coverSize = baseScale * (1 + hitPulseRef.current * 0.06) * exitAnimationRef.current;
          const coverX = config.format === 'social' ? (w/2 - coverSize/2) : (w - coverSize - 140);
          const coverY = h/2 - coverSize/2;
          
          ctx.shadowColor = 'rgba(0,0,0,1)';
          ctx.shadowBlur = 80;
          ctx.drawImage(bgImageRef.current, coverX, coverY, coverSize, coverSize);
          ctx.restore();
      }

      const lyricsX = config.alignHorizontal === 'left' ? 180 : config.alignHorizontal === 'right' ? w - 180 : w / 2;
      const lineHeight = config.fontSize === 'small' ? 110 : config.fontSize === 'large' ? 280 : 190;
      let baseOffset = h / 2;
      if (config.alignVertical === 'top') baseOffset = h * 0.3;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.7;

      ctx.textBaseline = 'middle';
      ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      
      const items = mode === 'setup' ? ["PREVIEW LINE 01", "CURRENT ACTIVE LYRIC", "PREVIEW LINE 02"] : lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          
          if (text === "END" || (text === "[ READY ]" && mode === 'playing' && lineIndex > 0)) return;

          const relPos = mode === 'setup' ? (i - 1) : (i - smoothIndexRef.current);
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (dist > 3.5) return;

          ctx.save();
          const isActive = mode === 'setup' ? i === 1 : dist < 0.5;
          let alpha = isActive ? 1 : Math.max(0, 0.5 - dist * 0.3);
          alpha *= exitAnimationRef.current;
          
          let fontSizeVal = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 140 : 95;
          let scale = (isActive ? 1.25 + hitPulseRef.current * 0.25 : 0.85 - dist * 0.08) * exitAnimationRef.current;
          
          ctx.translate(lyricsX, y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha;

          if (config.effect === 'glow' && isActive) {
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 60 + hitPulseRef.current * 80;
          }

          ctx.font = `900 ${fontSizeVal}px Montserrat`;

          if (config.lyricStyle === 'cutout') {
              ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5; ctx.strokeText(text, 0, 0);
          } else {
              ctx.fillStyle = isActive ? '#fbbf24' : '#ffffff';
              ctx.fillText(text, 0, 0);
          }
          ctx.restore();
      });

      if (config.format === 'youtube' && config.layout !== 'cover') {
          ctx.globalAlpha = 1.0 * exitAnimationRef.current;
          ctx.fillStyle = '#fbbf24'; ctx.font = '900 36px Montserrat'; ctx.textAlign = 'left';
          ctx.fillText(selectedSong.title.toUpperCase(), 140, h - 160);
          ctx.fillStyle = '#ffffff33'; ctx.font = '700 20px Montserrat';
          ctx.fillText(`Prod. Willwi`, 140, h - 110);
      }
  };

  const toggleAudition = async () => {
      if (!audioRef.current) return;
      if (isAuditioning) { audioRef.current.pause(); setIsAuditioning(false); }
      else { audioRef.current.play(); setIsAuditioning(true); }
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      {mode === 'menu' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-[10rem] font-black uppercase tracking-tighter mb-4 text-gold-glow">Mastering</h2>
              <p className="text-slate-700 text-[10px] tracking-[1em] uppercase mb-20 font-black">Lyric Rendering Engine v4.0</p>
              <div onClick={() => navigate('/database')} className="p-32 bg-slate-900/20 border border-white/5 hover:border-brand-gold cursor-pointer transition-all group relative overflow-hidden">
                  <h3 className="text-brand-gold font-black text-4xl uppercase tracking-[0.4em] mb-4 group-hover:scale-105 transition-transform relative z-10">Select Track</h3>
                  <p className="text-slate-600 text-[10px] uppercase tracking-widest text-center relative z-10">前往作品大廳 載入創作素材</p>
                  <div className="absolute inset-0 bg-brand-gold/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden">
              <div className="w-96 bg-black border-r border-white/5 p-10 overflow-y-auto custom-scrollbar space-y-16">
                  <section>
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-10 border-b border-white/10 pb-4">Motion Architecture</h4>
                      <div className="grid grid-cols-2 gap-px bg-white/10">
                          {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'scaling', 'fill', 'bubbling'].map(m => (
                              <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-6 text-[10px] font-black uppercase transition-all bg-black ${config.motion === m ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                                  {m}
                              </button>
                          ))}
                      </div>
                  </section>
                  <section>
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-10 border-b border-white/10 pb-4">Sync Configuration</h4>
                      <div className="grid grid-cols-1 gap-px bg-white/10">
                          <button className="py-5 text-[11px] font-black bg-white text-black uppercase tracking-widest">Line-by-Line</button>
                          <button className="py-5 text-[11px] font-black bg-black text-slate-800 uppercase tracking-widest cursor-not-allowed">Word-by-Word</button>
                      </div>
                  </section>
              </div>

              <div className="flex-1 flex flex-col bg-slate-950 relative">
                  <div className="absolute top-10 right-10 flex gap-px bg-white/10 p-px z-10">
                      <button onClick={() => setConfig({...config, format: 'youtube'})} className={`px-10 py-3 text-[11px] font-black transition-all ${config.format === 'youtube' ? 'bg-white text-black shadow-2xl' : 'bg-black text-slate-600 hover:text-white'}`}>WIDE (16:9)</button>
                      <button onClick={() => setConfig({...config, format: 'social'})} className={`px-10 py-3 text-[11px] font-black transition-all ${config.format === 'social' ? 'bg-white text-black shadow-2xl' : 'bg-black text-slate-600 hover:text-white'}`}>PORTRAIT (9:16)</button>
                  </div>

                  <div className="flex-1 flex items-center justify-center p-20">
                      <div className={`shadow-2xl border border-white/10 overflow-hidden transition-all duration-700 bg-black ${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full max-w-6xl'}`}>
                          <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  <div className="bg-black border-t border-white/10 p-12 flex items-center gap-16">
                      <button onClick={toggleAudition} className="w-20 h-20 bg-white text-black flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform shadow-2xl">
                          {isAuditioning ? <div className="w-5 h-5 bg-black"></div> : <div className="w-0 h-0 border-t-10 border-t-transparent border-b-10 border-b-transparent border-l-16 border-l-black ml-1"></div>}
                      </button>
                      <div className="flex-grow">
                          <div className="flex justify-between text-[11px] text-slate-600 font-black uppercase mb-6 tracking-widest">
                              <span className="bg-white/5 px-4 py-2">{!isAudioReady ? 'PRE-LOADING CORE...' : `${currentTime.toFixed(2)} / ${duration.toFixed(2)}S`}</span>
                              <span className="text-brand-gold opacity-80">Waveform Engine Synthesis</span>
                          </div>
                          <div className="h-20 bg-white/[0.03] flex items-end gap-[4px] px-6 border border-white/5">
                              {Array.from({ length: 220 }).map((_, i) => (
                                  <div key={i} className={`w-full rounded-t-sm transition-all duration-300 ${ (i / 220) < (currentTime / duration) ? 'bg-brand-gold' : 'bg-slate-900' }`} 
                                       style={{ height: `${(Math.sin(i * 0.12) * 25 + 50) * (0.7 + Math.random() * 0.6)}%`, opacity: (i / 220) < (currentTime / duration) ? 1 : 0.1 }}></div>
                              ))}
                          </div>
                      </div>
                      <button onClick={startRecording} className="px-20 py-8 bg-brand-gold text-black font-black uppercase text-sm tracking-[0.6em] hover:bg-white transition-all transform hover:scale-105 shadow-2xl">Start Recording</button>
                  </div>
              </div>

              <div className="w-96 bg-black border-l border-white/5 p-10 overflow-y-auto custom-scrollbar space-y-16">
                  <section>
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-10 border-b border-white/10 pb-4">Vertical Alignment</h4>
                      <div className="grid grid-cols-3 gap-px bg-white/10">
                          {['top', 'middle', 'bottom'].map(v => (
                              <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`py-6 text-2xl font-black transition-all bg-black ${config.alignVertical === v ? 'text-white' : 'text-slate-800 hover:text-white'}`}>
                                  {v === 'top' ? '↑' : v === 'middle' ? '÷' : '↓'}
                              </button>
                          ))}
                      </div>
                  </section>
                  <section>
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-10 border-b border-white/10 pb-4">Typography Style</h4>
                      <div className="grid grid-cols-1 gap-px bg-white/10">
                          {['none', 'cutout'].map(s => (
                              <button key={s} onClick={() => setConfig({...config, lyricStyle: s as any})} className={`py-6 text-[10px] font-black uppercase transition-all bg-black ${config.lyricStyle === s ? 'text-brand-gold' : 'text-slate-700 hover:text-white'}`}>
                                  {s === 'none' ? 'Solid Fill' : 'Cutout Line'}
                              </button>
                          ))}
                      </div>
                  </section>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in cursor-none">
              <div className="absolute top-16 left-16 z-[300] flex items-center gap-8 pointer-events-none">
                  <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse shadow-[0_0_60px_red]"></div>
                  <span className="text-xl font-black uppercase tracking-[0.6em] text-white">LIVE_CAP_v4 • {currentTime.toFixed(2)}S</span>
              </div>
              <div className="absolute inset-0 z-[200]" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              
              <div className="flex-1 flex items-center justify-center bg-black">
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              <div className="bg-[#020202] p-24 flex justify-between items-center border-t border-white/10 relative z-[300]">
                  <div className="flex flex-col">
                      <span className="text-[11px] text-brand-gold font-black uppercase mb-6 animate-pulse tracking-[0.8em]">COMMAND: TAP SCREEN TO SYNCHRONIZE</span>
                      <span className="text-7xl font-black text-white uppercase truncate max-w-7xl tracking-tighter">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-24 py-10 border border-red-900 text-red-600 text-lg font-black uppercase tracking-[0.6em] hover:bg-red-900 hover:text-white transition-all shadow-2xl">Abort</button>
              </div>
          </div>
      )}

      {mode === 'contact' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
              <h2 className="text-7xl font-black uppercase mb-16 tracking-tighter text-gold-glow">Mastering Complete</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-12 bg-slate-950 p-24 border border-white/10 shadow-2xl max-w-3xl w-full text-center">
                  <div className="space-y-8 text-left">
                      <label className="text-[11px] text-slate-700 font-black uppercase tracking-[0.6em]">Signed Director Name</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-10 text-white text-3xl focus:border-brand-gold outline-none font-black uppercase tracking-widest text-center" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} autoFocus />
                  </div>
                  <button type="submit" className="w-full py-10 bg-white text-black font-black uppercase text-sm tracking-[0.6em] hover:bg-brand-gold transition-all shadow-2xl">Confirm Signature & Export</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in bg-black">
              <h2 className="text-[12rem] font-black uppercase mb-20 tracking-tighter text-gold-glow leading-none">SUCCESS</h2>
              <div className="bg-slate-950 p-24 border border-white/10 shadow-2xl space-y-16 max-w-5xl w-full text-center">
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("System Packing...");
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}.webm`; a.click(); 
                    }} 
                    className="w-full py-12 bg-white text-black font-black uppercase text-xl tracking-[0.8em] hover:bg-brand-gold transition-all shadow-[0_0_100px_rgba(255,255,255,0.15)]"
                   >Save High-Res WebM</button>
                   <button onClick={() => navigate('/')} className="w-full py-8 border border-white/5 text-slate-700 font-black uppercase text-[11px] tracking-[1em] hover:text-white transition-all">Exit Studio</button>
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