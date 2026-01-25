
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useData, resolveDirectLink, ASSETS } from '../context/DataContext';
import Snowfall from './Snowfall';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within Layout");
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [showSnow, setShowSnow] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { lang, setLang } = useTranslation();
  const { globalSettings, syncSuccess, isSyncing, refreshData, currentSong, isPlaying, setIsPlaying } = useData();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<HTMLIFrameElement>(null);

  // 解析背景視覺（影片、YouTube 或圖片）
  const rawBgUrl = globalSettings.portraitUrl || ASSETS.willwiPortrait;
  
  // 偵測是否為 YouTube
  const youtubeId = useMemo(() => {
    const url = rawBgUrl;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }, [rawBgUrl]);

  const resolvedBgUrl = useMemo(() => resolveDirectLink(rawBgUrl), [rawBgUrl]);
  
  // 解析環境背景音樂
  const resolvedBgMusicUrl = useMemo(() => resolveDirectLink(globalSettings.qr_global_payment), [globalSettings.qr_global_payment]);

  // 判斷視覺類型
  const isBgVideo = useMemo(() => {
    if (youtubeId) return false;
    const url = (resolvedBgUrl || '').toLowerCase();
    return url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
  }, [resolvedBgUrl, youtubeId]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 當主播放器播放作品時，背景（影片、YouTube、背景音）靜音
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isPlaying;
    if (bgAudioRef.current) bgAudioRef.current.muted = isPlaying;
    
    // YouTube 靜音處理需要透過 postMessage 發送指令給 iframe
    if (ytPlayerRef.current) {
      const msg = isPlaying ? 'mute' : 'unMute';
      ytPlayerRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: msg, args: [] }), '*');
    }
  }, [isPlaying]);

  // 作品播放器邏輯
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong, setIsPlaying]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const currentAudioSrc = useMemo(() => {
    if (!currentSong) return '';
    return resolveDirectLink(currentSong.audioUrl || currentSong.dropboxUrl || '');
  }, [currentSong]);

  const isInteractiveMode = location.pathname === '/interactive';

  // 點擊進入解鎖
  const handleEnter = () => {
    setHasInteracted(true);
    if (isBgVideo && videoRef.current) {
      videoRef.current.play().catch(e => console.log("Video play failed", e));
    }
    if (resolvedBgMusicUrl && bgAudioRef.current) {
      bgAudioRef.current.play().catch(e => console.log("Ambient Audio play failed", e));
    }
    // 解鎖 YouTube 聲音
    if (ytPlayerRef.current && !resolvedBgMusicUrl) {
      ytPlayerRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
      ytPlayerRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen flex flex-col relative bg-black text-white font-sans selection:bg-brand-gold selection:text-black">
        
        {!hasInteracted && (
          <div 
            onClick={handleEnter}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center cursor-pointer transition-opacity duration-1000 group"
          >
            <div className="text-white text-[11px] font-black uppercase tracking-[1em] mb-10 opacity-30 group-hover:opacity-100 transition-opacity">
              BREATHING WILLWI
            </div>
            <div className="w-16 h-[1px] bg-white/10 group-hover:bg-brand-gold group-hover:w-32 transition-all"></div>
            <div className="mt-20 opacity-10 group-hover:opacity-30 transition-all text-[8px] tracking-widest font-black">TAP ANYWHERE TO ENTER</div>
          </div>
        )}

        {showSnow && <Snowfall />}

        {/* 環境圖層：背景影像 (YouTube/Video/Image) + 旋轉圓環 */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
            
            {/* 視覺背景 */}
            <div className="absolute inset-0 opacity-100">
                {youtubeId ? (
                  /* YouTube 全螢幕模擬 Cover 效果 */
                  <div className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
                    <iframe
                      ref={ytPlayerRef}
                      className="w-full h-full scale-[1.15]"
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&enablejsapi=1&modestbranding=1&iv_load_policy=3&origin=${window.location.origin}`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                    ></iframe>
                  </div>
                ) : isBgVideo ? (
                  <video 
                    ref={videoRef}
                    src={resolvedBgUrl} 
                    autoPlay 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div 
                    className="w-full h-full bg-cover bg-center bg-no-repeat animate-studio-breathe" 
                    style={{ backgroundImage: `url(${resolvedBgUrl})` }}
                  ></div>
                )}
            </div>

            {/* 旋轉圓環：視覺中心 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div 
                  className="w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] bg-contain bg-center bg-no-repeat opacity-[0.08] animate-zen-spin mix-blend-screen"
                  style={{ backgroundImage: `url('https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000')` }}
                ></div>
            </div>

            {/* 環境背景音樂 */}
            {resolvedBgMusicUrl && (
              <audio ref={bgAudioRef} src={resolvedBgMusicUrl} loop playsInline crossOrigin="anonymous" />
            )}

            <div className="absolute inset-0 studio-ambient-glow"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
        </div>

        {toast && (
          <div className="fixed top-32 right-10 z-[200] animate-fade-in-up">
            <div className={`px-8 py-5 rounded-sm border-l-4 backdrop-blur-3xl shadow-2xl flex items-center gap-5 ${toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 shadow-emerald-500/20' : 'bg-rose-950/80 border-rose-500 shadow-rose-500/20'}`}>
               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{toast.message}</span>
            </div>
          </div>
        )}

        <nav className={`fixed w-full top-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-black/80 backdrop-blur-2xl py-4 shadow-2xl' : 'bg-transparent py-10 md:py-16'}`}>
          <div className="max-w-[1900px] mx-auto px-10 md:px-20 flex items-center justify-between">
              <div className="flex items-center gap-10">
                  <Link to="/" className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-white hover:text-brand-gold transition-all shrink-0">WILLWI</Link>
                  <div 
                    onClick={refreshData} 
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-1000 ${isSyncing ? 'bg-brand-gold animate-pulse' : syncSuccess ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 animate-bounce'}`}
                  ></div>
              </div>
              
              <div className="hidden lg:flex items-center space-x-12 text-[11px] font-black uppercase tracking-[0.4em]">
                  <Link to="/" className={`transition-all ${location.pathname === '/' ? "text-brand-gold" : "text-white/40 hover:text-white"}`}>HOME</Link>
                  <Link to="/database" className={`transition-all ${location.pathname === '/database' ? "text-brand-gold" : "text-white/40 hover:text-white"}`}>CATALOG</Link>
                  <Link to="/interactive" className={`transition-all ${location.pathname === '/interactive' ? "text-brand-gold" : "text-white/40 hover:text-white"}`}>STUDIO</Link>
                  <Link to="/admin" className={`transition-all ${location.pathname === '/admin' ? "text-brand-gold" : "text-white/40 hover:text-white"}`}>MANAGER</Link>
              </div>

              <div className="flex gap-8 items-center">
                  <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="text-white/20 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest">
                    {lang === 'en' ? 'EN' : 'ZH'}
                  </button>
                  <button onClick={() => setShowSnow(!showSnow)} className={`text-lg transition-all ${showSnow ? 'text-brand-gold' : 'text-slate-800'}`}>❄</button>
              </div>
          </div>
        </nav>

        <main className="flex-grow z-10 relative">{children}</main>

        {currentSong && !isInteractiveMode && (
          <div className="fixed bottom-0 left-0 right-0 z-[150] bg-black/95 backdrop-blur-3xl border-t border-white/5 p-6 md:px-12 flex items-center gap-8 animate-fade-in-up">
             <audio 
               ref={audioRef} 
               src={currentAudioSrc} 
               crossOrigin="anonymous"
               onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
               onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
               onEnded={() => setIsPlaying(false)}
             />
             <div className="flex items-center gap-6 min-w-0 max-w-xs">
                <img src={currentSong.coverUrl} className="w-12 h-12 object-cover rounded shadow-xl border border-white/5" alt="" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-white text-[11px] font-black uppercase truncate tracking-widest">{currentSong.title}</h5>
                  <p className="text-brand-gold text-[9px] font-bold uppercase tracking-widest truncate mt-1">{currentSong.isrc}</p>
                </div>
             </div>
             <div className="flex-1 flex flex-col items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:bg-brand-gold transition-all active:scale-95 shadow-xl"
                >
                  {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
                <div className="w-full max-w-xl h-0.5 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-brand-gold" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                </div>
             </div>
             <div className="hidden md:block w-32"></div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}; export default Layout;
