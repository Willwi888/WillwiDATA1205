import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col lg:flex-row relative bg-[#020617] overflow-hidden">
      
      {/* LEFT CONTENT AREA */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-10 lg:p-24 z-10 relative">
        
        {/* Label */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px w-12 bg-brand-accent"></div>
          <span className="text-brand-accent font-bold text-xs tracking-[0.3em] uppercase">Official Archive</span>
        </div>

        {/* Big Title with Golden Glow */}
        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter uppercase leading-[0.8] mb-12 text-gold-glow">
          Willwi
        </h1>

        {/* Polaroid Lyric Video Slot */}
        <div className="relative w-full max-w-sm mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
           <div className="bg-white p-4 pb-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transform -rotate-2 hover:rotate-0 transition-transform duration-700">
               <div className="aspect-square bg-slate-100 flex flex-col items-center justify-center text-slate-800 text-center p-8 border-b border-slate-200">
                   <div className="text-xl font-bold mb-4">這裡我會放完成的</div>
                   <div className="text-4xl font-black">歌詞影片</div>
                   <div className="mt-8 text-slate-300">
                       <svg className="w-16 h-16 mx-auto opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z" />
                       </svg>
                   </div>
               </div>
               <div className="mt-4 font-mono text-slate-400 text-[10px] text-center tracking-widest italic uppercase">
                   Kodak Portra 400 . 53
               </div>
           </div>
        </div>

        {/* Philosophy snippet */}
        <div className="mt-20 max-w-md">
            <h2 className="text-3xl font-light text-white leading-tight mb-4">
                 {t('home_quote_main')}<br/> 
                 <span className="font-bold text-slate-400">{t('home_quote_sub')}</span>
            </h2>
            <p className="text-slate-500 text-sm font-light leading-relaxed">
                {t('home_purpose_text')}
            </p>
        </div>
      </div>

      {/* RIGHT PORTRAIT AREA - PERSON FULLY CENTERED AND COLORIZED */}
      <div className="w-full lg:w-1/2 relative min-h-[600px] lg:min-h-0 flex items-center justify-center overflow-hidden">
          <div 
              className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-1000 transform scale-100"
              style={{ 
                  backgroundImage: `url(${ASSETS.willwiPortrait})`, 
                  backgroundPosition: 'center center',
                  backgroundSize: 'cover'
              }}
          ></div>
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-transparent to-transparent lg:block hidden"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent lg:hidden block"></div>
      </div>

    </div>
  );
};

export default Home;