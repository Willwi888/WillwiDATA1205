
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();

  // 篩選出標記為「官網獨家」且有 YouTube 連結的作品
  const exclusiveVideos = songs.filter(s => s.isOfficialExclusive && s.youtubeUrl);
  
  // 取得最新的一部作為精選
  const featuredVideo = exclusiveVideos.length > 0 ? exclusiveVideos[0] : null;

  // 輔助函式：從 YouTube URL 取得 Embed ID
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
      {/* Page Header */}
      <div className="mb-20 text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">
          {t('streaming_title')}
        </h2>
        <p className="text-slate-600 text-[10px] font-bold tracking-[1em] uppercase relative z-10">
          {t('streaming_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT: YouTube Exclusive Zone */}
        <div className="lg:col-span-7 space-y-12">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {t('streaming_youtube_title')}
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest animate-pulse">
                  {t('streaming_youtube_exclusive')}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{t('streaming_youtube_desc')}</p>
            </div>
            <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/30">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </div>
          </div>

          {/* Dynamic Featured Video */}
          {featuredVideo ? (
            <div className="space-y-6">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                {featuredVideo.title} • Featured Exclusive
              </div>
              <div className="relative group bg-slate-900 border border-white/10 overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 hover:border-red-600/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&showinfo=0&modestbranding=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share" 
                    allowFullScreen
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  ></iframe>
                </div>
                
                <div className="p-10 bg-gradient-to-b from-slate-900 to-black">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h4 className="text-2xl font-black text-white uppercase leading-tight group-hover:text-red-500 transition-colors">
                      {featuredVideo.title}
                    </h4>
                    {featuredVideo.cloudVideoUrl && (
                      <a 
                        href={featuredVideo.cloudVideoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex-shrink-0 bg-white/5 border border-white/10 p-3 rounded hover:bg-white/10 transition-all text-brand-gold"
                        title="Open HQ Cloud Video"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xl font-light">
                    {featuredVideo.description || '這是 Willwi 為官網聽眾準備的獨家視聽內容。直接在此觀看完整作品。'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="https://www.youtube.com/@Willwi888?sub_confirmation=1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-10 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all shadow-lg rounded-full"
                    >
                      {t('streaming_btn_subscribe')}
                    </a>
                    {featuredVideo.cloudVideoUrl && (
                      <a 
                        href={featuredVideo.cloudVideoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-10 py-4 border border-white/20 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all rounded-full"
                      >
                        CLOUD ACCESS
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-20 bg-white/5 border border-white/10 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">暫無標記為官網獨家的影片</p>
            </div>
          )}

          {/* Other Exclusive List */}
          {exclusiveVideos.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12 border-t border-white/5">
              {exclusiveVideos.slice(1).map((item) => (
                <div key={item.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col h-full group hover:border-red-600/30 transition-all">
                  <div className="aspect-video bg-black mb-4 rounded-lg overflow-hidden">
                    <iframe 
                        width="100%" height="100%" 
                        src={`https://www.youtube.com/embed/${getEmbedId(item.youtubeUrl!)}`} 
                        frameBorder="0" allowFullScreen 
                    />
                  </div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h5 className="text-sm font-black text-white uppercase truncate">{item.title}</h5>
                    {item.cloudVideoUrl && (
                      <a href={item.cloudVideoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-gold">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-auto">{item.releaseDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Spotify Audition Hub */}
        <div className="lg:col-span-5 space-y-12">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">{t('streaming_spotify_title')}</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">{t('streaming_spotify_desc')}</p>
            </div>
          </div>

          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-6 group transition-all duration-700 hover:border-emerald-500/40 relative">
            <iframe 
              src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
              width="100%" 
              height="700" 
              frameBorder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              className="rounded-2xl grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000"
            ></iframe>
          </div>
          
          <div className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Apple Music', link: 'https://music.apple.com/tw/artist/willwi/1798471457', color: 'bg-white text-black' },
                { label: 'TIDAL', link: 'https://tidal.com/artist/54856609', color: 'bg-slate-800 text-white' },
              ].map((btn, i) => (
                <a key={i} href={btn.link} target="_blank" rel="noreferrer" className={`block w-full py-5 text-center font-black text-[10px] uppercase tracking-[0.5em] transition-all rounded-sm ${btn.color} hover:invert transition-all`}>
                  {btn.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 pt-20 border-t border-white/5 text-center max-w-2xl mx-auto">
        <p className="text-slate-500 text-xs italic font-light opacity-80 leading-relaxed">
          "創作不僅是聲音的排列，更是靈魂與世界的共鳴。感謝您在此停留與聆聽。"
        </p>
      </div>
    </div>
  );
};

export default Streaming;
