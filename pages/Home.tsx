import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-80px)] relative bg-[#020617] flex flex-col items-center justify-center overflow-hidden py-20">
      
      {/* 1. BACKGROUND PORTRAIT - FULL COLOR & FULLY CENTERED */}
      <div 
          className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-1000 transform scale-100 z-0"
          style={{ 
              backgroundImage: `url(${ASSETS.willwiPortrait})`, 
              backgroundPosition: 'center center',
              backgroundSize: 'cover'
          }}
      ></div>
      
      {/* 2. CINEMATIC OVERLAYS */}
      {/* Dark overlay to make text pop */}
      <div className="absolute inset-0 bg-black/40 z-[1]"></div>
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.8)_100%)] z-[1]"></div>
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020617] to-transparent z-[1]"></div>

      {/* 3. CENTERED CONTENT AREA */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl w-full">
        
        {/* Label */}
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <div className="h-px w-8 bg-brand-accent"></div>
          <span className="text-brand-accent font-bold text-[10px] tracking-[0.4em] uppercase">Official Artist Archive</span>
          <div className="h-px w-8 bg-brand-accent"></div>
        </div>

        {/* Big Title with Golden Glow - Centered */}
        <h1 className="text-7xl md:text-[12rem] font-black tracking-tighter uppercase leading-none mb-12 text-gold-glow drop-shadow-2xl">
          Willwi
        </h1>

        {/* Polaroid Lyric Video Slot - CENTERED AND ENLARGED */}
        <div className="relative w-full max-w-xl group animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
           
           {/* Decorative Elements around the frame */}
           <div className="absolute -top-10 -left-10 w-20 h-20 border-t-2 border-l-2 border-brand-gold/30 rounded-tl-3xl group-hover:-top-12 group-hover:-left-12 transition-all duration-500"></div>
           <div className="absolute -bottom-10 -right-10 w-20 h-20 border-b-2 border-r-2 border-brand-gold/30 rounded-br-3xl group-hover:-bottom-12 group-hover:-right-12 transition-all duration-500"></div>

           {/* Polaroid Frame */}
           <div className="bg-white p-6 pb-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] transform rotate-1 group-hover:rotate-0 group-hover:scale-[1.02] transition-all duration-700 cursor-pointer">
               <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-white text-center p-8 border-b border-slate-200 relative overflow-hidden">
                   
                   {/* Mock Video UI Overlay */}
                   <div className="absolute top-4 left-4 flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                       <div className="text-[8px] font-mono tracking-widest text-white/50">REC ● 00:00:24:12</div>
                   </div>

                   <div className="z-10">
                       <div className="text-xl font-medium text-slate-400 mb-2 tracking-widest uppercase">Latest Production</div>
                       <div className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">歌詞影片</div>
                       
                       <div className="flex items-center justify-center gap-4">
                           <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                               <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                           </div>
                       </div>
                   </div>

                   {/* Background placeholder texture */}
                   <div className="absolute inset-0 opacity-20 pointer-events-none">
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.2)_0%,_transparent_70%)]"></div>
                   </div>
               </div>

               {/* Metadata at bottom - Handwritten look */}
               <div className="mt-6 flex justify-between items-center px-2">
                   <div className="font-mono text-slate-400 text-[10px] tracking-widest italic uppercase">
                       KODAK PORTRA 400 . 53
                   </div>
                   <div className="font-mono text-slate-900 text-[12px] font-bold tracking-tighter">
                       WILLWI MUSIC ARCHIVE 2024
                   </div>
               </div>
           </div>
        </div>

        {/* Philosophy snippet - Centered at bottom */}
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