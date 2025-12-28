import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, Language } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

// 支援外部連結轉直連
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

interface LyricConfig {
    alignVertical: 'top' | 'middle' | 'bottom';
    textCase: 'uppercase' | 'lowercase';
    effect: 'none' | 'glow';
    motion: 'slide' | 'fade' | 'scaling' | 'bubbling';
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
      motion: 'scaling'
  });

  const [lineIndex, setLineIndex] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number>(0);
  
  // 動態效果專用 Ref
  const smoothIndexRef = useRef<number>(0);
  const hitPulseRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const demoTimeRef = useRef<number>(0); // 預覽模式下的自動滾動時間

  // 管理員決定的 20 首精選
  const activeSongs = songs.filter(s => s.isInteractiveActive).slice(0, 20);

  useEffect(() => {
    if (location.state?.initialMode) setMode(location.state.initialMode as InteractionMode);
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
          img.onload = () => { 
              bgImageRef.current = img; 
              if (mode === 'setup') requestAnimationFrame(renderPreviewLoop);
          };
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
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 15000000 });
          const chunks: Blob[] = [];
          recorder.ondataavailable = e => chunks.push(e.data);
          recorder.onstop = () => setRecordedChunks(chunks);
          mediaRecorderRef.current = recorder;
          recorder.start();
          
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          renderPlayingLoop();
      } catch (e) { console.error(e); }
  };

  const handleLineClick = (e?: any) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (mode !== 'playing') return;
      hitPulseRef.current = 1.0; 
      
      setLineIndex(prev => {
          if (prev < lyricsArrayRef.current.length - 1) {
              const next = prev + 1;
              if (lyricsArrayRef.current[next] === "END") {
                  setTimeout(finishRecording, 1500); 
              }
              return next;
          }
          return prev;
      });
  };

  const renderPreviewLoop = () => {
      if (mode !== 'setup') return;
      demoTimeRef.current += 0.01;
      // 模擬自動滾動歌詞
      smoothIndexRef.current = (Math.sin(demoTimeRef.current * 0.5) + 1) * (lyricsArrayRef.current.length / 2);
      draw();
      animationFrameRef.current = requestAnimationFrame(renderPreviewLoop);
  };

  const renderPlayingLoop = () => {
      draw();
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          animationFrameRef.current = requestAnimationFrame(renderPlayingLoop);
      } else if (audioRef.current?.ended) {
          finishRecording();
      }
  };

  const finishRecording = () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
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
      
      // 在播放模式下使用真實 Index，預覽模式下使用自動 Index
      if (mode === 'playing') {
        smoothIndexRef.current += (lineIndex - smoothIndexRef.current) * 0.15;
      }
      hitPulseRef.current *= 0.9;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      const rightX = w * 0.72;
      const centerY = h / 2;
      const isEnding = lyricsArrayRef.current[lineIndex] === "END";

      if (bgImageRef.current) {
          ctx.save();
          ctx.globalAlpha = isEnding ? 0.35 : 0.2;
          const coverSize = 550;
          ctx.drawImage(bgImageRef.current, rightX - coverSize/2, centerY - coverSize/2, coverSize, coverSize);
          ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = isEnding ? '#ffffff' : '#fbbf24'; 
      ctx.font = '900 36px Montserrat';
      ctx.fillText(selectedSong.title, rightX, centerY + 340);
      ctx.fillStyle = '#ffffff'; 
      ctx.font = '700 24px Montserrat';
      ctx.fillText(`Willwi`, rightX, centerY + 390);

      const lyricsX = w * 0.32;
      const lineHeight = 170;
      let baseOffset = centerY;
      if (config.alignVertical === 'top') baseOffset = h * 0.25;
      if (config.alignVertical === 'bottom') baseOffset = h * 0.75;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < lyricsArrayRef.current.length; i++) {
          let text = lyricsArrayRef.current[i];
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          
          const relPos = i - smoothIndexRef.current;
          const y = baseOffset + (relPos * lineHeight);
          const dist = Math.abs(relPos);

          if (text === "END" && i === lineIndex) continue;
          if (dist > 6) continue;

          let scale = 1;
          let alpha = 1;

          if (dist < 0.5) {
              alpha = 1;
              if (config.motion === 'scaling') scale = 1.35 + (hitPulseRef.current * 0.5);
              if (config.effect === 'glow') {
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 35 + (hitPulseRef.current * 40);
              }
              ctx.fillStyle = '#fbbf24'; 
          } else {
              alpha = Math.max(0, 0.7 - (dist * 0.25));
              scale = 0.9 - (dist * 0.05);
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#4b5563'; 
          }

          if (alpha <= 0.01 || text === "END") continue;

          ctx.save();
          ctx.translate(lyricsX, y);
          ctx.scale(scale, scale);
          ctx.globalAlpha = isEnding ? 0 : alpha;
          ctx.font = `900 ${text.length > 18 ? 40 : 64}px Montserrat`;
          ctx.fillText(text, 0, 0);
          ctx.restore();
      }
  };

  const getSpotifyEmbedUrl = (song: Song) => {
      if (!song.spotifyLink) return null;
      const id = song.spotifyLink.split('/track/')[1]?.split('?')[0];
      return id ? `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0` : null;
  };

  return (
    <div className="max-w-7xl mx-auto pt-24 px-6 pb-40 min-h-screen text-slate-100">
      
      {mode === 'menu' && (
          <div className="flex flex-col items-center py-20 animate-fade-in text-center">
              <h2 className="text-7xl font-black uppercase tracking-tighter mb-4 text-white">Creative Laboratory</h2>
              <p className="text-slate-500 text-xs tracking-[0.6em] uppercase mb-20">Willwi 官方音樂創作實驗場</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                  <div onClick={() => setMode('intro')} className="p-12 bg-slate-900 border border-white/5 hover:border-brand-gold cursor-pointer group transition-all transform hover:-translate-y-1">
                      <h3 className="text-brand-gold font-black text-2xl uppercase tracking-widest mb-4">Resonance Sync</h3>
                      <p className="text-slate-400 text-xs leading-loose uppercase tracking-widest">開始製作專屬您的歌詞動態影片 (NT$ 320)</p>
                  </div>
                  <div onClick={() => navigate('/database')} className="p-12 bg-transparent border border-white/10 hover:border-white cursor-pointer transition-all transform hover:-translate-y-1">
                      <h3 className="text-white font-black text-2xl uppercase tracking-widest mb-4">Music Library</h3>
                      <p className="text-slate-500 text-xs leading-loose uppercase tracking-widest">瀏覽 Willwi 完整作品檔案</p>
                  </div>
              </div>
          </div>
      )}

      {mode === 'intro' && (
          <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="bg-slate-900/50 p-12 border border-white/5">
                  <h2 className="text-4xl font-black mb-8 uppercase tracking-widest text-brand-gold">支持音樂人 歌詞影片創作工具</h2>
                  <p className="text-slate-400 text-sm leading-relaxed tracking-widest max-w-3xl mb-12">
                      這是一個專屬於您的個人化空間。我們從作品庫中精選了 20 首曲目，您可以透過下方 Spotify 合法試聽，選擇最感同身受的作品，並透過您的節奏感賦予它獨一無二的動態靈魂。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeSongs.map(s => (
                          <div key={s.id} className="bg-black/40 border border-white/5 p-4 flex flex-col hover:border-brand-gold transition-all group">
                              <div className="flex gap-4 mb-4">
                                  <div className="w-20 h-20 flex-shrink-0">
                                      <img src={s.coverUrl} className="w-full h-full object-cover rounded" alt="" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-black uppercase truncate group-hover:text-brand-gold transition-colors">{s.title}</h4>
                                      <p className="text-[10px] text-slate-500 mt-1 uppercase">Willwi • {s.releaseDate}</p>
                                      <button onClick={() => handleSelectSong(s)} className="mt-3 px-4 py-1.5 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">SELECT</button>
                                  </div>
                              </div>
                              {/* Spotify Legal Preview */}
                              {getSpotifyEmbedUrl(s) && (
                                  <iframe src={getSpotifyEmbedUrl(s)} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-sm opacity-60 hover:opacity-100 transition-opacity"></iframe>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {mode === 'setup' && selectedSong && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-slate-900 p-10 border border-white/10 shadow-2xl">
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-10">Lyrics Styling</h3>
                  <div className="space-y-10">
                      <div>
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Alignment</label>
                          <div className="flex gap-2">
                              {['top', 'middle', 'bottom'].map(v => (
                                  <button key={v} onClick={() => setConfig({...config, alignVertical: v as any})} className={`flex-1 py-4 border font-black uppercase text-xs transition-all ${config.alignVertical === v ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>{v}</button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Motion Type (動態預覽效果)</label>
                          <div className="grid grid-cols-2 gap-2">
                              {['scaling', 'slide', 'fade', 'bubbling'].map(m => (
                                  <button key={m} onClick={() => setConfig({...config, motion: m as any})} className={`py-4 border font-black uppercase text-[10px] tracking-widest transition-all ${config.motion === m ? 'bg-brand-gold text-black border-brand-gold shadow-lg' : 'border-white/10 text-slate-500'}`}>{m}</button>
                              ))}
                          </div>
                      </div>
                      <button onClick={startRecording} className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-sm shadow-2xl hover:bg-white transition-all transform hover:scale-[1.02]">START SYNC RECORDING</button>
                  </div>
              </div>
              
              {/* Instant Visual Preview Window */}
              <div className="relative aspect-video bg-black border border-white/20 overflow-hidden flex items-center justify-center">
                  <div className="absolute top-4 left-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 px-2 py-1">Style Preview</div>
                  <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full object-contain" />
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="fixed inset-0 z-[110] flex flex-col bg-black overflow-hidden">
              <div className="absolute top-8 left-8 z-30 flex items-center gap-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_red]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">LIVE RECORDING • WILLWI STUDIO</span>
              </div>
              <div className="absolute inset-0 z-[200] cursor-pointer touch-manipulation active:bg-white/5 transition-colors" onMouseDown={handleLineClick} onTouchStart={handleLineClick} />
              <div className="flex-1 flex items-center justify-center bg-black">
                  <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
              </div>
              <div className="bg-[#050505] border-t border-white/5 p-8 flex justify-between items-center relative z-30">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-2 animate-pulse">錄製中：請點擊畫面推進歌詞</span>
                      <span className="text-2xl font-bold text-white uppercase truncate max-w-3xl">{lyricsArrayRef.current[lineIndex]}</span>
                  </div>
                  <button onClick={finishRecording} className="px-8 py-4 border border-red-900 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all">STOP</button>
              </div>
          </div>
      )}

      {mode === 'contact' && (
          <div className="max-w-md mx-auto py-20 animate-fade-in text-center">
              <h2 className="text-4xl font-black uppercase text-white mb-6">錄製已結束</h2>
              <p className="text-slate-500 text-[10px] tracking-[0.5em] mb-12 uppercase leading-loose">請留下聯絡資訊，我們將在核對後<br/>郵寄通知 30 天雲端下載連結</p>
              <form onSubmit={(e) => { e.preventDefault(); setMode('finished'); }} className="space-y-4 bg-slate-900 p-8 border border-white/5 shadow-2xl">
                  <div className="text-left space-y-2 mb-6">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">聯絡姓名</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-4 text-white text-sm outline-none focus:border-brand-gold transition-all" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} />
                  </div>
                  <div className="text-left space-y-2 mb-6">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">電話 / 電子信箱</label>
                      <input type="text" required className="w-full bg-black border border-white/10 p-4 text-white text-sm outline-none focus:border-brand-gold transition-all" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">送出紀錄並下載</button>
              </form>
          </div>
      )}

      {mode === 'finished' && (
          <div className="max-w-3xl mx-auto text-center py-20 animate-fade-in">
              <h2 className="text-6xl font-black uppercase text-white mb-6 tracking-tighter leading-none">SUCCESS</h2>
              <p className="text-slate-500 text-[10px] tracking-[0.5em] mb-16 uppercase">您的個人化對時作品已成功生成</p>
              <div className="bg-slate-900 p-12 border border-white/5 shadow-2xl">
                   <button 
                        onClick={() => {
                            const blob = new Blob(recordedChunks, { type: 'video/webm' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `WILLWI_SYNC_${selectedSong?.title}.webm`; a.click();
                        }}
                        className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all shadow-lg"
                   >立即保存影片 (Download)</button>
                   <button onClick={() => setMode('menu')} className="w-full mt-4 py-4 border border-white/10 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">回到選單</button>
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