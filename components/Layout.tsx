
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
      <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black">
        
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 rounded-sm shadow-2xl animate-fade-in-up flex items-center gap-4 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-brand-gold text-black'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-700 px-10 py-8 ${scrolled ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 py-6' : ''}`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-black tracking-tighter text-white hover:text-brand-gold transition-colors uppercase">Willwi <span className="text-[10px] tracking-[0.4em] text-brand-gold ml-2 font-bold">1205</span></Link>
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

        <footer className="py-20 px-10 border-t border-white/5 text-center">
            <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">Willwi Official Music Database • 2025</p>
        </footer>
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
