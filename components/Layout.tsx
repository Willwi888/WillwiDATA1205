import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
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
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { lang, setLang } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black font-sans relative">
        
        {/* 極簡氛圍雪花 */}
        <Snowfall />

        {toast && (
          <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[2000] px-10 py-5 bg-black/80 backdrop-blur-3xl border border-white/5 shadow-2xl animate-fade-in-up flex items-center gap-6`}>
            <span className={`text-[10px] uppercase tracking-[0.4em] ${toast.type === 'error' ? 'text-rose-500' : 'text-brand-gold'}`}>{toast.message}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-1000 px-10 md:px-24 py-12 ${scrolled ? 'bg-black/95 backdrop-blur-3xl border-b border-white/5 py-8' : ''}`}>
          <div className="max-w-[1700px] mx-auto grid grid-cols-3 items-center">
            
            <div className="flex justify-start">
              <Link to="/" className="group flex items-center gap-4">
                <span className="text-2xl tracking-tighter text-white uppercase group-hover:text-brand-gold transition-colors duration-700">
                  Willwi
                </span>
                <span className="text-[9px] tracking-[0.8em] text-brand-gold opacity-30 pt-1">
                  1205
                </span>
              </Link>
            </div>
            
            <div className="hidden md:flex justify-center items-center gap-20">
              <Link to="/database" className={`text-[9px] uppercase tracking-[1em] transition-all ${location.pathname === '/database' ? 'text-brand-gold' : 'text-white/30 hover:text-white'}`}>作品庫</Link>
              <Link to="/interactive" className={`text-[9px] uppercase tracking-[1em] transition-all ${location.pathname === '/interactive' ? 'text-brand-gold' : 'text-white/30 hover:text-white'}`}>錄製室</Link>
              <Link to="/about" className={`text-[9px] uppercase tracking-[1em] transition-all ${location.pathname === '/about' ? 'text-brand-gold' : 'text-white/30 hover:text-white'}`}>關於</Link>
              <Link to="/admin" className="text-[9px] uppercase tracking-[1em] text-white/5 hover:text-white transition-all">控制台</Link>
            </div>
            
            <div className="flex justify-end items-center gap-12">
              <div className="h-5 w-[0.5px] bg-white/5 hidden md:block"></div>
              <button 
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
                className="text-[8px] uppercase tracking-[0.4em] text-white/40 border border-white/5 px-6 py-2.5 hover:bg-white hover:text-black transition-all duration-700"
              >
                {lang === 'zh' ? 'ENG' : '中文'}
              </button>
            </div>
          </div>
        </nav>

        <main className="relative z-10">{children}</main>

        <footer className="py-40 px-10 border-t border-white/5 text-center bg-black relative z-20">
            <div className="flex justify-center gap-16 mb-20 opacity-5 grayscale hover:opacity-30 transition-all duration-1000">
                <span className="text-[8px] tracking-[0.6em] uppercase">Spotify</span>
                <span className="text-[8px] tracking-[0.6em] uppercase">Apple Music</span>
                <span className="text-[8px] tracking-[0.6em] uppercase">YouTube</span>
            </div>
            <p className="text-[8px] text-slate-900 uppercase tracking-[1em]">Willwi Official Music Database • 2025</p>
        </footer>
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;