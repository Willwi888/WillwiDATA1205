
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useData, resolveDirectLink, ASSETS } from '../context/DataContext';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within Layout");
  return context;
};

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  const { lang, setLang } = useTranslation();
  const { 
    globalSettings, currentSong, setCurrentSong, isPlaying, setIsPlaying, songs 
  } = useData();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 核心修復：當 currentSong 改變時，強制重新載入音軌
  useEffect(() => {
    if (currentSong && audioRef.current) {
      setIsLoadingAudio(true);
      const rawUrl = currentSong.audioUrl || currentSong.dropboxUrl || '';
      const src = resolveDirectLink(rawUrl);
      
      console.log("Loading Audio Source:", src);
      
      audioRef.current.pause();
      audioRef.current.src = src;
      audioRef.current.load();
      
      // 自動播放
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoadingAudio(false);
          })
          .catch(error => {
            console.error("Autoplay prevented or link broken:", error);
            setIsPlaying(false);
            setIsLoadingAudio(false);
          });
      }
    }
  }, [currentSong]);

  // 監控播放暫停指令
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    let nextIndex = isShuffle ? Math.floor(Math.random() * songs.length) : (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    let prevIndex = currentIndex - 1 < 0 ? songs.length - 1 : currentIndex - 1;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black">
        
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 rounded-sm shadow-2xl animate-fade-in-up flex items-center gap-4 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-brand-gold text-black'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-700 px-10 py-8 ${scrolled ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 py-6' : ''}`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-black tracking-tighter text-white hover:text-brand-gold transition-colors">WILLWI <span className="text-[10px] tracking-[0.4em] text-brand-gold ml-2 font-bold">1205</span></Link>
            <div className="hidden md:flex items-center gap-12">
              <Link to="/database" className="text-[11px] font-black uppercase tracking-[0.3em] hover:text-brand-gold transition-all">作品庫</Link>
              <Link to="/interactive" className="text-[11px] font-black uppercase tracking-[0.3em] hover:text-brand-gold transition-all">錄製室</Link>
              <Link to="/about" className="text-[11px] font-black uppercase tracking-[0.3em] hover:text-brand-gold transition-all">關於</Link>
              <Link to="/admin" className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-brand-gold transition-all">控制台</Link>
              <div className="h-4 w-[1px] bg-white/10 mx-4"></div>
              <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[10px] font-black uppercase tracking-widest text-brand-gold hover:text-white transition-all">{lang === 'zh' ? 'ENGLISH' : '中文'}</button>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        {currentSong && (
          <div className="fixed bottom-0 left-0 w-full z-[150] bg-black/95 backdrop-blur-3xl border-t border-white/5 px-10 py-6 animate-fade-in-up">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center gap-10">
              
              <div className="flex items-center gap-6 w-full md:w-80 shrink-0">
                <img src={currentSong.coverUrl} className={`w-16 h-16 object-cover rounded shadow-2xl ${isPlaying ? 'animate-pulse-slow' : ''}`} />
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-black text-white uppercase truncate tracking-widest">{currentSong.title}</h4>
                  <p className="text-[9px] text-brand-gold font-black uppercase tracking-[0.3em] mt-1">WILLWI 1205</p>
                </div>
              </div>

              <div className="flex-1 w-full flex flex-col items-center gap-4">
                <div className="flex items-center gap-8">
                  <button onClick={handlePrev} className="text-white hover:text-brand-gold transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                  </button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold transition-all transform active:scale-95 shadow-xl">
                    {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                  <button onClick={handleNext} className="text-white hover:text-brand-gold transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                  </button>
                </div>
                
                <div className="w-full flex items-center gap-6">
                  <span className="text-[9px] font-mono font-bold text-slate-500 min-w-[40px]">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-white/5 relative group rounded-full">
                    <input type="range" min="0" max={duration || 100} step="0.1" value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="h-full bg-brand-gold transition-all duration-100 shadow-[0_0_10px_#fbbf24]" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 min-w-[40px]">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-6 w-80 justify-end">
                {isLoadingAudio && <div className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>}
                <Link to={`/song/${currentSong.id}`} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-gold transition-all">LYRICS</Link>
              </div>
            </div>
            
            <audio 
              ref={audioRef} 
              onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setIsLoadingAudio(false); }} 
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={handleNext}
              onError={() => { 
                showToast("音訊載入失敗，請檢查 Dropbox 連結是否正確", "error"); 
                setIsLoadingAudio(false); 
                setIsPlaying(false);
              }}
            />
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
