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

  // Cinematic Noise Texture (Data URI)
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`;

  return (
    <div className="flex flex-col h-full justify-center relative">
      
      {/* 1. Hero Section - Editorial Style */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center lg:justify-start min-h-[90vh] px-6 md:px-12 lg:px-20 pt-10 lg:pt-0">
        
        {/* Content (Text) */}
        <div className="relative z-10 w-full lg:w-2/3 max-w-4xl flex flex-col pt-12 lg:pt-0">
            
            {/* Decorative Line & Label */}
            <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
                 <div className="h-px w-12 bg-brand-accent"></div>
                 <span className="text-brand-accent font-bold text-xs tracking-[0.3em] uppercase">Official Archive</span>
            </div>

            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase mb-10 leading-[0.9] drop-shadow-2xl animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Willwi
            </h1>
            
            {/* REMOVED: INTRODUCTION • INTERACTION... and PILL BUTTONS */}

            {/* REAL PLAYER SECTION */}
            {featuredTitle && (
              <div className="relative animate-fade-in-up max-w-xl w-full" style={{animationDelay: '0.5s'}}>
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[30px] p-1 shadow-2xl transition-all hover:border-white/20">
                     <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[30px]" style={{ backgroundImage: noiseTexture }}></div>
                    
                    {/* OPTION A: YOUTUBE PLAYER (Priority) */}
                    {youtubeEmbed ? (
                        <div className="flex flex-col">
                             <div className="relative w-full aspect-video rounded-[26px] overflow-hidden shadow-black/50 shadow-lg bg-black">
                                 <iframe 
                                    className="absolute inset-0 w-full h-full"
                                    src={youtubeEmbed} 
                                    title="YouTube video player" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                 ></iframe>
                             </div>
                             <div className="px-6 py-4 flex items-center justify-between">
                                 <div>
                                    <h3 className="text-white font-bold text-lg leading-tight tracking-wide">{featuredTitle}</h3>
                                    <p className="text-brand-accent/70 text-[10px] tracking-[0.2em] uppercase mt-1">Official Video</p>
                                 </div>
                             </div>
                        </div>
                    ) : (
                        /* OPTION B: AUDIO PLAYER (Fallback) */
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4">
                            {/* Cover */}
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-2xl flex-shrink-0 group border border-white/10">
                                <img src={featuredCover} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" alt="Cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                     <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                                         <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                     </div>
                                </div>
                            </div>

                            {/* Info & Native Audio */}
                            <div className="flex-grow w-full text-center sm:text-left pr-4">
                                <div className="mb-3">
                                    <h3 className="text-white font-bold text-xl leading-tight mb-1">{featuredTitle}</h3>
                                    <p className="text-slate-400 text-xs line-clamp-2">{featuredSubtitle}</p>
                                </div>
                                
                                {featuredAudio ? (
                                    <audio 
                                        controls 
                                        controlsList="nodownload" 
                                        className="w-full mix-blend-screen invert hue-rotate-180 contrast-125 h-8 opacity-60 hover:opacity-100 transition-opacity" 
                                    >
                                        <source src={featuredAudio} type="audio/mpeg" />
                                        <source src={featuredAudio} type="audio/wav" />
                                        Your browser does not support the audio element.
                                    </audio>
                                ) : (
                                    <div className="text-[10px] text-slate-600 italic">
                                        Audio setup required.
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
            <div className="bg-slate-950/50 border border-white/5 p-8 md:p-12 relative rounded-[30px] overflow-hidden">
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: noiseTexture }}></div>
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent/50 to-transparent"></div>
               <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-8 relative z-10">
                 Global Presence
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 relative z-10">
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