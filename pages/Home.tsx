import React, { useState, useEffect } from 'react';
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

  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
        let videoId = '';
        if (url.includes('v=')) {
            videoId = new URLSearchParams(new URL(url).search).get('v') || '';
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('/').pop()?.split('?')[0] || '';
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('/embed/').pop()?.split('?')[0] || '';
        } else if (url.includes('shorts/')) {
            videoId = url.split('/shorts/').pop()?.split('?')[0] || '';
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&controls=1&rel=0` : null;
    } catch (e) { return null; }
  };

  const videoEmbedUrl = getEmbedUrl(homeConfig?.youtubeUrl);

  return (
    <div className="min-h-[calc(100vh-80px)] relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden py-24">
      
      {/* 1. BACKGROUND PORTRAIT */}
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 z-0"
           style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, backgroundSize: 'cover' }}></div>
      
      {/* 2. CINEMATIC OVERLAYS */}
      <div className="absolute inset-0 bg-slate-950/40 z-[1]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.9)_100%)] z-[1]"></div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-[1]"></div>

      {/* 3. CENTERED CONTENT AREA */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-6xl w-full">
        
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <div className="h-px w-10 bg-brand-gold/50"></div>
          <span className="text-brand-gold font-black text-[10px] tracking-[0.5em] uppercase">Featured Selection</span>
          <div className="h-px w-10 bg-brand-gold/50"></div>
        </div>

        <h1 className="text-7xl md:text-[14rem] font-black tracking-tighter uppercase leading-none mb-16 text-gold-glow drop-shadow-2xl">
          Willwi
        </h1>

        {/* Cinematic Widescreen Player */}
        <div className="w-full group animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
           <div className="relative bg-black aspect-video shadow-[0_60px_100px_-20px_rgba(0,0,0,1)] border border-white/5 overflow-hidden">
               {videoEmbedUrl ? (
                   <iframe src={videoEmbedUrl} className="absolute inset-0 w-full h-full z-10" title="Featured" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
               ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-slate-900">
                       <div className="text-[10px] font-bold text-brand-accent tracking-[0.4em] uppercase mb-4">Latest Release</div>
                       <div className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">{homeConfig?.title || "未說出口的保重"}</div>
                       <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-white/50 animate-pulse">
                           <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                       </div>
                   </div>
               )}
               {/* Aesthetic Player Overlays */}
               <div className="absolute bottom-6 left-6 z-20 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                   <div className="text-[9px] font-mono text-white/60 uppercase tracking-widest">WILLWI ARCHIVE // SYSTEM: CONNECTED</div>
               </div>
           </div>
           
           <div className="mt-8 flex justify-between items-end px-2">
               <div className="text-left">
                   <div className="text-white font-black text-2xl uppercase tracking-tighter">{homeConfig?.title || "WILLWI MUSIC CATALOG"}</div>
                   <div className="text-slate-500 text-[10px] font-mono uppercase mt-1 tracking-widest">Archive Reference: {new Date().getFullYear()}</div>
               </div>
               <div className="text-right">
                   <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Format: 4K Masters / Official Stream</div>
               </div>
           </div>
        </div>

        <div className="mt-24 max-w-2xl animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <h2 className="text-2xl md:text-3xl font-light text-white leading-tight mb-6">
                 {t('home_quote_main')} <span className="font-bold text-brand-gold">{t('home_quote_sub')}</span>
            </h2>
            <div className="h-px w-24 bg-brand-gold/30 mx-auto mb-6"></div>
            <p className="text-slate-400 text-sm font-light leading-relaxed tracking-wide">
                {t('home_purpose_text')}
            </p>
        </div>
      </div>

    </div>
  );
};

export default Home;