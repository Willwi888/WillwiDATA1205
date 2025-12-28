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
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
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
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) handleSelectSong(s);
    }
  }, [location.state, songs]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setIsAudioLoading(true);
      const rawLines = (song.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      // 自動加入 END 邏輯：歌詞結尾出現 END 代表歌詞消失
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
      
      // 喚醒 AudioContext
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
      tapLogRef.current = [];
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
              videoBitsPerSecond: 45000000 
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
          console.error("Recording error:", e); 
          alert("錄製初始化失敗，請檢查瀏覽器安全性權限。");
          setMode('setup');
      }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mode !== 'playing' || !audioRef.current) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 80) return; // 防抖優化
      lastTapTimeRef.current = now;

      hitPulseRef.current = 1.0; 
      const time = audioRef.current.currentTime;
      const currentText = lyricsArrayRef.current[lineIndex];

      if (currentText !== "[ READY ]" && currentText !== "END") {
          tapLogRef.current.push({ text: currentText, time });
      }

      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              // 需求核心：如果是最後一行 END，則歌詞消失並準備結束
              if (lyricsArrayRef.current[next] === "END") {
                  setTimeout(finishRecording, 1500); 
              }
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
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.12;
      hitPulseRef.current *= 0.93;

      // 1. 底色
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // 2. 背景：雙層封面設計
      if (bgImageRef.current?.complete) {
          ctx.save();
          // 底層：模糊全景
          ctx.globalAlpha = 0.12;
          ctx.filter = 'blur(60px)';
          ctx.drawImage(bgImageRef.current, -100, -100, w + 200, h + 200);
          
          // 前層：高畫質封面卡片
          ctx.filter = 'none';
          ctx.globalAlpha = 0.75;
          const coverSize = (config.format === 'social' ? w * 0.75 : 460) * (1 + hitPulseRef.current * 0.04);
          const coverX = config.format === 'social' ? (w/2 - coverSize/2) : (w - coverSize - 120);
          const coverY = h/2 - coverSize/2;
          
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 50;
          ctx.drawImage(bgImageRef.current, coverX, coverY, coverSize, coverSize);
          ctx.restore();
      }

      // 3. 歌詞呈現系統
      const lyricsX = config.alignHorizontal === 'left' ? 160 : config.alignHorizontal === 'right' ? w - 160 : w / 2;
      const lineHeight = config.fontSize === 'small' ? 120 : config.fontSize === 'large' ? 260 : 180;
      let baseOffset = h / 2;
      if (config.alignVertical === 'top') baseOffset = h * 0.28;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.72;

      ctx.textBaseline = 'middle';
      ctx.textAlign = config.alignHorizontal as CanvasTextAlign;
      
      const items = mode === 'setup' ? ["PREVIEW LINE 01", "CURRENT ACTIVE LYRIC", "PREVIEW LINE 02"] : lyricsArrayRef.current;

      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();
          
          // 核心需求：當前歌詞是 END 或還沒開始時，不渲染文字，實現歌詞消失效果
          if (text === "END" || (text === "[ READY ]" && mode === 'playing' && lineIndex > 0)) return;

          const relPos = mode === 'setup' ? (i - 1) : (i - smoothIndexRef.current);
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (dist > 3.2) return;

          ctx.save();
          const isActive = mode === 'setup' ? i === 1 : dist < 0.5;
          let alpha = isActive ? 1 : Math.max(0, 0.45 - dist * 0.25);
          
          let fontSizeVal = config.fontSize === 'small' ? 48 : config.fontSize === 'large' ? 120 : 85;
          let scale = isActive ? 1.25 + hitPulseRef.current * 0.2 : 0.9 - dist * 0.08;
          
          ctx.translate(lyricsX, y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha;

          if (config.effect === 'glow' && isActive) {
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 50 + hitPulseRef.current * 70;
          }

          ctx.font = `900 ${fontSizeVal}px Montserrat`;

          if (config.lyricStyle === 'cutout') {
              ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.strokeText(text, 0, 0);
          } else {
              ctx.fillStyle = isActive ? '#fbbf24' : '#ffffff';
              ctx.fillText(text, 0, 0);
          }
          ctx.restore();
      });

      // 4. 浮水印：Willwi 音樂資訊
      if (config.format === 'youtube' && config.layout !== 'cover') {
          ctx.fillStyle = '#fbbf24'; ctx.font = '900 32px Montserrat'; ctx.textAlign = 'left';
          ctx.fillText(selectedSong.title.toUpperCase(), 120, h - 140);
          ctx.fillStyle = '#ffffff44'; ctx.font = '700 20px Montserrat';
          ctx.fillText(`Willwi - ${selectedSong.releaseCompany}`, 120, h - 100);
      }
  };

  const toggleAudition = async () => {
      if (!audioRef.current) return;
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      
      if (isAuditioning) { audioRef.current.pause(); setIsAuditioning(false); }
      else { audioRef.current.play(); setIsAuditioning(true); }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-slate-100 flex flex-col font-sans">
      {mode === 'menu' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-8xl font-black uppercase tracking-tighter mb-4 text-gold-glow">Lab Console</h2>
              <p className="text-slate-500 text-xs tracking-[0.6em] uppercase mb-16">Lyric Sync & Visual Synthesis v3.5</p>
              <div onClick={() => navigate('/database')} className="p-28 bg-slate-900/40 border border-white/5 hover:border-brand-gold cursor-pointer transition-all rounded-sm backdrop-blur-xl group shadow-2xl">
                  <h3 className="text-brand-gold font-black text-4xl uppercase tracking-[0.2em] mb-4 group-hover:scale-105 transition-transform">Begin Production</h3>
                  <p className="text-slate-500 text-xs uppercase tracking-widest text-center">選擇作品 開始製作您的動態歌詞影片</p>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden">
              {/* 控制面板左 */}
              <div className="w-80 bg-black/80 border-r border-white/5 p-8 overflow-y-auto custom-scrollbar space-y-12">
                  <section>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">動畫選擇</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'scaling', 'fill', 'bubbling'].map(m => (
                              <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-4 text-[9px] font-black uppercase border rounded transition-all ${config.motion === m ? 'bg-brand-gold text-black border-brand-gold shadow-lg' : 'border-white/10 text-slate-600 hover:text-white'}`}>
                                  {m.toUpperCase()}
                              </button>
                          ))}
                      </div>
                  </section>
                  <section>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">動作微調</h4>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setConfig({...config, motionTweaks: 'none'})} className={`py-4 text-[10px] font-black border rounded ${config.motionTweaks === 'none' ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>沒有任何</button>
                          <button onClick={() => setConfig({...config, motionTweaks: 'floating'})} className={`py-4 text-[10px] font-black border rounded ${config.motionTweaks === 'floating' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-slate-500'}`}>漂浮的</button>
                      </div>
                  </section>
              </div>

              {/* 中央預覽 */}
              <div className="flex-1 flex flex-col bg-[#080808] relative">
                  <div className="absolute top-10 right-10 flex gap-4 z-10">
                      <button onClick={() => setConfig({...config, format: 'youtube'})} className={`px-8 py-2.5 text-[11px] font-black rounded border transition-all ${config.format === 'youtube' ? 'bg-white text-black border-white shadow-xl' : 'border-white/20 text-slate-500 hover:text-white'}`}>YOUTUBE 16:9</button>
                      <button onClick={() => setConfig({...config, format: 'social'})} className={`px-8 py-2.5 text-[11px] font-black rounded border transition-all ${config.format === 'social' ? 'bg-white text-black border-white shadow-xl' : 'border-white/20 text-slate-500 hover:text-white'}`}>SOCIAL 9:16</button>
                  </div>

                  <div className="flex-1 flex items-center justify-center p-16">
                      <div className={`shadow-[0_60px_120px_rgba(0,0,0,1)] border border-white/10 overflow-hidden transition-all duration-700 bg-black ${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full max-w-5xl'}`}>
                          <canvas ref={canvasRef} width={1280} height={config.format === 'social' ? 2275 : 720} className="w-full h-full object-cover" />
                      </div>
                  </div>

                  {/* MASTERING CONSOLE */}
                  <div className="bg-[#0a0a0a] border-t border-white/10 p-10 flex items-center gap-12">
                      <button onClick={toggleAudition} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                          {isAuditioning ? <div className="w-4 h-4 bg-black"></div> : <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-black ml-1"></div>}
                      </button>
                      <div className="flex-grow">
                          <div className="flex justify-between text-[12px] text-slate-400 font-mono mb-4">
                              <span className="bg-white/5 px-3 py-1.5 rounded-sm border border-white/5">{isAudioLoading ? 'LOADING...' : `${currentTime.toFixed(1)} / ${duration.toFixed(1)}s`}</span>
                              <span className="uppercase tracking-[0.4em] text-brand-gold font-black opacity-80">Mastering Console Waveform</span>
                          </div>
                          <div className="h-16 bg-white/[0.02] rounded-sm relative overflow-hidden flex items-end gap-[3px] px-3 border border-white/5">
                              {Array.from({ length: 180 }).map((_, i) => (
                                  <div key={i} className={`w-full rounded-t-sm transition-all duration-300 ${ (i / 180) < (currentTime / duration) ? 'bg-brand-gold' : 'bg-slate-800' }`} 
                                       style={{ height: `${(Math.sin(i * 0.15) * 20 + 40) * (0.8 + Math.random() * 0.5)}%`, opacity: (i / 180) < (currentTime / duration) ? 1 : 0.15 }}></div>
                              ))}
                          </div>
                      </div>
                      <button onClick={startRecording} className="px-14 py-6 bg-brand-gold text-slate-950 font-black uppercase text-sm tracking-[0.5em] hover:bg-white transition-all transform hover:scale-105 shadow-2xl">開始錄製</button>
                  </div>
              </div>

              {/* 控制面板右 */}
              <div className="w-80 bg-black/80 border-l border-white/5 p-8 overflow-y-auto custom-scrollbar space-y-12">
                  <section>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">垂直對齊</h4>
                      <div className="grid grid-cols-3 gap-2">
                          {['top', 'middle', 'bottom'].map(v => (
                              <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`py-4 text-2xl border rounded transition-all ${config.alignVertical === v ? 'bg-white text-black shadow-lg' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                                  {v === 'top' ? '↑' : v === 'middle' ? '÷' : '↓'}
                              </button>
                          ))}
                      </div>
                  </section>
                  <section>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">歌詞風格</h4>
                      <div className="grid grid-cols-1 gap-2">
                          {['none', 'cutout'].map(s => (
                              <button key={s} onClick={() => setConfig({...config, lyricStyle: s as any})} className={`py-4 text-[11px] font-black uppercase border rounded transition-all ${config.lyricStyle === s ? 'bg-brand-gold text-black border-brand-gold shadow-lg' : 'border-white/10 text-slate-600 hover:text-white'}`}>
                                  {s === 'none' ? '沒有任何' : '剪下 (Cutout)'}
                              </button>
                          ))}
                      </div>
                  </section>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in cursor-none">
              <div className="absolute top-14 left-14 z-[300] flex items-center gap-6 pointer-events-none">
                  <div className="w-5 h-5 bg-red-600 rounded-full animate-pulse shadow-[0_0_40px_red]"></div>
                  <span className="text-base font-black uppercase tracking-[0.5em] text-white">LIVE RECORDING • {currentTime.toFixed(2)}s</span>
              </div>
              <div className="absolute inset-0 z-[200]" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              
              <div className="flex-1 flex items-center justify-center bg-black">
                  <div className={`${config.format === 'social' ? 'aspect-[9/16] h-full' : 'aspect-video w-full'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>

              <div className="bg-[#050505] p-20 flex justify-between items-center border-t border-white/10 relative z-[300]">
                  <div className="flex flex-col">
                      <span className="text-[12px] text-brand-gold font-black uppercase mb-5 animate-pulse tracking-[0.5em]">TAP ANYWHERE TO SYNCHRONIZE LYRICS</span>
                      <span className="text-6xl font-black text-white uppercase truncate max-w-6xl">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-20 py-8 border border-red-900 text-red-500 text-base font-black uppercase tracking-[0.5em] hover:bg-red-900 hover:text-white transition-all shadow-2xl">STOP</button>
              </div>
          </div>
      )}

      {/* 錄製結束後的聯絡資訊 */}
      {mode === 'contact' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-6xl font-black uppercase mb-12 tracking-[0.4em] text-gold-glow">Mastering Complete</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-10 bg-slate-900/60 backdrop-blur-3xl p-20 border border-white/10 shadow-2xl max-w-2xl w-full rounded-sm">
                  <div className="space-y-6">
                      <label className="text-[12px] text-slate-500 font-black uppercase tracking-[0.4em]">領航者姓名 (Director Name)</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-8 text-white text-2xl focus:border-brand-gold outline-none font-black uppercase tracking-widest text-center" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} autoFocus />
                  </div>
                  <button type="submit" className="w-full py-8 bg-white text-black font-black uppercase text-base tracking-[0.5em] hover:bg-brand-gold transition-all shadow-2xl">確定並導出成果 (Export)</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-9xl font-black uppercase mb-16 tracking-tighter text-gold-glow">SUCCESS</h2>
              <div className="bg-slate-900/60 backdrop-blur-3xl p-24 border border-white/10 shadow-2xl space-y-12 max-w-4xl w-full text-center">
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("影片生成中，請稍候...");
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}.webm`; a.click(); 
                    }} 
                    className="w-full py-10 bg-white text-black font-black uppercase text-xl tracking-[0.6em] hover:bg-brand-gold transition-all shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                   >儲存錄製影片 (HD WebM)</button>
                   <button onClick={() => navigate('/')} className="w-full mt-8 py-6 border border-white/10 text-slate-500 font-bold uppercase text-[12px] tracking-[0.7em] hover:text-white transition-all">返回主選單 (Home)</button>
              </div>
          </div>
      )}

      {selectedSong && (
          <audio 
            ref={audioRef} 
            src={convertToDirectStream(selectedSong.audioUrl)} 
            crossOrigin="anonymous" 
            className="hidden" 
            onCanPlayThrough={() => setIsAudioLoading(false)}
          />
      )}
    </div>
  );
};

export default Interactive;