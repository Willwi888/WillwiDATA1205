
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo } from '../services/geminiService';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'select' | 'philosophy' | 'gate' | 'playing' | 'mastered' | 'rendering' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isStamping, setIsStamping] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [stamps, setStamps] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) { setSelectedSong(s); setMode('philosophy'); }
    }
  }, [location.state, songs]);

  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
    }
    setCurrentLineIndex(0);
    setStamps([]);
  }, [selectedSong]);

  const handleStamp = useCallback(() => {
      if (mode !== 'playing' || !audioRef.current || isPaused) return;
      setIsStamping(true);
      setTimeout(() => setIsStamping(false), 100);
      const now = audioRef.current.currentTime;
      setStamps(prev => [...prev, now]);
      setCurrentLineIndex(prev => {
          if (prev < lyricsLines.length - 1) return prev + 1;
          audioRef.current?.pause();
          setMode('mastered');
          showToast("每一秒鐘，都是你親手標註的真實");
          return prev;
      });
  }, [mode, lyricsLines.length, showToast, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && mode === 'playing') {
            e.preventDefault(); 
            handleStamp();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleStamp]);

  const startExportProcess = async () => {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }

      setMode('rendering');
      setRenderProgress(10);
      
      try {
          const imgResponse = await fetch(selectedSong?.coverUrl || '');
          const blob = await imgResponse.blob();
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          
          setRenderProgress(40);
          const aiBg = await generateAiVideo(base64, selectedSong?.title || 'Unknown');
          
          if (aiBg) {
              setRenderProgress(100);
              setBgVideoUrl(aiBg);
              setMode('finished');
              showToast("氛圍底層渲染成功 - AI 已退至背景");
          } else {
              throw new Error("Render failed");
          }
      } catch (e) {
          showToast("渲染超時或失敗，請檢查金鑰狀態", "error");
          setMode('mastered');
      }
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong) return '';
      return resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '');
  }, [selectedSong]);

  const formatTime = (time: number) => {
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#020617] min-h-screen text-white flex flex-col pt-24 pb-32 relative overflow-hidden">
      
      <div className="fixed inset-0 z-0 overflow-hidden">
          {bgVideoUrl ? (
            <video src={bgVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover blur-sm opacity-50" />
          ) : (
            <img src={selectedSong?.coverUrl || ''} className="w-full h-full object-cover blur-[100px] scale-125 opacity-10 animate-studio-breathe" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black"></div>
      </div>

      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-10 max-w-4xl mx-auto text-center animate-fade-in space-y-12">
              <h2 className="text-brand-gold font-black uppercase tracking-[1em] text-sm">{t('manifesto_title')}</h2>
              <div className="text-2xl md:text-4xl font-bold leading-relaxed tracking-widest text-slate-200">
                  {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
              </div>
              <button onClick={() => setMode('select')} className="w-full py-16 bg-white text-black font-black uppercase tracking-[0.5em] text-2xl rounded-sm hover:bg-brand-gold transition-all shadow-2xl">
                  {t('btn_start_studio')}
              </button>
          </div>
      )}

      {mode === 'select' && (
          <div className="flex-1 w-full max-w-6xl mx-auto px-10 py-10 relative z-10 animate-fade-in overflow-y-auto custom-scrollbar">
              <h2 className="text-4xl font-black uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-6">Recording Vault</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {songs.filter(s => s.isInteractiveActive || isAdmin).map(song => (
                      <div key={song.id} onClick={() => { setSelectedSong(song); setMode('philosophy'); }} className="group cursor-pointer bg-slate-900/40 p-10 rounded-sm border border-white/20 hover:border-brand-gold transition-all flex items-center gap-10">
                          {/* 聽眾前端：移除黑白轉換特效，始終保持清晰全彩 */}
                          <img src={song.coverUrl} className="w-32 h-32 object-cover grayscale-0 opacity-100 transition-all shadow-2xl" alt="" />
                          <div className="text-left">
                            <h4 className="text-2xl font-black uppercase tracking-widest text-white group-hover:text-brand-gold">{song.title}</h4>
                            <span className="text-[11px] text-brand-gold font-mono tracking-widest uppercase font-bold">{song.isrc}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {mode === 'philosophy' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in max-w-5xl mx-auto space-y-20">
              <div className="text-center space-y-12">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.8em] text-lg">{t('before_start_title')}</h3>
                  <div className="text-2xl md:text-4xl text-slate-100 leading-loose tracking-[0.2em] font-medium px-10 border-l border-white/10">
                      {t('before_start_content')}
                  </div>
              </div>
              <button onClick={() => { isAdmin ? (setMode('playing'), setTimeout(() => audioRef.current?.play(), 100)) : setMode('gate'); }} className="w-full max-w-2xl py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                  {t('btn_understand')}
              </button>
          </div>
      )}

      {mode === 'gate' && (
          <div className="flex-1 flex items-center justify-center relative z-10 animate-fade-in">
              <div className="max-w-xl w-full bg-slate-900/80 border border-white/10 p-16 text-center rounded-sm shadow-2xl space-y-12 backdrop-blur-3xl">
                  <img src={selectedSong?.coverUrl} className="w-48 h-48 mx-auto border-2 border-brand-gold" alt="" />
                  <h3 className="text-3xl font-black uppercase tracking-widest text-white">{selectedSong?.title}</h3>
                  <button onClick={() => setShowPayment(true)} className="w-full py-10 bg-brand-gold text-black font-black uppercase text-xl tracking-[0.2em] hover:bg-white transition-all">ACCESS STUDIO</button>
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in h-full">
              <div className="w-full max-w-5xl space-y-16 text-center mb-24 pointer-events-none transition-transform duration-100" style={{ transform: isStamping ? 'scale(0.98)' : 'scale(1)' }}>
                  <p className="text-xl text-white/10 font-bold uppercase tracking-widest h-8 overflow-hidden">{lyricsLines[currentLineIndex - 1] || ''}</p>
                  <div key={currentLineIndex} className={`bg-black/90 px-16 py-14 rounded-sm border-l-[10px] border-brand-gold shadow-2xl inline-block cinema-lyrics-blur ${isStamping ? 'shadow-[0_0_30px_rgba(251,191,36,0.3)]' : ''}`}>
                      <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tight leading-tight">
                          {lyricsLines[currentLineIndex] || '...'}
                      </h2>
                  </div>
                  <p className="text-xl text-white/10 font-bold uppercase tracking-widest h-8 overflow-hidden">{lyricsLines[currentLineIndex + 1] || ''}</p>
              </div>
              <div className="w-full max-w-4xl space-y-12">
                  <button onMouseDown={handleStamp} className={`w-full py-24 bg-white/5 border-2 border-white/20 text-white rounded-sm font-black text-4xl uppercase tracking-[0.4em] transition-all shadow-2xl ${isStamping ? 'bg-brand-gold text-black scale-95 border-brand-gold' : 'hover:bg-white/10'} ${isPaused ? 'opacity-30' : ''}`}>
                      {isPaused ? 'PAUSED' : '點 擊 或 按 空 白 鍵'}
                  </button>
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-sm space-y-6">
                      <div className="flex items-center gap-6">
                          <button onClick={() => { if(isPaused) audioRef.current?.play(); else audioRef.current?.pause(); setIsPaused(!isPaused); }} className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:bg-brand-gold transition-all">
                              {isPaused ? <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                          </button>
                          <div className="flex-1 space-y-3">
                              <div className="flex justify-between text-[11px] font-black text-white uppercase tracking-widest">
                                  <span>{formatTime(currentTime)}</span>
                                  <span>{formatTime(duration)}</span>
                              </div>
                              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-gold shadow-[0_0_15px_#fbbf24] transition-all duration-300" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {mode === 'mastered' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in">
              <div className="max-w-4xl w-full bg-slate-900/90 border border-white/10 rounded-sm p-20 text-center space-y-16 shadow-2xl backdrop-blur-3xl relative">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                      <span className="text-[120px] font-black text-brand-gold tracking-tighter leading-none">DONE</span>
                  </div>
                  <h2 className="text-6xl font-black uppercase tracking-tighter text-white">READY TO EXPORT</h2>
                  <p className="text-white uppercase tracking-widest text-xs leading-loose font-bold">
                      每一格歌詞的對時，都是你曾真實停留在這首歌裡的證明。<br/>點擊獲取一段由 AI 運算的 8 秒氛圍底層，並在本地合成高品質 1080P 影片。
                  </p>
                  <button onClick={startExportProcess} className="w-full bg-brand-gold text-black py-12 rounded-sm font-black text-2xl uppercase tracking-[0.3em] hover:bg-white transition-all shadow-2xl">
                    🎬 {t('btn_get_mp4')}
                  </button>
              </div>
          </div>
      )}

      {mode === 'rendering' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-fade-in space-y-16">
              <div className="w-80 h-80 relative">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="160" cy="160" r="150" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={942} strokeDashoffset={942 - (942 * renderProgress) / 100} className="text-brand-gold transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-8xl font-black font-mono tracking-tighter">{Math.floor(renderProgress)}%</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.6em] mt-6 text-brand-gold animate-pulse">VEO 3.1 氛圍底層</span>
                  </div>
              </div>
              <p className="text-white text-xs uppercase tracking-[0.4em] animate-pulse font-bold">正在運算一段 8 秒抽象氛圍... 本次僅計費單次 veo-3.1-fast 費率。</p>
          </div>
      )}

      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in text-center space-y-16">
              <div className="w-full max-w-6xl aspect-video bg-black/90 rounded-sm overflow-hidden border border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.9)] relative">
                  <video src={bgVideoUrl || ''} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30" />
                  <div className="absolute inset-0 flex items-center justify-between px-24 py-24 z-10">
                      <div className="flex-1 text-left space-y-10">
                          <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-2xl">
                              {lyricsLines[Math.floor(lyricsLines.length / 3)]}
                          </h2>
                          <div className="h-[1px] w-24 bg-brand-gold"></div>
                          <p className="text-slate-500 text-sm uppercase tracking-[0.8em] font-bold">
                              {selectedSong?.title} - Willwi
                          </p>
                      </div>
                      <div className="relative">
                          <div className="absolute -inset-10 bg-brand-gold/10 blur-[80px] opacity-40"></div>
                          <img 
                            src={selectedSong?.coverUrl} 
                            className="w-[450px] h-[450px] object-cover rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/10 relative z-20" 
                            alt="" 
                          />
                      </div>
                  </div>
                  <div className="absolute bottom-12 left-24 text-[10px] text-white/20 font-mono tracking-widest uppercase">
                    HANDCRAFTED SYNC / WILLWI STUDIO SESSION
                  </div>
              </div>
              <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
                  <a href={bgVideoUrl || '#'} download={`WILLWI_HANDMADE_${selectedSong?.title}.mp4`} className="flex-1 py-12 bg-white text-black font-black uppercase text-xl tracking-widest rounded-sm hover:bg-brand-gold transition-all shadow-2xl">
                    📥 下載氛圍底層影片
                  </a>
                  <button onClick={() => setMode('select')} className="px-16 py-12 border border-white/10 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">返回錄音室</button>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); setMode('playing'); setTimeout(() => audioRef.current?.play(), 100); }} />
      {selectedSong && (
          <audio 
            /* Fix: Changed currentSongSrc to currentAudioSrc to match defined memo hook */
            key={currentAudioSrc} ref={audioRef} src={currentAudioSrc} 
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
            crossOrigin="anonymous" preload="auto"
          />
      )}
    </div>
  );
}; export default Interactive;
