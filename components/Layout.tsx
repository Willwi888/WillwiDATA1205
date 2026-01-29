
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useData, resolveDirectLink } from '../context/DataContext';
import ChatWidget from './ChatWidget';
import CosmosParticles from './Snowfall';
import GlobalPlayer from './GlobalPlayer';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast error');
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang, setLang } = useTranslation();
  const { isAdmin } = useUser();
  const { globalSettings } = useData();
  
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleBgm = () => {
    if (!bgmRef.current) return;
    if (isBgmPlaying) {
      bgmRef.current.pause();
    } else {
      bgmRef.current.play().catch(() => showToast("點擊頁面以啟用音訊", "info"));
    }
    setIsBgmPlaying(!isBgmPlaying);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const isHome = location.pathname === '/';

  const isActive = (path: string) => location.pathname === path 
    ? "text-white font-medium tracking-[0.2em] relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-0.5 after:bg-brand-gold shadow-lg" 
    : "text-slate-500 hover:text-white transition-all font-medium tracking-wide hover:tracking-[0.2em]";

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen flex flex-col relative font-sans text-slate-100 overflow-x-hidden bg-transparent selection:bg-brand-gold selection:text-black">
        
        {/* 宇宙背景粒子系統 - 置於最底層 */}
        <CosmosParticles />

        <nav className={`fixed w-full top-0 z-50 transition-all duration-700 ${scrolled || !isHome ? 'bg-black/90 backdrop-blur-3xl border-b border-white/5 py-3' : 'bg-transparent py-8'}`}>
          <div className="max-w-7xl mx-auto px-10">
            <div className="flex items-center justify-between h-14">
              <Link to="/" className="group flex items-center gap-2">
                <span className="text-2xl font-black tracking-[0.3em] text-white uppercase group-hover:text-brand-gold transition-all">
                    Willwi
                </span>
                <span className="text-[0.4rem] px-1 py-0.5 border border-white/20 text-white/40 rounded tracking-widest group-hover:border-brand-gold group-hover:text-brand-gold">
                    STUDIO
                </span>
              </Link>

              <div className="hidden md:flex items-center space-x-12 text-[11px] uppercase font-light">
                <Link to="/" className={isActive('/')}>{t('nav_home')}</Link>
                <Link to="/about" className={isActive('/about')}>{t('nav_about')}</Link>
                <Link to="/database" className={isActive('/database')}>{t('nav_catalog')}</Link>
                <Link to="/interactive" className={isActive('/interactive')}>{t('nav_interactive')}</Link>
                <Link to="/streaming" className={isActive('/streaming')}>{t('nav_streaming')}</Link>
                <Link to="/admin" className={isActive('/admin')}>{t('nav_admin')}</Link>
              </div>

              <div className="hidden md:flex items-center gap-6">
                  {/* 極簡 BGM 開關 */}
                  <button 
                    onClick={toggleBgm}
                    className="flex items-center gap-3 group"
                  >
                    <div className="flex gap-1 items-end h-3">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-0.5 bg-brand-gold transition-all duration-500 ${isBgmPlaying ? 'animate-pulse' : 'h-1'}`}
                          style={{ height: isBgmPlaying ? `${Math.random() * 100}%` : '4px', animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest group-hover:text-white transition-colors">
                      {isBgmPlaying ? 'AMBIENT ON' : 'AMBIENT OFF'}
                    </span>
                  </button>

                  <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="text-[10px] font-medium text-slate-400 border border-white/10 px-3 py-1.5 hover:border-white hover:text-white transition-all">
                    {lang === 'en' ? 'CH' : 'EN'}
                  </button>
              </div>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden bg-black/95 backdrop-blur-2xl absolute w-full top-full py-10 px-10 flex flex-col gap-8 animate-fade-in text-[10px] tracking-widest uppercase border-t border-white/5">
                <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
                <Link to="/database" onClick={() => setIsMenuOpen(false)}>Catalog</Link>
                <Link to="/interactive" onClick={() => setIsMenuOpen(false)}>Studio</Link>
                <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Console</Link>
            </div>
          )}
        </nav>

        <main className="flex-grow z-10 relative">
          {children}
        </main>
        
        {toast && (
          <div className="fixed top-24 right-10 z-[100] px-8 py-4 bg-brand-gold text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl animate-fade-in-up">
            {toast.message}
          </div>
        )}

        <ChatWidget />
        <GlobalPlayer />
        
        {/* 背景音樂元素 - 從全域設定讀取 */}
        <audio 
          ref={bgmRef} 
          src={resolveDirectLink(globalSettings.bgmUrl || '')} 
          loop 
          crossOrigin="anonymous" 
        />
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
