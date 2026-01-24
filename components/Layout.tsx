
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const [scrolled, setScrolled] = useState(false);
  const [showSnow, setShowSnow] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { t, lang, setLang } = useTranslation();
  const { isAdmin } = useUser();
  const { globalSettings, dbStatus, isSyncing, refreshData } = useData();
  
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
    const items = [
      { path: '/', label: 'HOME' },
      { path: '/database', label: 'CATALOG' },
      { path: '/interactive', label: 'STUDIO' },
    ];
    if (isAdmin) {
      items.push({ path: '/admin', label: 'MANAGER' });
    }
    return items;
  }, [isAdmin]);

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
              
              <div className="hidden lg:flex items-center space-x-14 text-[11px] font-black uppercase tracking-[0.4em]">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} className={location.pathname === item.path ? "text-brand-gold border-b-2 border-brand-gold pb-1" : "text-white/60 hover:text-white"}>
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

        <footer className="py-24 border-t border-white/10 relative z-10 bg-black/60 backdrop-blur-xl text-center flex flex-col items-center gap-4">
           <p className="text-[10px] font-black tracking-[1.2em] uppercase text-slate-500">WILLWI OFFICIAL PROJECT • STUDIO ARCHIVE</p>
           <div className="flex gap-10 text-[9px] font-black tracking-widest uppercase text-slate-600">
              <span>© 2025 Willwi Music</span>
              <Link to="/admin" className="hover:text-brand-gold transition-colors">MANAGER ACCESS</Link>
           </div>
        </footer>
      </div>
    </ToastContext.Provider>
  );
}; export default Layout;
