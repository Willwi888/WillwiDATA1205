import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song, Language } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

interface LyricConfig {
    alignVertical: 'top' | 'middle' | 'bottom';
    textCase: 'uppercase' | 'lowercase' | 'capitalize';
    style: 'none' | 'broken' | 'cutout' | 'layered';
    effect: 'none' | 'glow';
    motion: 'slide' | 'fade' | 'wipe' | 'static' | 'popup' | 'mask' | 'scaling' | 'fill' | 'bubbling';
    motionTweaks: 'none' | 'floating';
    syncType: 'line' | 'word';
}

type InteractionMode = 'menu' | 'intro' | 'setup' | 'playing' | 'contact' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '', email: '' });
  
  const [config, setConfig] = useState<LyricConfig>({
      alignVertical: 'middle',
      textCase: 'uppercase',
      style: 'none',
      effect: 'glow',
      motion: 'scaling',
      motionTweaks: 'none',
      syncType: 'line'
  });

  const [lineIndex, setLineIndex] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number>(0);
  
  const smoothIndexRef = useRef<number>(0);
  const hitPulseRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // 僅顯示管理員啟用的 20 首
  const activeSongs = songs.filter(s => s.isInteractiveActive).slice(0, 20);

  useEffect(() => {
    if (location.state?.initialMode) {
        setMode(location.state.initialMode as InteractionMode);
    }
  }, [location.state]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      const rawLines = (song.lyrics || "NO LYRICS").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ READY ]", ...rawLines, "END"];
      
      if (song.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = song.coverUrl;
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('setup');
  };

  const startRecording = async () => {
      if (!canvasRef.current || !audioRef.current) return;
      
      setMode('playing');
      setLineIndex(0);
      smoothIndexRef.current = 0;
      hitPulseRef.current = 0;
      
      try {
          const stream = (canvasRef.current as any).captureStream(60);
          const recorder = new MediaRecorder(stream, { 
              mimeType: 'video/webm;codecs=vp9', 
              videoBitsPerSecond: 12000000 
          });
          const chunks: Blob[] = [];
          recorder.ondataavailable = e => chunks.push(e.data);
          recorder.onstop = () => setRecordedChunks(chunks);
          mediaRecorderRef.current = recorder;
          recorder.start();
          
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          renderLoop();
      } catch (e) {
          console.error("Recording Start Error:", e);
      }
  };

  const handleTap = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mode !== 'playing') return;

      hitPulseRef.current = 1.0; 
      
      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              if (lyricsArrayRef.current[next] === "END") {
                  setTimeout(finishRecording, 1500); // END 出現後 1.5 秒結束
              }
              return next;
          }
          return prev;
      });
  };

  const renderLoop = () => {
      draw();
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          animationFrameRef.current = requestAnimationFrame(renderLoop);
      } else if (audioRef.current?.ended) {
          finishRecording();
      }
  };

  const finishRecording = () => {
      if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
      }
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

      smoothIndexRef.current += (lineIndex - smoothIndexRef.current) * 0.15;
      hitPulseRef.current *= 0.9;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      // 右側：作品資訊 (歌手自動帶 Willwi)
      const rightX = w * 0.72;
      const centerY = h / 2;

      if (bgImageRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          const coverSize = 500;
          ctx.drawImage(bgImageRef.current, rightX - coverSize/2, centerY - coverSize/2, coverSize, coverSize);
          ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444'; 
      ctx.font = '900 32px Montserrat';
      ctx.fillText(`歌名：${selectedSong.title}`, rightX, centerY + 320);
      ctx.fillStyle = '#ffffff'; 
      ctx.font = '700 28px Montserrat';
      ctx.fillText(`Singer: Willwi`, rightX, centerY + 380);

      // 左側：歌詞呈現
      const lyricsX = w * 0.32;
      const lineHeight = 150;
      let baseOffset = centerY;
      if (config.alignVertical === 'top') baseOffset = h * 0.25;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.75;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const visibleRange = 10;
      for (let i = Math.floor(smoothIndexRef.current - visibleRange); i <= Math.ceil(smoothIndexRef.current + visibleRange); i++) {
          if (i < 0 || i >= lyricsArrayRef.current.length) continue;

          let text = lyricsArrayRef.current[i];
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          
          const relPos = i - smoothIndexRef.current;
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (text === "END" && i === lineIndex) {
              // END 邏輯：歌詞完全消失
              continue;
          }

          let scale = 1;
          let alpha = 1;

          if (dist < 0.5) {
              alpha = 1;
              scale = 1.3 + (hitPulseRef.current * 0.6);
              if (config.effect === 'glow') {
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 25 + (hitPulseRef.current * 40);
              }
              ctx.fillStyle = '#fbbf24'; 
          } else {
              alpha = Math.max(0, 0.8 - (dist * 0.25));
              scale = 0.9 - (dist * 0.05);
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#4b5563'; 
          }

          if (alpha <= 0.01 || text === "END") continue;

          ctx.save();
          ctx.translate(lyricsX, y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = alpha;
          ctx.font = `900 ${text.length > 20 ? 36 : 56}px Montserrat`;
          ctx.fillText(text, 0, 0);
          ctx.restore();
      }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setMode('finished');
  };

  return (
    <div className="max-w-7xl mx-auto pt-24 px-6 pb-40 min-h-screen text-slate-100">
      
      {mode === 'menu' && (
          <div className="flex flex-col items-center py-20 animate-fade-in text-center">
              <h2 className="text-7xl font-black uppercase tracking-tighter mb-4 text-white">Interactive Studio</h2>
              <p className="text-slate-500 text-xs tracking-[0.6em] uppercase mb-20">選擇您的參與方式</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                  <div onClick={() => setMode('intro')} className="p-12 bg-slate-900 border border-white/5 hover:border-brand-gold cursor-pointer group transition-all">
                      <h3 className="text-brand-gold font-black text-2xl uppercase tracking-widest mb-4">共鳴同步 (NT$ 320)</h3>
                      <p className="text-slate-400 text-xs leading-loose uppercase tracking-widest">手工歌詞影片對位體驗</p>
                  </div>
                  <div onClick={() => navigate('/database')} className="p-12 bg-transparent border border-white/10 hover:border-white cursor-pointer transition-all">
                      <h3 className="text-white font-black text-2xl uppercase tracking-widest mb-4">Song Library</h3>
                      <p className="text-slate-500 text-xs leading-loose uppercase tracking-widest">查看完整作品庫</p>
                  </div>
              </div>
          </div>
      )}

      {mode === 'intro' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="bg-slate-900/50 p-12 border border-white/5 rounded-sm">
                  <h2 className="text-3xl font-black mb-8 uppercase tracking-widest text-brand-gold">支持音樂人 歌詞影片創作工具</h2>
                  <div className="space-y-6 text-slate-400 text-sm leading-relaxed tracking-widest">
                      <p>您可以從下方 20 首精選曲目中挑選，製作專屬您的動態歌詞影片。</p>
                      <p>費用包含創作者人工導引、高品質渲染服務，檔案將提供 30 天雲端連結供下載。</p>
                  </div>
                  <div className="mt-12">
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-8">選擇本次錄製作品 (20 首精選)</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                          {activeSongs.map(s => (
                              <div key={s.id} onClick={() => handleSelectSong(s)} className="group cursor-pointer">
                                  <div className="aspect-square bg-slate-800 border border-white/5 group-hover:border-brand-gold overflow-hidden mb-2 transition-all">
                                      <img src={s.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="" />
                                  </div>
                                  <p className="text-[10px] font-black uppercase truncate text-slate-500 group-hover:text-white">{s.title}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="max-w-5xl mx-auto bg-slate-900 p-10 border border-white/10 rounded-sm animate-fade-in">
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-10 text-center">歌詞動態選項</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                      <div>
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">對焦位置</label>
                          <div className="flex gap-2">
                              {['top', 'middle', 'bottom'].map(v => (
                                  <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`flex-1 py-4 border font-black uppercase text-xs transition-all ${config.alignVertical === v ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>{v}</button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">視覺特效</label>
                          <div className="flex gap-2">
                              {['none', 'glow'].map(e => (
                                  <button key={e} onClick={() => setConfig({...config, effect: e as any})} className={`flex-1 py-4 border font-black text-[10px] uppercase tracking-widest transition-all ${config.effect === e ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>{e}</button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="space-y-10">
                      <div>
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">動態模式</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['slide', 'fade', 'scaling', 'bubbling'].map(m => (
                                  <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-4 border font-black uppercase text-[10px] transition-all ${config.motion === m ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>{m}</button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
              <div className="mt-16 pt-10 border-t border-white/5 flex flex-col items-center">
                  <button onClick={startRecording} className="w-full max-w-md py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-sm shadow-2xl hover:bg-white transition-all">開始對時</button>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] flex flex-col bg-black overflow-hidden">
              <div className="absolute top-8 left-8 z-30 flex items-center gap-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">LIVE RECORDING</span>
              </div>
              <div className="absolute inset-0 z-[200] cursor-pointer bg-transparent" onMouseDown={handleTap} onTouchStart={handleTap} />
              <div className="flex-1 flex items-center justify-center bg-black">
                  <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain bg-[#0a0a0a]" />
              </div>
              <div className="bg-[#050505] border-t border-white/5 p-8 flex justify-between items-center relative z-30">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-2 animate-pulse">對時錄製中...</span>
                      <span className="text-xl font-bold text-white uppercase truncate max-w-2xl">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
              </div>
          </div>
      )}

      {mode === 'contact' && (
          <div className="max-w-md mx-auto py-20 animate-fade-in text-center">
              <h2 className="text-4xl font-black uppercase text-white mb-6">錄製已結束</h2>
              <p className="text-slate-500 text-[10px] tracking-[0.5em] mb-12 uppercase">請留下您的聯絡資訊以獲取影片通知</p>
              <form onSubmit={handleContactSubmit} className="space-y-4 bg-slate-900 p-8 border border-white/5">
                  <input type="text" placeholder="您的姓名" required className="w-full bg-black border border-white/10 p-4 text-white text-sm outline-none focus:border-brand-gold" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} />
                  <input type="tel" placeholder="聯絡電話" required className="w-full bg-black border border-white/10 p-4 text-white text-sm outline-none focus:border-brand-gold" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} />
                  <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">送出並下載</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
              <h2 className="text-5xl font-black uppercase text-white mb-6">創作保存成功</h2>
              <div className="bg-slate-900 p-12 border border-white/5 shadow-2xl mb-12">
                   <div className="bg-yellow-900/10 border border-yellow-500/20 p-6 mb-10 text-center">
                        <p className="text-brand-gold text-xs font-bold tracking-widest uppercase">您的專屬連結將寄送至您的手機。<br/>雲端連結效期為 30 天。</p>
                   </div>
                   <button 
                        onClick={() => {
                            const blob = new Blob(recordedChunks, { type: 'video/webm' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong?.title}.webm`; a.click();
                        }}
                        className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all"
                   >立即預覽與下載</button>
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