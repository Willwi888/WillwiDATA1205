import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// Helper to extract YouTube ID
const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            videoId = urlParams.get('v') || '';
        } else if (url.includes('youtube.com/embed/')) {
             videoId = url.split('embed/')[1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : null;
    } catch(e) { return null; }
};

const Home: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  
  // 1. Load Homepage Configuration (from Admin) or Fallback
  const [homeConfig, setHomeConfig] = useState<any>(null);

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_home_player_config');
      if (savedConfig) {
          setHomeConfig(JSON.parse(savedConfig));
      }
  }, []);

  // Determine what to display
  // Priority: Admin Config -> Editor's Pick -> First Song
  const featuredTitle = homeConfig?.title || (songs.find(s => s.isEditorPick)?.title) || songs[0]?.title;
  const featuredCover = homeConfig?.coverUrl || (songs.find(s => s.isEditorPick)?.coverUrl) || songs[0]?.coverUrl;
  const featuredSubtitle = homeConfig?.subtitle || "Featured Track";
  
  // Audio & Video Logic
  const featuredAudio = homeConfig?.audioUrl || ""; 
  const featuredYoutube = homeConfig?.youtubeUrl || (songs.find(s => s.isEditorPick)?.youtubeUrl) || "";
  
  const youtubeEmbed = getYoutubeEmbedUrl(featuredYoutube);

  return (
    <div className="flex flex-col h-full justify-center relative">
      
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
              {/* Only Show Database button for Admins now */}
              {isAdmin && (
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
              )}
              
              <Link 
                  to="/interactive" 
                  className="group relative px-8 py-4 overflow-hidden bg-brand-accent/10 border border-brand-accent/50 hover:bg-brand-accent/20 transition-colors duration-300 backdrop-blur-sm"
              >
                  <div className="absolute inset-0 w-0 bg-white transition-all duration-[250ms] ease-out group-hover:w-full opacity-5"></div>
                  <span className="relative text-white font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                      {t('hero_btn_interactive')} <span>→</span>
                  </span>
              </Link>
            </div>

            {/* REAL PLAYER SECTION */}
            {featuredTitle && (
              <div className="relative animate-fade-in-up max-w-xl w-full" style={{animationDelay: '0.5s'}}>
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 md:p-6 shadow-2xl transition-all hover:border-slate-500">
                    
                    {/* OPTION A: YOUTUBE PLAYER (Priority) */}
                    {youtubeEmbed ? (
                        <div className="flex flex-col gap-4">
                             <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-black/50 shadow-lg border border-white/5 bg-black">
                                 <iframe 
                                    className="absolute inset-0 w-full h-full"
                                    src={youtubeEmbed} 
                                    title="YouTube video player" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                 ></iframe>
                             </div>
                             <div className="flex items-center justify-between">
                                 <div>
                                    <h3 className="text-white font-bold text-lg leading-tight">{featuredTitle}</h3>
                                    <p className="text-brand-accent text-xs tracking-wider uppercase mt-1">Official Video / Audio</p>
                                 </div>
                                 <div className="hidden sm:block text-slate-500 text-[10px] border border-slate-700 rounded px-2 py-1">
                                    YOUTUBE
                                 </div>
                             </div>
                        </div>
                    ) : (
                        /* OPTION B: AUDIO PLAYER (Fallback) */
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Cover */}
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden shadow-lg flex-shrink-0 group">
                                <img src={featuredCover} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                     <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                         <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                                     </div>
                                </div>
                            </div>

                            {/* Info & Native Audio */}
                            <div className="flex-grow w-full text-center sm:text-left">
                                <div className="mb-3">
                                    <h3 className="text-white font-bold text-xl leading-tight mb-1">{featuredTitle}</h3>
                                    <p className="text-slate-400 text-xs line-clamp-2">{featuredSubtitle}</p>
                                </div>
                                
                                {featuredAudio ? (
                                    <audio 
                                        controls 
                                        controlsList="nodownload" 
                                        className="w-full mix-blend-screen invert hue-rotate-180 contrast-125 h-8 opacity-80 hover:opacity-100 transition-opacity" 
                                    >
                                        <source src={featuredAudio} type="audio/mpeg" />
                                        <source src={featuredAudio} type="audio/wav" />
                                        Your browser does not support the audio element.
                                    </audio>
                                ) : (
                                    <div className="text-xs text-slate-500 italic bg-slate-950/50 py-2 px-3 rounded border border-white/5">
                                        Audio setup required in Admin.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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