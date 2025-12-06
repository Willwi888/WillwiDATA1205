import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

// Use Google Drive Thumbnail API for better reliability and performance
// sz=w2560 requests a high-res version suitable for backgrounds
const BG_IMAGE = "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2560";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang, setLang } = useTranslation();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if we are on home page
  const isHome = location.pathname === '/';

  const isActive = (path: string) => location.pathname === path 
    ? "text-white font-bold tracking-widest relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-0.5 after:bg-brand-accent" 
    : "text-slate-400 hover:text-white transition-colors font-medium tracking-wide hover:tracking-widest transition-all duration-300";

  const mobileLinkClass = (path: string) => `block px-3 py-3 text-lg font-medium border-l-2 transition-all ${location.pathname === path ? 'border-brand-accent text-white bg-white/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`;

  const toggleLang = () => {
    setLang(lang === 'en' ? 'zh' : 'en');
  };

  return (
    // REMOVED 'bg-slate-950' to allow the fixed background image to show through
    <div className="min-h-screen flex flex-col relative font-sans selection:bg-brand-accent selection:text-brand-darker text-slate-100 overflow-x-hidden">
      
      {/* --- CINEMATIC BACKGROUND SYSTEM (FIXED LAYER) --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none h-full w-full bg-slate-950">
        
        {/* 1. Base Image Layer */}
        <div 
            className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-1000 transform scale-[1.02]"
            style={{ 
                backgroundImage: `url(${BG_IMAGE})`,
                backgroundPosition: 'center 20%', // Focus on face
                backgroundSize: 'cover' 
            }}
        ></div>

        {/* 2. Dynamic Overlay Logic */}
        {/* 
            Home: Very Light overlay (10%) -> Photo visible.
            Others: Medium overlay (50%) -> Content readable but background clearly visible.
            REMOVED the heavy 90% mask.
        */}
        <div className={`absolute inset-0 transition-all duration-700 ${isHome ? 'bg-slate-950/10' : 'bg-slate-950/50 backdrop-blur-[2px]'}`}></div>

        {/* 3. Cinematic Vignette */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isHome ? 'opacity-30' : 'opacity-60'} bg-[radial-gradient(circle_at_center,_transparent_10%,_rgba(2,6,23,0.6)_120%)]`}></div>

        {/* 4. Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        {/* 5. Left Side Gradient - Only on Home */}
        {isHome && <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent"></div>}
      </div>

      {/* --- PREMIUM NAVBAR --- */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-500 border-b ${scrolled || !isHome ? 'bg-slate-950/60 backdrop-blur-xl border-white/5 py-2' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="group flex items-center gap-2">
                <span className="text-2xl font-black tracking-[0.25em] text-white uppercase group-hover:text-brand-accent transition-colors duration-500 drop-shadow-lg">
                    Willwi
                </span>
                <span className="text-[0.5rem] px-1.5 py-0.5 border border-slate-500 text-slate-300 rounded group-hover:border-brand-accent group-hover:text-brand-accent transition-colors tracking-widest bg-black/20 backdrop-blur-md">
                    DB
                </span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center">
              <div className="ml-10 flex items-center space-x-10 text-sm uppercase drop-shadow-md font-semibold">
                <Link to="/" className={isActive('/')}>{t('nav_home')}</Link>
                <Link to="/database" className={isActive('/database')}>{t('nav_catalog')}</Link>
                <Link to="/interactive" className={isActive('/interactive')}>{t('nav_interactive')}</Link>
                
                <div className="h-4 w-px bg-slate-500/50 mx-2"></div>

                <Link to="/add" className="text-slate-300 hover:text-brand-accent transition-colors font-bold tracking-wider">
                  + {t('nav_add')}
                </Link>
              </div>

              {/* Language Switcher */}
              <button 
                onClick={toggleLang} 
                className="ml-8 px-3 py-1 rounded-full border border-slate-500 bg-black/20 text-[10px] font-bold text-slate-300 hover:text-white hover:border-white transition-all uppercase tracking-widest hover:bg-black/40 backdrop-blur-md"
              >
                {lang === 'en' ? '中文' : 'EN'}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="-mr-2 flex md:hidden items-center gap-4">
              <button 
                  onClick={toggleLang} 
                  className="px-2 py-1 rounded border border-slate-500 bg-black/20 text-[10px] font-bold text-slate-300 hover:text-white uppercase backdrop-blur-md"
              >
                  {lang === 'en' ? '中文' : 'EN'}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-200 hover:text-white hover:bg-white/10 focus:outline-none transition-colors drop-shadow-md"
              >
                <span className="sr-only">Open main menu</span>
                {!isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 absolute w-full left-0 top-full shadow-2xl animate-fade-in-down">
            <div className="px-4 pt-4 pb-6 space-y-2">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/')}>{t('nav_home')}</Link>
              <Link to="/database" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/database')}>{t('nav_catalog')}</Link>
              <Link to="/interactive" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/interactive')}>{t('nav_interactive')}</Link>
              <Link to="/add" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 mt-4 text-center rounded-sm bg-brand-accent text-slate-950 font-bold uppercase tracking-widest">
                + {t('nav_add')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Spacer to avoid navbar overlap if not home */}
      <main className={`flex-grow relative z-10 flex flex-col ${!isHome ? 'pt-24' : ''}`}>
        <div className={isHome ? 'flex-grow flex flex-col' : "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12"}>
          {children}
        </div>
      </main>

      {/* --- PREMIUM FOOTER --- */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto pt-16 pb-8 px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                {/* Brand Column */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="text-xl font-black tracking-[0.2em] text-white uppercase">Willwi</div>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-light">
                        A digital archive dedicated to preserving the musical journey. 
                        Every track, every lyric, every version documented for eternity.
                    </p>
                    <a href="mailto:will@willwi.com" className="inline-block text-slate-500 hover:text-brand-accent text-xs font-mono transition-colors border-b border-slate-800 hover:border-brand-accent pb-1">
                        will@willwi.com
                    </a>
                </div>

                {/* Socials */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-4">Connect</h4>
                    <div className="flex flex-col gap-2 text-xs text-slate-400 font-medium tracking-wide">
                        <a href="https://www.facebook.com/Willwi888" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 group">
                            <span className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-brand-accent transition-colors"></span> Facebook
                        </a>
                        <a href="https://www.instagram.com/willwi888" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 group">
                            <span className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-brand-accent transition-colors"></span> Instagram
                        </a>
                        <a href="https://www.threads.net/@willwi888" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 group">
                            <span className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-brand-accent transition-colors"></span> Threads
                        </a>
                        <a href="https://x.com/Willwi888" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 group">
                             <span className="w-1 h-1 bg-slate-600 rounded-full group-hover:bg-brand-accent transition-colors"></span> X (Twitter)
                        </a>
                    </div>
                </div>

                {/* Platforms */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-4">Listen</h4>
                     <div className="flex flex-col gap-2 text-xs text-slate-400 font-medium tracking-wide">
                        <a href="https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4" target="_blank" rel="noreferrer" className="hover:text-brand-green transition-colors">Spotify</a>
                        <a href="https://music.apple.com/us/artist/willwi/1798471457" target="_blank" rel="noreferrer" className="hover:text-pink-500 transition-colors">Apple Music</a>
                        <a href="https://music.youtube.com/channel/UCAF8vdEOJ5sBdRuZXL61ASw" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">YouTube Music</a>
                        <a href="https://music.amazon.com/artists/B0DYFC8CTG/willwi" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Amazon Music</a>
                        <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">YouTube</a>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                    © {new Date().getFullYear()} {t('footer_rights')}
                </div>
                <div className="flex items-center gap-6">
                    <a href="https://musicbrainz.org/artist/526cc0f8-da20-4d2d-86a5-4bf841a6ba3c" target="_blank" rel="noreferrer" className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors">MusicBrainz</a>
                    <Link to="/admin" className="text-[10px] text-slate-700 hover:text-slate-400 uppercase tracking-widest transition-colors">Manager Login</Link>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;