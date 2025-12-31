
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();

  const exclusiveVideos = songs.filter(s => s.isOfficialExclusive && s.youtubeUrl);
  const featuredVideo = exclusiveVideos.length > 0 ? exclusiveVideos[0] : null;

  const getEmbedId = (url: string) => {
    try {
        const u = new URL(url);
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
        
        {/* Left: YouTube Vault */}
        <div className="lg:col-span-7 space-y-12">
          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {t('streaming_youtube_title')}
                <span className="bg-brand-gold text-slate-950 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">VAULT</span>
              </h3>
            </div>
          </div>

          {featuredVideo ? (
            <div className="space-y-6">
              <div className="relative group bg-slate-900 border border-brand-gold/10 overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 hover:border-brand-gold/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe 
                    width="100%" height="100%" 
                    src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&modestbranding=1`} 
                    title="YouTube video player" 
                    frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  ></iframe>
                </div>
                
                <div className="p-8 bg-black/40 backdrop-blur-md">
                  <h4 className="text-2xl font-black text-white uppercase mb-2">{featuredVideo.title}</h4>
                  <p className="text-slate-400 text-sm font-light line-clamp-2">{featuredVideo.description}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-20 bg-white/5 border border-white/10 rounded-2xl text-center border-dashed">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No exclusive vault content yet.</p>
            </div>
          )}
        </div>

        {/* Right: Spotify Artist Hub */}
        <div className="lg:col-span-5 space-y-12">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">Spotify Hub</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">Latest Releases</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-3xl overflow-hidden shadow-2xl border border-white/5 p-4 group transition-all duration-700 hover:border-emerald-500/30">
            <iframe 
              src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
              width="100%" 
              height="600" 
              frameBorder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              className="rounded-2xl transition-all duration-1000"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;
