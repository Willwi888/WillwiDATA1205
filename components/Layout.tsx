
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
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showSnow, setShowSnow] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { t, lang, setLang } = useTranslation();
  const { isAdmin } = useUser();
  const { globalSettings, syncSuccess, isSyncing, refreshData, songs, currentSong, setCurrentSong, isPlaying, setIsPlaying } = useData();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const resolvedBgUrl = useMemo(() => resolveDirectLink(globalSettings.portraitUrl), [globalSettings.portraitUrl]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navItems = [
    { path: '/', label: 'HOME' },
    { path: '/database', label: 'CATALOG' },
    { path: '/interactive', label: 'STUDIO' },
    { path: '/admin', label: 'MANAGER' }
  ];

  const currentAudioSrc = useMemo(() => {
    if (!currentSong) return '';
    return resolveDirectLink(currentSong.audioUrl || currentSong.dropboxUrl || '');
  }, [currentSong]);

  const isInteractiveMode = location.pathname === '/interactive';

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen flex flex-col relative bg-black text-white font-sans selection:bg-brand-gold selection:text-black">
        
        {showSnow && <Snowfall />}

        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
            <div className="absolute inset-0 opacity-100 transition-opacity duration-1000">
                <div className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-[8000ms] animate-studio-breathe" style={{ backgroundImage: `url(${resolvedBgUrl})` }}></div>
            </div>
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
                    title={isSyncing ? "Saving..." : syncSuccess ? "Cloud Synced" : "Connection Error"}
                  ></div>
              </div>
              
              <div className="hidden lg:flex items-center space-x-12 text-[11px] font-black uppercase tracking-[0.4em]">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} className={`transition-all ${location.pathname === item.path ? "text-brand-gold border-b border-brand-gold pb-1" : "text-white/60 hover:text-white"}`}>
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="flex gap-8 items-center">
                  <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="text-white/40 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest">
                    {lang === 'en' ? 'EN' : 'ZH'}
                  </button>
                  <button onClick={() => setShowSnow(!showSnow)} className={`text-lg transition-all ${showSnow ? 'text-brand-gold' : 'text-slate-800'}`}>❄</button>
              </div>
          </div>
        </nav>

        <main className="flex-grow z-10 relative">{children}</main>

        {currentSong && !isInteractiveMode && (
          <div className="fixed bottom-0 left-0 right-0 z-[150] bg-black/90 backdrop-blur-3xl border-t border-white/5 p-6 md:px-12 flex items-center gap-8 animate-fade-in-up">
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
                   <div className="h-full bg-brand-gold transition-all duration-300" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                </div>
             </div>
             <div className="hidden md:block w-32"></div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}; export default Layout;
