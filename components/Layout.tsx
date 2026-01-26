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
  const [showSnow, setShowSnow] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { lang, setLang } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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
        
        {showSnow && <Snowfall />}

        {toast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] px-8 py-3 bg-white/10 backdrop-blur-3xl border border-white/10 shadow-2xl animate-fade-in flex items-center">
            <span className={`text-[10px] uppercase tracking-[0.3em] ${toast.type === 'error' ? 'text-rose-500' : 'text-brand-gold'}`}>{toast.message}</span>
          </div>
        )}

        {/* 橫式統一導覽列 */}
        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 px-10 md:px-20 h-24 flex items-center justify-between ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-white/5' : ''}`}>
          <div className="flex items-center gap-12">
            <Link to="/" className="text-xl tracking-[0.4em] uppercase hover:text-brand-gold transition-colors">Willwi</Link>
            <div className="h-4 w-[0.5px] bg-white/10 hidden md:block"></div>
            <div className="flex items-center gap-10">
              <Link to="/database" className={`text-[9px] uppercase tracking-[0.6em] transition-all ${location.pathname === '/database' ? 'text-brand-gold' : 'text-white/40 hover:text-white'}`}>作品庫</Link>
              <Link to="/interactive" className={`text-[9px] uppercase tracking-[0.6em] transition-all ${location.pathname === '/interactive' ? 'text-brand-gold' : 'text-white/40 hover:text-white'}`}>錄製室</Link>
              <Link to="/about" className={`text-[9px] uppercase tracking-[0.6em] transition-all ${location.pathname === '/about' ? 'text-brand-gold' : 'text-white/40 hover:text-white'}`}>關於</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => setShowSnow(!showSnow)} className={`text-[8px] uppercase tracking-[0.4em] px-3 py-1 border transition-all ${showSnow ? 'border-brand-gold text-brand-gold' : 'border-white/10 text-white/20'}`}>
              Snow {showSnow ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[8px] uppercase tracking-[0.4em] text-white/40 border border-white/10 px-4 py-1.5 hover:bg-white hover:text-black transition-all">
              {lang === 'zh' ? 'EN' : 'ZH'}
            </button>
          </div>
        </nav>

        <main className="relative z-10">{children}</main>

        <footer className="py-20 px-10 border-t border-white/5 text-center bg-black opacity-30 hover:opacity-100 transition-all">
            <p className="text-[8px] uppercase tracking-[1em]">Willwi Official Music Database • 2025</p>
        </footer>
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;