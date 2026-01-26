
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

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
      <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black font-sans">
        
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 rounded-sm shadow-2xl animate-fade-in-up flex items-center gap-4 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-brand-gold text-black'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-700 px-10 md:px-20 py-8 ${scrolled ? 'bg-black/80 backdrop-blur-3xl border-b border-white/5 py-5' : ''}`}>
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
            
            {/* Logo Section - Left */}
            <div className="flex justify-start">
              <Link to="/" className="group flex items-center gap-3">
                <span className="text-2xl font-black tracking-tighter text-white uppercase group-hover:text-brand-gold transition-colors duration-300">
                  Willwi
                </span>
                <span className="text-[9px] tracking-[0.4em] text-brand-gold font-black opacity-80 pt-1">
                  1205
                </span>
              </Link>
            </div>
            
            {/* Navigation Links - Centered (Desktop Only) */}
            <div className="hidden md:flex justify-center items-center gap-14">
              <Link to="/database" className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-brand-gold ${location.pathname === '/database' ? 'text-brand-gold' : 'text-white/60 hover:text-white'}`}>作品庫</Link>
              <Link to="/interactive" className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-brand-gold ${location.pathname === '/interactive' ? 'text-brand-gold' : 'text-white/60 hover:text-white'}`}>錄製室</Link>
              <Link to="/about" className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-brand-gold ${location.pathname === '/about' ? 'text-brand-gold' : 'text-white/60 hover:text-white'}`}>關於</Link>
              <Link to="/admin" className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-all">控制台</Link>
            </div>
            
            {/* Actions Section - Right */}
            <div className="flex justify-end items-center gap-8">
              <div className="h-4 w-[1px] bg-white/10 hidden md:block"></div>
              <button 
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white border border-white/20 px-5 py-2 hover:bg-white hover:text-black transition-all duration-500 rounded-sm"
              >
                {lang === 'zh' ? 'ENG' : '中文'}
              </button>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        <footer className="py-24 px-10 border-t border-white/5 text-center bg-black/50">
            <div className="flex justify-center gap-10 mb-10 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
                <span className="text-[10px] font-black tracking-widest uppercase">Spotify</span>
                <span className="text-[10px] font-black tracking-widest uppercase">Apple Music</span>
                <span className="text-[10px] font-black tracking-widest uppercase">YouTube</span>
            </div>
            <p className="text-[9px] text-slate-800 font-black uppercase tracking-[0.5em]">Willwi Official Music Database • 2025</p>
        </footer>
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
