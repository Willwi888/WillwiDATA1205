import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        try { 
            const parsed = JSON.parse(saved);
            if (parsed.youtubeUrl) setHomeConfig(parsed);
        } catch (e) {}
    }
  }, []);

  const videoUrl = homeConfig?.youtubeUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ";
  const embedUrl = videoUrl.includes('v=') 
    ? `https://www.youtube.com/embed/${new URLSearchParams(new URL(videoUrl).search).get('v')}?autoplay=0&mute=1&loop=1&controls=1` 
    : videoUrl.includes('embed/') ? videoUrl : `https://www.youtube.com/embed/${videoUrl.split('/').pop()}`;

  const features = [
    { title: "Introduction", desc: "Willwi 的音樂歷程與視覺風格。" },
    { title: "Participation", desc: "參與歌詞影片製作，共創視覺。" },
    { title: "Support", desc: "透過樂捐，支持獨立音樂的永續產出。" },
    { title: "Archival", desc: "完整的 MusicBrainz 數據歸檔。" }
  ];

  return (
    <div className="min-h-screen relative flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, filter: 'brightness(0.5)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        <div className="relative z-10 max-w-5xl w-full text-center animate-fade-in-up">
            <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em] mb-6 block border border-brand-gold/30 px-4 py-2 inline-block mx-auto rounded-full backdrop-blur-md">
                {t('common_verified')}
            </span>
            <h1 className="text-[15vw] md:text-[10rem] font-black tracking-tighter uppercase leading-none text-white mb-6 drop-shadow-2xl">
              Willwi
            </h1>
            <p className="text-white text-xs md:text-sm tracking-[0.6em] uppercase mb-16 font-light max-w-2xl mx-auto leading-loose opacity-80">
                OFFICIAL PLATFORM // PARTICIPATION & SUPPORT<br/>
                這不是串流平台。這是支持 Willwi 創作的互動基地。
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-6">
                <Link to="/database" className="px-16 py-5 bg-white text-slate-950 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-xl hover:-translate-y-1">
                    瀏覽作品庫
                </Link>
                <Link to="/interactive" className="px-16 py-5 border border-white/20 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-[0.4em] hover:border-brand-gold transition-all shadow-xl hover:-translate-y-1">
                    參與製作 (歌詞)
                </Link>
            </div>
        </div>
      </section>

      {/* LATEST RESULT */}
      <section className="w-full max-w-7xl px-6 py-32">
         <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-2">The Result / 製作成果</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Handcrafted by Willwi</p>
            </div>
         </div>

         <div className="w-full aspect-video bg-black border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative group">
             <iframe 
                className="w-full h-full transition-all duration-1000" 
                src={embedUrl} 
                title="Featured Work"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
             ></iframe>
             <div className="absolute inset-0 pointer-events-none border border-white/10"></div>
         </div>
      </section>

      {/* VISION PILLARS */}
      <section className="w-full py-40 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-24">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-6">Support & Create.</h2>
                  <p className="text-slate-400 text-sm font-light max-w-3xl mx-auto leading-loose tracking-widest">{t('home_purpose_text')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  {features.map((f, i) => (
                      <div key={f.title} className="p-10 bg-slate-900/40 border border-white/5 hover:border-brand-gold/30 transition-all group">
                          <span className="text-brand-gold font-mono text-xs block mb-8 opacity-50 group-hover:opacity-100">0{i+1}</span>
                          <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{f.title}</h4>
                          <p className="text-slate-500 text-[11px] leading-relaxed uppercase tracking-widest">{f.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

    </div>
  );
};

export default Home;