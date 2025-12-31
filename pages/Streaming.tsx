
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();

  // Logic to fetch exclusive videos from the official catalog
  const exclusiveVideos = songs.filter(s => s.isOfficialExclusive && s.youtubeUrl);
  const featuredVideo = exclusiveVideos.length > 0 ? exclusiveVideos[0] : null;
  const secondaryVideos = exclusiveVideos.slice(1);

  const getEmbedId = (url: string) => {
    try {
        const u = new URL(url.trim());
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        return null;
    } catch(e) { return null; }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      <div className="mb-20 text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">
          {t('streaming_title')}
        </h2>
        <p className="text-slate-600 text-[10px] font-bold tracking-[1em] uppercase relative z-10">
          OFFICIAL CHANNELS • STREAMING HUB
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: YouTube Vault (Prominent Section) */}
        <div className="lg:col-span-8 space-y-12">
          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {t('streaming_youtube_title')}
                <span className="bg-brand-gold text-slate-950 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">VAULT</span>
              </h3>
            </div>
          </div>

          {featuredVideo ? (
            <div className="space-y-10">
              {/* Featured Video Card */}
              <div className="relative group bg-slate-900 border border-brand-gold/10 overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 hover:border-brand-gold/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe 
                    width="100%" height="100%" 
                    src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&modestbranding=1`} 
                    title={featuredVideo.title}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  ></iframe>
                </div>
                
                <div className="p-8 bg-black/40 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                      <h4 className="text-2xl font-black text-white uppercase mb-2 group-hover:text-brand-gold transition-colors">{featuredVideo.title}</h4>
                      <p className="text-slate-400 text-sm font-light line-clamp-2 max-w-2xl">{featuredVideo.description}</p>
                    </div>
                    <div className="flex flex-col items-start md:items-end min-w-[120px]">
                      <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-1">OFFICIAL RELEASE</span>
                      <span className="text-xs font-mono text-slate-500">{featuredVideo.releaseDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Videos Grid */}
              {secondaryVideos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {secondaryVideos.map(video => (
                    <div key={video.id} className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden group hover:border-brand-gold/20 transition-all">
                      <div className="aspect-video bg-black relative">
                         <iframe 
                            width="100%" height="100%" 
                            src={`https://www.youtube.com/embed/${getEmbedId(video.youtubeUrl!)}?rel=0&modestbranding=1`} 
                            title={video.title}
                            frameBorder="0" allowFullScreen
                            className="opacity-80 group-hover:opacity-100 transition-opacity"
                         ></iframe>
                      </div>
                      <div className="p-4 bg-black/20">
                        <h5 className="text-white font-bold text-[10px] uppercase truncate tracking-widest">{video.title}</h5>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-24 bg-slate-900/20 border-2 border-slate-800/50 border-dashed rounded-3xl text-center flex flex-col items-center justify-center animate-pulse">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-xs text-slate-500 font-black uppercase tracking-[0.4em]">No exclusive vault content found.</p>
                <p className="text-[10px] text-slate-700 mt-2 uppercase tracking-widest">Subscribe to our channels for future exclusive drops.</p>
            </div>
          )}
        </div>

        {/* Right: Spotify Artist Hub (Responsive Container) */}
        <div className="lg:col-span-4 space-y-12">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">Spotify Hub</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">Verified Artist</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-3xl overflow-hidden shadow-2xl border border-white/5 p-4 group transition-all duration-700 hover:border-emerald-500/30">
            <div className="bg-black/80 p-2 rounded-2xl shadow-inner">
                <iframe 
                src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
                width="100%" 
                height="600" 
                frameBorder="0" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                className="rounded-xl transition-all duration-1000"
                ></iframe>
            </div>
            <div className="mt-4 px-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Live Session Stream</span>
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Willwi 陳威兒</span>
                </div>
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-150 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;
