import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, Language } from '../types';
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

const getSpotifyEmbedUrl = (song: Song) => {
    if (song.spotifyId) return `https://open.spotify.com/embed/track/${song.spotifyId}`;
    return null;
};

const formatToLRC = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
};

interface LyricConfig {
    alignVertical: 'top' | 'middle' | 'bottom';
    textCase: 'uppercase' | 'lowercase' | 'capitalize';
    effect: 'none' | 'glow';
    motion: 'slide' | 'fade' | 'wipe' | 'static' | 'popup' | 'mask' | 'expand' | 'fill' | 'bubbling';
    syncMode: 'line' | 'word';
}

type InteractionMode = 'menu' | 'intro' | 'setup' | 'playing' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  
  const [config, setConfig] = useState<LyricConfig>({
      alignVertical: 'middle',
      textCase: 'uppercase',
      effect: 'glow',
      motion: 'slide',
      syncMode: 'line'
  });

  const [lineIndex, setLineIndex] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [lrcContent, setLrcContent] = useState<string>('');
  const [debugTime, setDebugTime] = useState(0);
  
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
          img.onload = () => { bgImageRef.current = img; draw(); };
      }
      setMode('setup');
  };

  const startRecording = async () => {
      if (!canvasRef.current || !audioRef.current) return;
      
      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      tapLogRef.current = [];
      setRecordedChunks([]);

      try {
          // 1. 影像擷取
          const canvasStream = (canvasRef.current as any).captureStream(60);
          
          // 2. 音訊混合 (Audio Mixer)
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          
          const source = ctx.createMediaElementSource(audioRef.current);
          const dest = ctx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(ctx.destination); // 讓使用者錄製時也能聽到聲音

          // 3. 混合音軌與影軌
          const combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
          ]);

          // 4. 初始化錄製器 (最佳化編碼設定)
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
              ? 'video/webm;codecs=vp9,opus' 
              : 'video/webm';
          
          const recorder = new MediaRecorder(combinedStream, { 
              mimeType, 
              videoBitsPerSecond: 25000000, // 25Mbps 高品質
              audioBitsPerSecond: 128000
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = e => {
              if (e.data.size > 0) chunks.push(e.data);
          };
          
          recorder.onstop = () => {
              setRecordedChunks(chunks);
              console.log("Recording Stopped. Chunks gathered:", chunks.length);
          };

          mediaRecorderRef.current = recorder;
          recorder.start(200); // 每 200ms 切分一次 chunk 增加穩定性
          
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          renderLoop();
      } catch (e) { 
          console.error("Recording Start Failed:", e);
          alert("錄製引擎啟動失敗，請檢查權限或更換瀏覽器。");
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
      const currentTime = audioRef.current.currentTime;
      const currentText = lyricsArrayRef.current[lineIndex];

      if (currentText !== "[ READY ]") tapLogRef.current.push({ text: currentText, time: currentTime });

      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              if (lyricsArrayRef.current[next] === "END") {
                  // 延遲結束以捕捉最後的影格
                  setTimeout(finishRecording, 1500); 
              }
              return next;
          }
          return prev;
      });
  };

  const renderLoop = () => {
      draw();
      if (audioRef.current) {
          setDebugTime(audioRef.current.currentTime);
          if (!audioRef.current.paused && !audioRef.current.ended) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
          } else if (audioRef.current?.ended) { 
              finishRecording(); 
          }
      }
  };

  const finishRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
      }
      
      const lrc = tapLogRef.current.map(log => `${formatToLRC(log.time)}${log.text}`).join('\n');
      setLrcContent(lrc);
      
      setMode('contact');
      cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
  };

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      smoothIndexRef.current += (lineIndex - smoothIndexRef.current) * 0.12;
      hitPulseRef.current *= 0.93;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      const rightX = w * 0.75;
      const centerY = h / 2;

      // 封面圖渲染
      if (bgImageRef.current?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          const coverSize = 600 * (1 + hitPulseRef.current * 0.05);
          ctx.drawImage(bgImageRef.current, rightX - coverSize/2, centerY - coverSize/2, coverSize, coverSize);
          ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24'; ctx.font = '900 36px Montserrat';
      ctx.fillText(selectedSong.title.toUpperCase(), rightX, centerY + 360);
      ctx.fillStyle = '#64748b'; ctx.font = '700 22px Montserrat';
      ctx.fillText(`WILLWI STUDIO`, rightX, centerY + 400);

      // 歌詞核心渲染
      const lyricsX = w * 0.35;
      const lineHeight = 180;
      let baseOffset = centerY;
      if (config.alignVertical === 'top') baseOffset = h * 0.25;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.75;

      ctx.textBaseline = 'middle';

      for (let i = 0; i < lyricsArrayRef.current.length; i++) {
          let text = lyricsArrayRef.current[i];
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          else if (config.textCase === 'lowercase') text = text.toLowerCase();

          const relPos = i - smoothIndexRef.current;
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (text === "END" || dist > 5) continue;

          ctx.save();
          let alpha = dist < 0.5 ? 1 : Math.max(0, 0.6 - dist * 0.2);
          let scale = dist < 0.5 ? 1.4 + hitPulseRef.current * 0.6 : 0.9 - dist * 0.05;
          
          ctx.translate(lyricsX, y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha;

          if (config.effect === 'glow' && dist < 0.5) {
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 35 + hitPulseRef.current * 55;
          }

          if (config.motion === 'expand' && dist < 0.5) {
             const charSpacing = hitPulseRef.current * 15;
             ctx.font = `900 60px Montserrat`;
             const totalW = ctx.measureText(text).width + (text.length * charSpacing);
             let curX = -totalW / 2;
             for (let char of text) {
                 ctx.fillText(char, curX, 0);
                 curX += ctx.measureText(char).width + charSpacing;
             }
          } else if (config.motion === 'bubbling' && dist < 0.5) {
              ctx.translate(0, Math.sin(Date.now()/200) * 12);
              ctx.fillText(text, 0, 0);
          } else {
              ctx.font = `900 70px Montserrat`;
              ctx.fillText(text, 0, 0);
          }

          ctx.restore();
      }
  };

  return (
    <div className="max-w-7xl mx-auto pt-24 px-6 pb-40 text-slate-100 min-h-screen">
      
      {mode === 'menu' && (
          <div className="flex flex-col items-center py-20 text-center animate-fade-in">
              <h2 className="text-7xl font-black uppercase tracking-tighter mb-4">Laboratory</h2>
              <p className="text-slate-500 text-xs tracking-[0.6em] uppercase mb-20">Creative Participation Base</p>
              <div onClick={() => navigate('/database')} className="p-16 bg-slate-900 border border-white/10 hover:border-brand-gold cursor-pointer transition-all">
                  <h3 className="text-brand-gold font-black text-2xl uppercase tracking-widest mb-4">Start New Session</h3>
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Go to Catalog and Select a Track</p>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
                  <img src={selectedSong.coverUrl} className="w-16 h-16 object-cover border border-white/10" alt="" />
                  <div>
                      <h3 className="text-2xl font-black uppercase">{selectedSong.title}</h3>
                      <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">Selected Material</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-1 space-y-8 bg-slate-900/50 p-8 border border-white/5 shadow-2xl">
                      <section>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-4 block">垂直對齊</label>
                          <div className="flex gap-2">
                              {['top', 'middle', 'bottom'].map((v, i) => (
                                  <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`flex-1 py-3 text-xl border transition-all ${config.alignVertical === v ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>
                                      {i === 0 ? '↑' : i === 1 ? '÷' : '↓'}
                                  </button>
                              ))}
                          </div>
                      </section>

                      <section>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-4 block">案件 (Case)</label>
                          <div className="flex gap-2">
                              {['uppercase', 'lowercase', 'capitalize'].map((c, i) => (
                                  <button key={c} onClick={() => setConfig({...config, textCase: c as any})} className={`flex-1 py-3 text-xs font-bold border transition-all ${config.textCase === c ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>
                                      {i === 0 ? 'AA' : i === 1 ? 'aa' : 'Aa'}
                                  </button>
                              ))}
                          </div>
                      </section>

                      <section>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-4 block">Motion (樣式選擇)</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['slide', 'fade', 'wipe', 'static', 'popup', 'mask', 'expand', 'fill', 'bubbling'].map(m => (
                                  <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-3 text-[9px] font-black uppercase border truncate px-1 ${config.motion === m ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/5 text-slate-600'}`}>
                                      {m === 'slide' ? '滑動' : m === 'fade' ? '褪色' : m === 'wipe' ? '擦拭' : m === 'static' ? '靜止' : m === 'popup' ? '彈出' : m === 'mask' ? '面具' : m === 'expand' ? '擴展' : m === 'fill' ? '充滿' : '冒泡'}
                                  </button>
                              ))}
                          </div>
                      </section>

                      <section>
                          <label className="text-[10px] text-slate-500 font-black uppercase mb-4 block">歌詞效果</label>
                          <div className="flex gap-2">
                              <button onClick={() => setConfig({...config, effect: 'none'})} className={`flex-1 py-3 text-[10px] font-bold border ${config.effect === 'none' ? 'bg-white text-black' : 'border-white/10 text-slate-500'}`}>沒有任何</button>
                              <button onClick={() => setConfig({...config, effect: 'glow'})} className={`flex-1 py-3 text-[10px] font-bold border ${config.effect === 'glow' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-slate-500'}`}>❇ 發光</button>
                          </div>
                      </section>

                      <button onClick={startRecording} className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-sm shadow-2xl hover:bg-white transition-all transform hover:scale-[1.02]">START RECORDING</button>
                  </div>

                  <div className="lg:col-span-2 bg-black border border-white/10 flex items-center justify-center relative aspect-video overflow-hidden shadow-2xl">
                      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full object-contain" />
                      <div className="absolute top-4 left-4 text-[9px] text-slate-500 uppercase tracking-widest font-black bg-black/80 px-2 py-1">Style Preview Engine</div>
                  </div>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-fade-in">
              <div className="absolute top-8 left-8 z-30 flex items-center gap-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_red]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">LIVE RECORDING • {debugTime.toFixed(2)}s</span>
              </div>
              <div className="absolute inset-0 z-[200] cursor-pointer" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              <div className="flex-1 flex items-center justify-center bg-black">
                  <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
              </div>
              <div className="bg-[#050505] p-8 flex justify-between items-center border-t border-white/5 relative z-30">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-brand-gold font-black uppercase mb-2 animate-pulse">RECORDING LIVE • TAP ANYWHERE TO SYNC</span>
                      <span className="text-2xl font-bold text-white uppercase truncate max-w-3xl">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-8 py-4 border border-red-900 text-red-500 text-[10px] font-black uppercase hover:bg-red-900 hover:text-white transition-all">STOP</button>
              </div>
          </div>
      )}

      {mode === 'contact' && (
          <div className="max-w-md mx-auto py-20 text-center animate-fade-in">
              <h2 className="text-4xl font-black uppercase mb-12">Session Over</h2>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-6 bg-slate-900 p-8 border border-white/5 shadow-2xl">
                  <div className="text-left space-y-2">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Name (Participant)</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-4 text-white text-sm focus:border-brand-gold outline-none" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs hover:bg-brand-gold transition-all">Unlock Results</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="max-w-3xl mx-auto text-center py-20 animate-fade-in">
              <h2 className="text-6xl font-black uppercase mb-16 tracking-tighter">SUCCESS</h2>
              <div className="bg-slate-900 p-12 border border-white/5 shadow-2xl space-y-6">
                   <button 
                    onClick={() => { 
                        if (recordedChunks.length === 0) return alert("影片尚未就緒，請稍後。");
                        const b = new Blob(recordedChunks, { type: 'video/webm' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); 
                        a.href = url; 
                        a.download = `WILLWI_SYNC_${selectedSong?.title}.webm`; 
                        a.click(); 
                    }} 
                    className="w-full py-6 bg-white text-black font-black uppercase text-xs hover:bg-brand-gold transition-all shadow-xl"
                   >Save Sync Video (HD + Audio)</button>

                   <button 
                    onClick={() => { 
                        const b = new Blob([lrcContent], { type: 'text/plain' }); 
                        const url = URL.createObjectURL(b); 
                        const a = document.createElement('a'); 
                        a.href = url; 
                        a.download = `${selectedSong?.title}.lrc`; 
                        a.click(); 
                    }} 
                    className="w-full py-4 border border-brand-gold text-brand-gold font-black uppercase text-xs hover:bg-brand-gold hover:text-black transition-all"
                   >Save LRC Script</button>

                   <button onClick={() => navigate('/')} className="w-full mt-4 py-4 border border-white/10 text-white font-bold uppercase text-[10px] hover:bg-white hover:text-black transition-all">Back to Home</button>
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