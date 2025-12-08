import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getLanguageColor } from '../types';
import { useTranslation } from '../context/LanguageContext';

const Home: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  // Find Editor's pick or fallback to first song
  const featured = songs.find(s => s.isEditorPick) || songs[0];

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent link navigation if inside a link
      e.stopPropagation();
      
      if (!audioRef.current) return;

      if (isPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
      setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-full justify-center relative">
      
      {/* --- FIXED BELOVED EVENT WIDGET (Left Side) --- */}
      {/* Adjusted: Larger, vertical-rl text mode (standard vertical), moved slightly inward visually via padding/shadow */}
      <Link 
        to="/interactive"
        className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-l-0 border-brand-gold py-10 pl-2 pr-4 rounded-r-2xl shadow-[0_0_25px_rgba(251,191,36,0.3)] hover:pl-4 hover:pr-6 transition-all duration-300 group hidden md:block"
      >
          <div className="flex flex-col items-center justify-center gap-4 h-full">
               <div className="w-1.5 h-16 bg-gradient-to-b from-brand-gold to-yellow-600 rounded-full animate-pulse shadow-[0_0_10px_#fbbf24]"></div>
               <div className="[writing-mode:vertical-rl] flex items-center gap-4 tracking-[0.2em]">
                   <span className="text-white text-[10px] uppercase font-medium opacity-80 group-hover:text-brand-gold transition-colors">
                       Vote Ends Feb 28
                   </span>
                   <span className="text-brand-gold font-black uppercase text-sm md:text-base whitespace-nowrap drop-shadow-md">
                       Beloved Event
                   </span>
               </div>
               <div className="w-1.5 h-16 bg-gradient-to-t from-brand-gold to-yellow-600 rounded-full animate-pulse shadow-[0_0_10px_#fbbf24]"></div>
          </div>
      </Link>

      {/* 1. Hero Section - Editorial Style */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center lg:justify-start min-h-[85vh] px-6 md:px-12 lg:px-20">
        
        {/* Content (Text) */}
        <div className="relative z-10 w-full lg:w-2/3 max-w-4xl flex flex-col pt-12 lg:pt-0">
            
            {/* Decorative Line & Label */}
            <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
                 <div className="h-px w-12 bg-brand-accent"></div>
                 <span className="text-brand-accent font-bold text-xs tracking-[0.3em] uppercase">The Official Archive</span>
            </div>

            <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase mb-6 leading-[0.9] drop-shadow-2xl animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Willwi
            </h1>
            
            <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] text-slate-200 mb-8 uppercase animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              {t('hero_title')}
            </h2>
            
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-12 font-light max-w-lg border-l border-brand-accent/50 pl-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
               Reborn on Feb 25th.<br/>
               Simply to leave a record of existence.<br/>
               <span className="text-slate-500 text-xs mt-2 block">Est. 1995 • Taipei / Sydney</span>
            </p>

            {/* Premium Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 mb-16 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              <Link 
                  to="/database" 
                  className="group relative px-8 py-4 overflow-hidden border border-white/20 hover:border-brand-accent transition-colors duration-300"
              >
                 <div className="absolute inset-0 w-0 bg-brand-accent transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                 <div className="relative flex items-center gap-3">
                    <span className="text-white font-bold uppercase tracking-[0.2em] text-sm group-hover:text-brand-accent transition-colors">{t('hero_btn_db')}</span>
                    <svg className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                 </div>
              </Link>
              
              <Link 
                  to="/interactive" 
                  className="group relative px-8 py-4 overflow-hidden border border-white/20 hover:border-white transition-colors duration-300 backdrop-blur-sm"
              >
                  <div className="absolute inset-0 w-0 bg-white transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                  <span className="relative text-slate-300 font-medium uppercase tracking-[0.2em] text-sm group-hover:text-white transition-colors">{t('hero_btn_interactive')}</span>
              </Link>
            </div>

            {/* Classy Mini Audio Player - Removed opacity-0 to guarantee visibility */}
            {featured && (
              <div className="relative animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center gap-6 max-w-md shadow-2xl hover:border-brand-accent/30 transition-colors group">
                    
                    {/* Vinyl Cover Art */}
                    <div className={`relative w-20 h-20 rounded-full overflow-hidden border-4 border-slate-950 shadow-xl flex-shrink-0 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                        <img src={featured.coverUrl} className="w-full h-full object-cover" alt="Cover" />
                        <div className="absolute inset-0 bg-black/10 rounded-full"></div>
                        <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-slate-900 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-white/20"></div>
                    </div>

                    {/* Controls & Info */}
                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-2">
                            <div className="overflow-hidden">
                                <div className="text-[10px] text-brand-accent uppercase tracking-widest font-bold mb-1">Featured Track</div>
                                <h3 className="text-white font-bold text-lg truncate pr-2 group-hover:text-brand-accent transition-colors">{featured.title}</h3>
                            </div>
                            
                            {/* Play Button Logic */}
                            {featured.audioUrl ? (
                                <button 
                                    onClick={togglePlay}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg flex-shrink-0 ${isPlaying ? 'bg-brand-accent text-slate-900' : 'bg-white text-black'}`}
                                >
                                    {isPlaying ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    ) : (
                                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    )}
                                </button>
                            ) : (
                                <Link to={`/song/${featured.id}`} className="text-xs text-slate-400 hover:text-white border border-slate-600 px-3 py-1 rounded-full whitespace-nowrap">
                                    View Details
                                </Link>
                            )}
                        </div>
                        
                        {/* Audio Element */}
                        {featured.audioUrl && (
                            <audio 
                                ref={audioRef} 
                                src={featured.audioUrl} 
                                onEnded={handleAudioEnded}
                                controlsList="nodownload"
                            />
                        )}

                        {/* Fake Progress Bar / Visualizer */}
                        <div className="flex items-center gap-1 mt-3 h-2 w-full">
                            {[...Array(16)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-1 bg-brand-accent/50 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                                    style={{ 
                                        height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '20%', 
                                        animationDelay: `${i * 0.05}s` 
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* 2. Brand / Mission Section - Refined dark layout */}
      <div className="relative bg-black/40 backdrop-blur-xl border-t border-white/5 py-24 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            
            {/* Left: Philosophy */}
            <div className="space-y-8">
               <h3 className="text-xs font-bold text-brand-accent tracking-[0.3em] uppercase mb-4">
                 Philosophy
               </h3>
               {/* REMOVED QUOTATION MARKS AROUND THE TEXT BELOW */}
               <h2 className="text-3xl md:text-4xl font-light text-white leading-tight">
                 {t('home_quote_main')}<br/> 
                 <span className="font-bold text-slate-200">{t('home_quote_sub')}</span>
               </h2>
               <div className="text-slate-400 text-sm leading-relaxed max-w-md font-light space-y-6">
                 <p>{t('home_purpose_text')}</p>
                 <p>{t('home_eco_text')}</p>
               </div>
               
               <div className="pt-8 flex gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent self-center"></div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">Verified Artist</span>
               </div>
            </div>

            {/* Right: Verification List */}
            <div className="bg-slate-950/50 border border-white/5 p-8 md:p-12 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent to-transparent"></div>
               <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-8">
                 Global Presence
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                 {(t('home_verified_items') as string[]).map((item, idx) => (
                   <div key={idx} className="flex items-center gap-3 text-slate-400 group">
                      <span className="w-1.5 h-1.5 bg-brand-gold rounded-full opacity-50 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(251,191,36,0.8)] transition-all"></span>
                      <span className="text-xs font-medium tracking-wide uppercase group-hover:text-white transition-colors">{item}</span>
                   </div>
                 ))}
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;