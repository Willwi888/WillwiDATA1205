
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useData, resolveDirectLink } from '../context/DataContext';
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
  // Initialize navigate using useNavigate hook to fix "Cannot find name 'navigate'" error
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showSnow, setShowSnow] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { t, lang, setLang } = useTranslation();
  const { isAdmin } = useUser();
  const { globalSettings, dbStatus, isSyncing, refreshData, songs, currentSong, setCurrentSong, isPlaying, setIsPlaying } = useData();
  
  // Player Local State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const resolvedBgUrl = useMemo(() => resolveDirectLink(globalSettings.portraitUrl), [globalSettings.portraitUrl]);

  const isBgVideo = useMemo(() => {
    const url = (resolvedBgUrl || '').toLowerCase();
    return url.includes('.mp4') || url.includes('googlevideo') || url.includes('videoplayback') || url.includes('export=download') || url.includes('&raw=1');
  }, [resolvedBgUrl]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Audio Controller
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Playback blocked or failed:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong, setIsPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const playNext = () => {
    if (!currentSong || songs.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      setCurrentSong(songs[randomIndex]);
    } else {
      const currentIndex = songs.findIndex(s => s.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % songs.length;
      setCurrentSong(songs[nextIndex]);
    }
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const statusInfo = useMemo(() => {
    if (isSyncing) return { color: 'bg-brand-gold animate-pulse', label: 'SYNCING' };
    switch (dbStatus) {
        case 'ONLINE': return { color: 'bg-emerald-500 shadow-[0_0_10px_#10b981]', label: 'CLOUD' };
        case 'ERROR': return { color: 'bg-rose-500', label: 'ERROR' };
        default: return { color: 'bg-slate-600', label: 'LOCAL' };
    }
  }, [dbStatus, isSyncing]);

  const navItems = useMemo(() => {
    return [
      { path: '/', label: 'HOME' },
      { path: '/database', label: 'CATALOG' },
      { path: '/interactive', label: 'STUDIO' },
      { path: '/admin', label: 'MANAGER' }
    ];
  }, []);

  const currentAudioSrc = useMemo(() => {
    if (!currentSong) return '';
    return resolveDirectLink(currentSong.audioUrl || currentSong.dropboxUrl || '');
  }, [currentSong]);

  // Don't show global player in Interactive mode to avoid audio conflicts
  const isInteractiveMode = location.pathname === '/interactive';

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen flex flex-col relative bg-black text-white font-sans selection:bg-brand-gold selection:text-black">
        
        {showSnow && <Snowfall />}

        {/* Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
            <div className="absolute inset-0 opacity-100 transition-opacity duration-1000">
                {isBgVideo ? (
                  <video src={resolvedBgUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-[8000ms] animate-studio-breathe" style={{ backgroundImage: `url(${resolvedBgUrl})` }}></div>
                )}
            </div>
            <div className="absolute inset-0 studio-ambient-glow"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
        </div>

        {/* Global Success Toast */}
        {toast && (
          <div className="fixed top-32 right-10 z-[200] animate-fade-in-up">
            <div className={`px-8 py-5 rounded-sm border-l-4 backdrop-blur-3xl shadow-2xl flex items-center gap-5 ${toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 shadow-emerald-500/20' : 'bg-rose-950/80 border-rose-500 shadow-rose-500/20'}`}>
               <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} animate-ping`}></div>
               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{toast.message}</span>
            </div>
          </div>
        )}

        <nav className={`fixed w-full top-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-black/80 backdrop-blur-2xl py-4 shadow-2xl' : 'bg-transparent py-10 md:py-16'}`}>
          <div className="max-w-[1900px] mx-auto px-10 md:px-20 flex items-center justify-between">
              <div className="flex items-center gap-8">
                  <Link to="/" className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-white hover:text-brand-gold transition-all shrink-0">WILLWI</Link>
                  
                  <button onClick={() => { refreshData(); showToast("DATABASE UPDATED"); }} className="flex items-center gap-3 group cursor-pointer">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-brand-gold transition-colors">{statusInfo.label}</span>
                  </button>
              </div>
              
              <div className="hidden lg:flex items-center space-x-12 text-[11px] font-black uppercase tracking-[0.4em]">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} className={`transition-all ${location.pathname === item.path ? "text-brand-gold border-b-2 border-brand-gold pb-1" : "text-white/60 hover:text-white"}`}>
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="flex gap-6 items-center">
                  <button 
                    onClick={() => { setShowSnow(!showSnow); showSnow ? showToast("SNOW DEACTIVATED") : showToast("SNOW ACTIVATED"); }} 
                    className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${showSnow ? 'text-brand-gold border-brand-gold/40' : 'text-slate-600'}`}
                  >
                    ❄️
                  </button>

                  <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-5 py-2.5 border-2 border-white/10 hover:border-white/50 rounded-sm font-black text-[10px] uppercase tracking-widest bg-black/40">
                    {lang === 'en' ? 'ENGLISH' : '繁體中文'}
                  </button>
              </div>
          </div>
        </nav>

        <main className="flex-grow z-10 relative">{children}</main>

        <footer className={`py-24 border-t border-white/10 relative z-10 bg-black/60 backdrop-blur-xl text-center flex flex-col items-center gap-4 ${currentSong && !isInteractiveMode ? 'mb-28' : ''}`}>
           <p className="text-[10px] font-black tracking-[1.2em] uppercase text-slate-500">WILLWI OFFICIAL PROJECT • STUDIO ARCHIVE</p>
           <div className="flex gap-10 text-[9px] font-black tracking-widest uppercase text-slate-600">
              <span>© 2025 Willwi Music</span>
           </div>
        </footer>

        {/* Global Mini Player */}
        {currentSong && !isInteractiveMode && (
          <div className="fixed bottom-0 left-0 right-0 z-[150] bg-black/90 backdrop-blur-3xl border-t border-white/10 p-5 md:px-10 flex items-center gap-8 animate-fade-in-up shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
             <audio 
               ref={audioRef} 
               src={currentAudioSrc} 
               onTimeUpdate={handleTimeUpdate} 
               onLoadedMetadata={handleLoadedMetadata}
               onEnded={playNext}
               preload="auto"
             />
             
             <div className="flex items-center gap-5 min-w-0 max-w-[25%] md:max-w-xs">
                <img src={currentSong.coverUrl} className="w-14 h-14 object-cover rounded shadow-2xl border border-white/5" alt="" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-white text-[11px] font-black uppercase truncate tracking-widest">{currentSong.title}</h5>
                  <p className="text-brand-gold text-[9px] font-bold uppercase tracking-widest truncate mt-1">{currentSong.isrc || 'No ISRC'}</p>
                </div>
             </div>

             <div className="flex-1 flex flex-col items-center gap-3">
                <div className="flex items-center gap-8 md:gap-12">
                   <button 
                    onClick={() => setIsShuffle(!isShuffle)} 
                    className={`transition-all hover:scale-110 active:scale-90 ${isShuffle ? 'text-brand-gold' : 'text-slate-600'}`}
                    title="Shuffle"
                   >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                   </button>
                   <button onClick={playPrev} className="text-white hover:text-brand-gold transition-all active:scale-90" title="Previous">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                   </button>
                   <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:bg-brand-gold transition-all active:scale-95 shadow-xl"
                    title={isPlaying ? "Pause" : "Play"}
                   >
                      {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                   </button>
                   <button onClick={playNext} className="text-white hover:text-brand-gold transition-all active:scale-90" title="Next">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                   </button>
                </div>
                
                <div className="w-full max-w-2xl flex items-center gap-4">
                   <span className="text-[9px] font-mono text-slate-500 w-10 text-right">{formatTime(currentTime)}</span>
                   <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer">
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="h-full bg-brand-gold relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_10px_#fff] transition-opacity"></div>
                      </div>
                   </div>
                   <span className="text-[9px] font-mono text-slate-500 w-10">{formatTime(duration)}</span>
                </div>
             </div>

             <div className="hidden md:flex w-xs justify-end gap-6 items-center">
                <button onClick={() => navigate(`/song/${currentSong.id}`)} className="text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors tracking-widest">View Details</button>
             </div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}; export default Layout;