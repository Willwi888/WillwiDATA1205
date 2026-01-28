
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import ChatWidget from './ChatWidget';
import Snowfall from './Snowfall';

const DEFAULT_BG = "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2560";

// Define Toast Context for global notifications
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Export useToast hook for use in other components to fix missing member errors
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang, setLang } = useTranslation();
  const { isAdmin, logoutAdmin } = useUser();
  const [isSnowing, setIsSnowing] = useState(() => localStorage.getItem('willwi_snowing') === 'true');
  
  // Toast notification state and handler
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const [bgImage, setBgImage] = useState(DEFAULT_BG);
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = searchParams.get('embed') === 'true';

  useEffect(() => {
      const savedBg = localStorage.getItem('willwi_global_bg');
      if (savedBg && savedBg.trim() !== '') {
          setBgImage(savedBg);
      }
  }, [location.pathname]);

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
    ? "text-white font-bold tracking-widest relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-0.5 after:bg-brand-accent" 
    : "text-slate-400 hover:text-white transition-colors font-medium tracking-wide hover:tracking-widest transition-all duration-300";

  const mobileLinkClass = (path: string) => `block px-3 py-3 text-lg font-medium border-l-2 transition-all ${location.pathname === path ? 'border-brand-accent text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;

  const toggleLang = () => {
    setLang(lang === 'en' ? 'zh' : 'en');
  };

  const toggleSnow = () => {
    const newVal = !isSnowing;
    setIsSnowing(newVal);
    localStorage.setItem('willwi_snowing', String(newVal));
  };

  const handleExitAdmin = () => {
      logoutAdmin();
      navigate('/');
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className={`min-h-screen flex flex-col relative font-sans selection:bg-brand-accent selection:text-brand-darker text-slate-100 overflow-x-hidden ${isEmbed ? 'bg-transparent' : 'bg-slate-950'}`}>
        
        {isSnowing && <Snowfall />}

        {!isEmbed && (
          <div className="fixed inset-0 z-[-1] pointer-events-none h-full w-full bg-slate-950">
              <div 
                  className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-1000 transform scale-[1.02] bg-[position:right_center] md:bg-right"
                  style={{ backgroundImage: `url(${bgImage})` }}
              ></div>
              <div className={`absolute inset-0 transition-all duration-700 ${isHome ? 'bg-slate-950/5' : 'bg-slate-950/60 backdrop-blur-[2px]'}`}></div>
              <div className={`absolute inset-0 transition-opacity duration-1000 ${isHome ? 'opacity-10' : 'opacity-50'} bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.4)_100%)]`}></div>
              <div className={`absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent ${isHome ? 'opacity-50' : 'opacity-100'}`}></div>
          </div>
        )}

        <nav className={`fixed w-full top-0 z-50 transition-all duration-500 border-b ${scrolled || !isHome ? (isEmbed ? 'bg-slate-950/80' : 'bg-slate-950/60') + ' backdrop-blur-xl border-white/5 py-2' : 'bg-transparent border-transparent py-6'}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <Link to={isEmbed ? "/?embed=true" : "/"} className="group flex items-center gap-2">
                  <span className="text-2xl font-black tracking-[0.25em] text-white uppercase group-hover:text-brand-accent transition-colors duration-500 drop-shadow-lg">
                      Willwi
                  </span>
                  <span className="text-[0.4rem] px-1 py-0.5 border border-slate-500 text-slate-300 rounded group-hover:border-brand-accent group-hover:text-brand-accent transition-colors tracking-widest bg-black/20 backdrop-blur-md">
                      STUDIO
                  </span>
                </Link>
                {isAdmin && (
                    <span className="hidden sm:inline-block text-[9px] bg-brand-accent text-slate-950 px-2 py-0.5 font-black uppercase tracking-widest rounded shadow-lg animate-pulse">
                        Admin
                    </span>
                )}
              </div>

              <div className="hidden md:flex items-center">
                <div className="ml-10 flex items-center space-x-8 text-[11px] uppercase drop-shadow-md font-semibold">
                  <Link to={isEmbed ? "/?embed=true" : "/"} className={isActive('/')}>{t('nav_home')}</Link>
                  <Link to={isEmbed ? "/about?embed=true" : "/about"} className={isActive('/about')}>{t('nav_about')}</Link>
                  <Link to="/database" className={isActive('/database')}>{t('nav_catalog')}</Link>
                  <Link to={isEmbed ? "/interactive?embed=true" : "/interactive"} className={isActive('/interactive')}>{t('nav_interactive')}</Link>
                  <Link to="/streaming" className={isActive('/streaming')}>{t('nav_streaming')}</Link>
                  <Link to="/admin" className={isActive('/admin')}>{t('nav_admin')}</Link>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-4">
                  {isAdmin && (
                      <button 
                          onClick={handleExitAdmin}
                          className="text-[10px] font-bold text-red-500 border border-red-900/50 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded transition-all uppercase tracking-widest"
                      >
                          {t('nav_exit_admin')}
                      </button>
                  )}
                  <button 
                    onClick={toggleSnow}
                    title="Let it Snow"
                    className={`text-sm transition-all p-2 rounded-full border ${isSnowing ? 'bg-white text-brand-darker border-white' : 'text-slate-400 border-slate-600 hover:border-white hover:text-white'}`}
                  >
                    ❄️
                  </button>
                  <button 
                    onClick={toggleLang}
                    className="text-xs font-bold text-slate-400 hover:text-white border border-slate-600 hover:border-white px-2 py-1 rounded transition-all uppercase tracking-wider"
                  >
                    {lang === 'en' ? '中文' : 'EN'}
                  </button>
              </div>

              <div className="md:hidden flex items-center gap-4">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none"
                >
                  {!isMenuOpen ? (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 absolute w-full left-0 top-full shadow-2xl animate-fade-in-down">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/')}>{t('nav_home')}</Link>
                <Link to="/about" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/about')}>{t('nav_about')}</Link>
                <Link to="/database" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/database')}>{t('nav_catalog')}</Link>
                <Link to="/interactive" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/interactive')}>{t('nav_interactive')}</Link>
                <Link to="/streaming" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/streaming')}>{t('nav_streaming')}</Link>
                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/admin')}>{t('nav_admin')}</Link>
                {isAdmin && (
                    <button onClick={handleExitAdmin} className="w-full text-left px-3 py-3 text-lg font-medium text-red-500 border-l-2 border-transparent">{t('nav_exit_admin')}</button>
                )}
              </div>
            </div>
          )}
        </nav>

        <main className="flex-grow pt-20 z-10 relative">
          {children}
        </main>
        
        {/* Render active Toast notification if set */}
        {toast && (
          <div className={`fixed top-24 right-6 z-[100] px-6 py-4 rounded-sm shadow-2xl animate-fade-in-down font-black text-[10px] uppercase tracking-[0.2em] border backdrop-blur-xl ${
            toast.type === 'error' ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-rose-500/20' : 
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-500/20' : 
            'bg-slate-900/90 border-white/10 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              {toast.message}
            </div>
          </div>
        )}

        <ChatWidget />

        {!isEmbed && (
          <footer className="bg-slate-950 border-t border-slate-800/50 mt-auto relative z-10">
              <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
                  <div className="text-center">
                      <p className="text-slate-500 text-xs tracking-widest uppercase">
                      &copy; {new Date().getFullYear()} {t('footer_rights')}
                      </p>
                  </div>
              </div>
          </footer>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
