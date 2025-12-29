
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();

  // 篩選出標記為「官網獨家」的作品
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
      {/* 標題區 */}
      <div className="mb-20 text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">
          {t('streaming_title')}
        </h2>
        <p className="text-slate-600 text-[10px] font-bold tracking-[1em] uppercase relative z-10">
          STAY HERE • LISTEN HERE • EXCLUSIVE VAULT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* 左側：官方獨家區塊 - 強調「僅限站內欣賞」 */}
        <div className="lg:col-span-7 space-y-12">
          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {t('streaming_youtube_title')}
                <span className="bg-brand-gold text-slate-950 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  VAULT ONLY
                </span>
              </h3>
              <p className="text-[10px] text-brand-gold/60 font-bold uppercase tracking-widest mt-2">
                此區內容受保護，僅供 Willwi 官方平台在線欣賞
              </p>
            </div>
          </div>

          {featuredVideo ? (
            <div className="space-y-6">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-gold animate-pulse rounded-full"></span>
                {featuredVideo.title} • 現在播放
              </div>
              
              {/* 沉浸式播放器容器 */}
              <div className="relative group bg-slate-900 border border-brand-gold/10 overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-700 hover:border-brand-gold/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&showinfo=0&modestbranding=1&iv_load_policy=3`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share" 
                    allowFullScreen
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  ></iframe>
                  
                  {/* 防下載/防分享視覺層 */}
                  <div className="absolute top-4 right-4 pointer-events-none opacity-40">
                     <span className="text-[10px] text-white font-black tracking-widest bg-black/50 px-3 py-1 rounded-full uppercase">Willwi Studio Exclusive</span>
                  </div>
                </div>
                
                <div className="p-10 bg-gradient-to-b from-slate-900 to-black">
                  <h4 className="text-3xl font-black text-white uppercase leading-tight mb-4 text-gold-glow">
                    {featuredVideo.title}
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xl font-light">
                    {featuredVideo.description || '這是為官網聽眾準備的獨家內容。我們致力於提供純粹的視聽空間，請在此安靜欣賞。'}
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="https://www.youtube.com/@Willwi888?sub_confirmation=1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-10 py-4 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-lg rounded-full"
                    >
                      {t('streaming_btn_subscribe')}
                    </a>
                    {/* 移除外部下載連結，改為內部資訊按鈕 */}
                    <button 
                      onClick={() => window.location.href = `#/song/${featuredVideo.id}`}
                      className="px-10 py-4 border border-brand-gold/30 text-brand-gold font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-gold hover:text-slate-950 transition-all rounded-full"
                    >
                      查看作品資訊
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-20 bg-white/5 border border-white/10 rounded-2xl text-center border-dashed">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">目前此保管庫暫無獨家內容</p>
            </div>
          )}

          {/* 其他獨家列表 */}
          {exclusiveVideos.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12 border-t border-white/5">
              {exclusiveVideos.slice(1).map((item) => (
                <div key={item.id} className="p-6 bg-slate-900/40 border border-white/5 rounded-xl flex flex-col h-full group hover:border-brand-gold/30 transition-all">
                  <div className="aspect-video bg-black mb-4 rounded-lg overflow-hidden relative">
                    <iframe 
                        width="100%" height="100%" 
                        src={`https://www.youtube.com/embed/${getEmbedId(item.youtubeUrl!)}?rel=0&modestbranding=1`} 
                        frameBorder="0" allowFullScreen 
                    />
                    <div className="absolute inset-0 pointer-events-none border border-brand-gold/10 rounded-lg"></div>
                  </div>
                  <h5 className="text-sm font-black text-white uppercase truncate mb-2">{item.title}</h5>
                  <p className="text-[10px] text-brand-gold/40 uppercase tracking-widest">Vault Protected Content</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側：Spotify 播放器 */}
        <div className="lg:col-span-5 space-y-12">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">{t('streaming_spotify_title')}</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">SPOTIFY ARTIST HUB</p>
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
              className="rounded-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;
