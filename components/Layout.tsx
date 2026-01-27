
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import GlobalPlayer from './GlobalPlayer';

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
      <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black">
        
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-8 py-4 rounded-sm shadow-2xl animate-fade-in-up flex items-center gap-4 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-brand-gold text-black'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 px-10 md:px-20 py-8 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-5' : ''}`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <Link to="/" className="group flex items-center gap-3">
              <span className="text-2xl font-black tracking-tighter text-white uppercase group-hover:text-brand-gold transition-colors duration-300">
                Willwi
              </span>
              <span className="text-[9px] tracking-[0.4em] text-brand-gold font-black opacity-80 pt-1">
                1205
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-12">
              <Link to="/database" className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:text-brand-gold ${location.pathname === '/database' ? 'text-brand-gold' : 'text-white'}`}>作品庫</Link>
              <Link to="/interactive" className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:text-brand-gold ${location.pathname === '/interactive' ? 'text-brand-gold' : 'text-white'}`}>錄製室</Link>
              <Link to="/about" className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:text-brand-gold ${location.pathname === '/about' ? 'text-brand-gold' : 'text-white'}`}>關於</Link>
              <Link to="/admin" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all">控制台</Link>
              
              <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
              
              <button 
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
                className="text-[9px] font-black uppercase tracking-widest text-brand-gold border border-brand-gold/30 px-3 py-1.5 hover:bg-brand-gold hover:text-black transition-all duration-300"
              >
                {lang === 'zh' ? 'ENG' : '中文'}
              </button>
            </div>
          </div>
        </nav>

        <main className="pb-24">{children}</main>

        <footer className="py-24 px-10 border-t border-white/5 text-center bg-[#020617] mb-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-wrap justify-center items-center gap-12 md:gap-16 mb-16">
                {/* Spotify */}
                <a href="https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4" target="_blank" rel="noreferrer" className="group opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-110" aria-label="Spotify">
                    <svg className="w-6 h-6 text-white group-hover:text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                </a>
                
                {/* Apple Music */}
                <a href="https://music.apple.com/us/artist/willwi/1798471457" target="_blank" rel="noreferrer" className="group opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-110" aria-label="Apple Music">
                    <svg className="w-6 h-6 text-white group-hover:text-[#FA243C]" viewBox="0 0 24 24" fill="currentColor"><path d="M22.256 9.471c.882 3.033-1.605 5.922-3.896 5.584-3.567-.532-3.141-5.748.182-6.666 1.487-.411 3.25.109 3.714 1.082zm-9.98 4.793c1.996-2.583 2.502-6.526-.81-7.85-3.376-1.35-6.636 2.454-4.225 6.784 1.246 2.238 3.528 2.923 5.035 1.066zm8.851 5.679c-2.321 4.958-9.455 5.592-13.627 2.066-4.524-3.824-2.85-11.758 2.651-13.344 5.955-1.719 10.601 2.373 12.396 6.824.582 1.442.22 3.298-1.42 4.454zm-14.755-7.81c.216-4.135 4.312-6.551 7.42-4.996 3.109 1.554 3.791 6.221.725 8.783-3.035 2.535-7.957.575-8.145-3.787z"/></svg>
                </a>

                {/* YouTube */}
                <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="group opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-110" aria-label="YouTube">
                    <svg className="w-7 h-7 text-white group-hover:text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>

                {/* TIDAL */}
                <a href="https://tidal.com/artist/54856609" target="_blank" rel="noreferrer" className="group opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-110" aria-label="TIDAL">
                    <svg className="w-6 h-6 text-white group-hover:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 8.036l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571-3.572l-3.572-3.571-3.571 3.571 3.571 3.571 3.572-3.571zm7.143 3.572l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm-3.571 3.571l-3.571-3.571-3.572 3.571 3.572 3.571 3.571-3.571zm3.571 3.571l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571zm7.143 0l-3.571-3.571-3.571 3.571 3.571 3.571 3.571-3.571z"/></svg>
                </a>

                {/* Musixmatch Verified */}
                <a href="https://www.musixmatch.com/artist/Willwi-1798471457" target="_blank" rel="noreferrer" className="group opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-110" aria-label="Musixmatch Verified">
                    <svg className="w-6 h-6 text-white group-hover:text-[#FF6050]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14H15v-4.5l-2.5 4.5-2.5-4.5v4.5H8.5V8h2l1.5 2.7L13.5 8h2v8z"/></svg>
                </a>
            </div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.5em] mb-2">Willwi Official Music Database</p>
            <p className="text-[8px] text-slate-700 font-mono uppercase tracking-[0.2em]">© 2025 ALL RIGHTS RESERVED.</p>
        </footer>

        <GlobalPlayer />
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
