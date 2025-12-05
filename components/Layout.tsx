import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, lang, setLang } = useTranslation();

  // Check if we are on home page for transparent nav
  const isHome = location.pathname === '/';

  const isActive = (path: string) => location.pathname === path 
    ? "text-brand-accent font-bold" 
    : "text-slate-400 hover:text-white transition-colors font-medium";

  const mobileLinkClass = (path: string) => `block px-3 py-2 rounded-md text-base font-medium ${location.pathname === path ? 'bg-slate-800 text-brand-accent' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`;

  const toggleLang = () => {
    setLang(lang === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-darker text-slate-100 font-sans selection:bg-brand-accent selection:text-brand-darker">
      <nav className={`sticky top-0 z-50 border-b transition-colors duration-300 ${isHome ? 'bg-brand-darker/80 border-white/5 backdrop-blur-md' : 'bg-brand-darker/95 border-slate-800 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-black tracking-[0.2em] text-white uppercase hover:text-brand-accent transition-colors flex items-center gap-2">
                Willwi <span className="text-brand-accent text-[0.6em] border border-brand-accent px-1 rounded tracking-normal font-bold">DB</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link to="/" className={isActive('/')}>{t('nav_home')}</Link>
                <Link to="/database" className={isActive('/database')}>{t('nav_catalog')}</Link>
                <Link to="/interactive" className={`${location.pathname === '/interactive' ? 'text-brand-gold font-bold' : 'text-slate-400 hover:text-brand-gold transition-colors font-medium'}`}>
                  {t('nav_interactive')}
                </Link>
                <Link to="/add" className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-brand-accent hover:text-brand-darker hover:border-brand-accent transition-all text-sm font-bold tracking-wide">
                  + {t('nav_add')}
                </Link>
              </div>

              {/* Language Switcher */}
              <button 
                onClick={toggleLang} 
                className="ml-8 px-3 py-1 rounded border border-slate-600 text-xs font-bold text-slate-400 hover:text-white hover:border-white transition-all uppercase"
              >
                {lang === 'en' ? '中文' : 'EN'}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="-mr-2 flex md:hidden items-center gap-4">
              <button 
                  onClick={toggleLang} 
                  className="px-2 py-1 rounded border border-slate-600 text-xs font-bold text-slate-400 hover:text-white hover:border-white transition-all uppercase"
              >
                  {lang === 'en' ? '中文' : 'EN'}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
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

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
          <div className="md:hidden bg-brand-darker border-b border-slate-800" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/')}>{t('nav_home')}</Link>
              <Link to="/database" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/database')}>{t('nav_catalog')}</Link>
              <Link to="/interactive" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/interactive')}>{t('nav_interactive')}</Link>
              <Link to="/add" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-bold text-brand-darker bg-brand-accent mt-4 text-center">
                + {t('nav_add')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {/* Full bleed for Home, standard container for others */}
        <div className={isHome ? '' : "max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"}>
          {children}
        </div>
      </main>

      <footer className="bg-brand-darker border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          
          <div className="flex flex-col gap-3">
            <div className="text-slate-500 text-xs tracking-[0.2em] uppercase font-bold">
              © {new Date().getFullYear()} {t('footer_rights')}
            </div>
            <a href="mailto:will@willwi.com" className="text-slate-400 hover:text-brand-accent text-sm font-mono transition-colors flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
               will@willwi.com
            </a>
          </div>

          <div className="flex flex-col items-start md:items-end gap-5 w-full md:w-auto">
              
              {/* Socials Group */}
              <div className="flex flex-wrap gap-4 text-xs tracking-widest uppercase font-semibold text-slate-400">
                  <a href="https://www.facebook.com/Willwi888" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors flex items-center gap-1">
                    <span>Facebook</span>
                  </a>
                  <a href="https://www.instagram.com/willwi888" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors flex items-center gap-1">
                    <span>Instagram</span>
                  </a>
                  <a href="https://x.com/Willwi888" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors flex items-center gap-1">
                    <span>X (Twitter)</span>
                  </a>
              </div>

              {/* Music Platforms & DB Group */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 justify-start md:justify-end text-xs tracking-widest uppercase font-semibold text-slate-500 border-t border-slate-800 pt-4 md:border-none md:pt-0">
                <a href="https://music.amazon.com/artists/B0DYFC8CTG/willwi" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">Amazon Music</a>
                <a href="https://music.apple.com/us/artist/willwi/1798471457" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">Apple Music</a>
                <a href="https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">Spotify</a>
                <a href="https://tidal.com/artist/54856609" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">TIDAL</a>
                <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">YouTube</a>
                <span className="hidden md:inline text-slate-700">|</span>
                <a href="https://musicbrainz.org/artist/526cc0f8-da20-4d2d-86a5-4bf841a6ba3c" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">MusicBrainz</a>
                <a href="https://www.musixmatch.com/artist/Willwi" target="_blank" rel="noreferrer" className="hover:text-brand-accent transition-colors">Musixmatch</a>
                <Link to="/admin" className="hover:text-white transition-colors text-slate-700">Admin</Link>
              </div>
          </div>
        </div>
        <div className="bg-black py-2 text-center">
            <p className="text-[10px] text-slate-800 font-mono tracking-widest uppercase">Powered by Willwi & Gemini</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;