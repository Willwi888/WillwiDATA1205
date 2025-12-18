import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

interface HomeConfig {
    title: string;
    youtubeUrl: string;
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [homeConfig, setHomeConfig] = useState<HomeConfig | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('willwi_home_player_config');
    if (saved) {
        try { setHomeConfig(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {/* 1. ARTISTIC BACKGROUND */}
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 z-0"
           style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, backgroundSize: 'cover' }}></div>
      <div className="absolute inset-0 bg-slate-950/40 z-[1]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.95)_100%)] z-[1]"></div>

      {/* 2. MAIN CONTENT - GALLERY STYLE */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-6xl w-full">
        
        <div className="flex items-center gap-6 mb-12 animate-fade-in">
          <div className="h-px w-12 bg-white/20"></div>
          <span className="text-white/60 font-black text-[10px] tracking-[0.8em] uppercase">Willwi Music Legacy</span>
          <div className="h-px w-12 bg-white/20"></div>
        </div>

        {/* HERO TITLES */}
        <div className="mb-24 space-y-4">
            <h1 className="text-8xl md:text-[14rem] font-black tracking-tighter uppercase leading-none text-white animate-fade-in-up">
              Willwi
            </h1>
            <div className="h-1 w-24 bg-brand-gold mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* PHILOSOPHY QUOTE - RE-DESIGNED (MINIMALIST) */}
        <div className="max-w-4xl mb-24 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-extralight text-white leading-tight tracking-tight opacity-90">
                    Music is more than melody.
                </h2>
                <h2 className="text-4xl md:text-6xl font-black text-brand-gold italic uppercase tracking-tighter">
                    It is the resonance of a soul.
                </h2>
            </div>
            
            <div className="mt-12 max-w-2xl mx-auto">
                <p className="text-slate-300 text-sm md:text-base font-light leading-relaxed tracking-widest italic opacity-60">
                    "{t('home_purpose_text')}"
                </p>
            </div>
        </div>

        {/* NAVIGATION ENTRY POINTS */}
        <div className="flex flex-col md:flex-row gap-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <Link to="/database" className="group relative px-12 py-5 bg-white text-slate-950 font-black text-[11px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all duration-500 overflow-hidden">
                <span className="relative z-10">{t('nav_catalog')}</span>
                <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-brand-gold transition-transform duration-500"></div>
            </Link>
            <Link to="/interactive" className="group relative px-12 py-5 border border-white/20 text-white font-black text-[11px] uppercase tracking-[0.4em] hover:border-brand-gold transition-all duration-500">
                <span className="group-hover:text-brand-gold transition-colors">{t('nav_interactive')}</span>
            </Link>
        </div>
      </div>

    </div>
  );
};

export default Home;