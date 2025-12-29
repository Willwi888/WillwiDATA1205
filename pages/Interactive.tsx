
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

// 最強直連轉換器：優先使用 dl.dropboxusercontent.com 繞過 Dropbox 頁面
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        let u = new URL(url.trim());
        
        if (u.hostname.includes('dropbox.com')) {
            // 替換主網域為直連網域，這是最穩定的做法
            u.hostname = 'dl.dropboxusercontent.com';
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        
        return url;
    } catch (e) {
        return url;
    }
};

type InteractionMode = 'intro' | 'select' | 'gate' | 'configure' | 'order_form' | 'ticket';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
}

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', note: '' });
  const [showPayment, setShowPayment] = useState(false);
  
  // Audio State
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Visual Config
  const [config, setConfig] = useState<LyricConfig>({
      layout: 'lyrics',
      format: 'social', 
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lyricsArrayRef = useRef<string[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const lineIndexRef = useRef(0); 
  const smoothIndexRef = useRef(0);
  const hitPulseRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const activeSongs = songs.filter(s => s.isInteractiveActive);

  useEffect(() => {
      if (location.state?.targetSongId) {
          const s = songs.find(x => x.id === location.state.targetSongId);
          if (s) handleSelectSong(s);
      } else if (location.state?.initialMode) {
          setMode(location.state.initialMode as InteractionMode);
      }
  }, [songs, location.state]);

  // 當選擇歌曲時，立即準備音訊源
  useEffect(() => {
      if (!selectedSong?.audioUrl) return;
      const url = convertToDirectStream(selectedSong.audioUrl);
      setAudioSrc(url);
      setAudioError(null);
  }, [selectedSong]);

  const handleSelectSong = (song: Song) => {
      setSelectedSong(song);
      setMode('gate');
  };

  const unlockStudio = () => {
      if (!selectedSong) return;
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ PREVIEW ]", ...rawLines, "END"];
      
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = selectedSong.coverUrl;
          img.onload = () => { bgImageRef.current = img; };
      }
      setMode('configure');
      lineIndexRef.current = 0;
      smoothIndexRef.current = 0;
  };

  const togglePreviewPlay = () => {
      const audio = audioRef.current;
      if(audio) {
          if(isPlaying) {
              audio.pause();
          } else {
              setAudioError(null);
              audio.play().catch(e => {
                  console.error("Play Failed", e);
                  setAudioError("無法播放音訊，請檢查連結是否為有效的 Dropbox 直連。");
              });
          }
      }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
  };

  useEffect(() => {
      cancelAnimationFrame(animationFrameRef.current);
      if (mode === 'configure') renderLoop();
      return () => cancelAnimationFrame(animationFrameRef.current);
  }, [mode, config, selectedSong]);

  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const onTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
          if (lyricsArrayRef.current.length > 0) {
              const lineDur = audio.duration / lyricsArrayRef.current.length;
              const idx = Math.floor(audio.currentTime / (lineDur || 3));
              if (idx !== lineIndexRef.current) {
                  lineIndexRef.current = Math.min(idx, lyricsArrayRef.current.length - 1);
                  hitPulseRef.current = 1.0;
              }
          }
      };
      
      const onLoadedMetadata = () => {
          setDuration(audio.duration);
          setIsAudioLoading(false);
          setAudioError(null);
      };

      const onError = () => {
          setIsAudioLoading(false);
          setAudioError("音訊加載失敗。請確保 Dropbox 連結已開啟『任何人皆可查看』權限。");
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('waiting', () => setIsAudioLoading(true));
      audio.addEventListener('playing', () => { setIsAudioLoading(false); setAudioError(null); });
      audio.addEventListener('error', onError);

      return () => {
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('error', onError);
      };
  }, []);

  const renderLoop = () => {
      draw();
      if (mode === 'configure') animationFrameRef.current = requestAnimationFrame(renderLoop);
  };

  const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      (ctx as any).letterSpacing = '0px';

      const targetIdx = lineIndexRef.current;
      smoothIndexRef.current += (targetIdx - smoothIndexRef.current) * 0.05; 
      hitPulseRef.current *= 0.92;

      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current?.complete) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.filter = 'blur(100px) brightness(0.5)';
          const img = bgImageRef.current;
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
      }

      let lyricsX = w / 2;
      const baseFontSize = config.fontSize === 'small' ? 50 : config.fontSize === 'large' ? 110 : 70;
      const lineHeight = baseFontSize * 1.8;
      let centerOffset = h / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const items = lyricsArrayRef.current;
      items.forEach((textOrig, i) => {
          let text = textOrig;
          if (config.textCase === 'uppercase') text = text.toUpperCase();
          if (text === "END") return;

          let relPos = i - smoothIndexRef.current;
          let dist = Math.abs(relPos);
          let y = centerOffset + (relPos * lineHeight);

          let alpha = dist < 4 ? 1 - (dist * 0.35) : 0;
          const isLineActive = Math.round(smoothIndexRef.current) === i;

          if (alpha > 0.01) {
              ctx.save();
              ctx.translate(lyricsX, y);
              ctx.globalAlpha = alpha;
              ctx.font = `${isLineActive ? 900 : 600} ${baseFontSize}px Montserrat, sans-serif`;
              ctx.fillStyle = isLineActive ? '#ffffff' : 'rgba(255,255,255,0.4)';
              if (isLineActive) {
                  ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
                  ctx.shadowBlur = 20 + hitPulseRef.current * 30;
              }
              ctx.fillText(text, 0, 0);
              ctx.restore();
          }
      });
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
              <div className="max-w-2xl text-center z-10 space-y-12">
                  <div className="border border-brand-gold/30 inline-block px-4 py-1 text-[10px] text-brand-gold font-black uppercase tracking-[0.3em] mb-4">Willwi Studio</div>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">歌詞影片同步實驗室</h1>
                  <p className="text-slate-400 text-xs uppercase tracking-widest leading-loose">聽著威威的歌聲 • 動手對齊歌詞<br/>這是一場關於節奏與視覺的共鳴實驗</p>
                  <button onClick={() => setMode('select')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all text-xs shadow-lg mt-8">開始體驗</button>
              </div>
          </div>
      )}

      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-10">{t('interactive_select_title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {activeSongs.map(song => (
                          <div key={song.id} className="bg-slate-900 border border-white/5 overflow-hidden flex flex-col group cursor-pointer" onClick={() => handleSelectSong(song)}>
                              <div className="aspect-square relative overflow-hidden">
                                  <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-all"></div>
                              </div>
                              <div className="p-5"><h4 className="text-white font-black uppercase truncate text-lg">{song.title}</h4></div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center shadow-2xl">
                  <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white mb-8">準備進入工作室</h3>
                  <div className="flex items-center justify-center gap-6 mb-10 bg-black/30 p-4 rounded-lg">
                      <img src={selectedSong.coverUrl} className="w-20 h-20 object-cover rounded shadow-lg" alt="" />
                      <div className="text-left">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">已選曲目</div>
                        <div className="text-xl font-black text-white uppercase">{selectedSong.title}</div>
                      </div>
                  </div>
                  <button onClick={() => setShowPayment(true)} className="w-full py-4 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-lg">確認並解鎖</button>
                  <button onClick={() => setMode('select')} className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest underline">重新選擇歌曲</button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {mode === 'configure' && selectedSong && (
          <div className="flex-1 flex flex-col md:flex-row h-screen pt-20 overflow-hidden relative bg-[#050505]">
              <div className="w-full md:w-80 bg-slate-950 border-r border-white/5 p-6 flex flex-col z-20 shadow-2xl overflow-y-auto">
                  <div className="mb-8 border-b border-white/10 pb-4">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">對位工作台</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">請聽音樂並調整視覺樣式</p>
                  </div>
                  
                  <div className="bg-white/5 p-5 rounded-lg border border-white/10 mb-8 space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">控制播放</span>
                          <span className="text-[10px] font-mono text-slate-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      
                      <input 
                        type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeekChange}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-brand-gold"
                      />

                      <div className="flex justify-center items-center gap-6">
                          <button 
                            onClick={togglePreviewPlay} 
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                            disabled={isAudioLoading}
                          >
                              {isAudioLoading ? (
                                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                              ) : isPlaying ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                              ) : (
                                  <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              )}
                          </button>
                      </div>

                      {audioError && (
                          <div className="bg-red-900/20 border border-red-500/30 p-3 rounded mt-4">
                              <p className="text-[9px] text-red-400 leading-relaxed font-bold">{audioError}</p>
                              <button onClick={() => window.location.reload()} className="mt-2 text-[9px] text-white underline font-black uppercase">重新載入頁面</button>
                          </div>
                      )}
                  </div>

                  <div className="space-y-8 flex-1">
                      <div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-1">文字大小</div>
                          <div className="grid grid-cols-3 gap-2">
                              {['small', 'medium', 'large'].map((s) => (
                                  <button key={s} onClick={() => setConfig({...config, fontSize: s as any})} className={`py-2 text-[9px] font-black uppercase border rounded ${config.fontSize === s ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10'}`}>{s}</button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto pt-8">
                      <button onClick={() => setMode('order_form')} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-lg">確認並完成</button>
                  </div>
              </div>

              <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-4 overflow-hidden">
                  <div className="absolute top-6 left-0 w-full text-center z-10">
                      <span className="bg-black/50 border border-white/10 text-brand-gold px-4 py-2 rounded-full text-[10px] uppercase tracking-widest backdrop-blur-md animate-pulse">預覽模式 • 請調整視覺風格</span>
                  </div>
                  <div className={`shadow-2xl border border-white/5 bg-black relative ${config.format === 'social' ? 'aspect-[9/16] h-full max-h-[85vh]' : 'aspect-video w-full max-w-6xl'}`}>
                      <canvas ref={canvasRef} width={1920} height={config.format === 'social' ? 3413 : 1080} className="w-full h-full object-contain" />
                  </div>
              </div>
          </div>
      )}

      {mode === 'order_form' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black animate-fade-in">
              <h2 className="text-3xl font-black uppercase mb-8 tracking-tighter text-white">對位資訊確認</h2>
              <div className="bg-slate-900 p-10 border border-white/10 shadow-2xl max-w-lg w-full text-center space-y-6">
                  <div className="w-20 h-20 bg-brand-gold rounded-full flex items-center justify-center mx-auto text-black shadow-xl"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                  <p className="text-slate-400 text-sm leading-relaxed">您的歌詞樣式已設定完成。後台將根據您的選擇進行高畫質渲染。</p>
                  <button onClick={() => window.location.href = '/'} className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all">回到首頁</button>
              </div>
          </div>
      )}

      {audioSrc && <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" className="hidden" loop />}
    </div>
  );
};

export default Interactive;
