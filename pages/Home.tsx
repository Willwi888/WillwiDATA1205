
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useData, ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();
  const navigate = useNavigate();

  const featuredSongs = songs.filter(s => s.isEditorPick).slice(0, 3);
  const interactiveSongs = songs.filter(s => s.isInteractiveActive).slice(0, 2);

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* HERO SECTION - PUBLIC FOCUS */}
      <section className="relative w-full h-[90vh] flex flex-col items-start justify-center px-6 md:px-20 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-[position:right_center] md:bg-right transition-transform duration-[20s] scale-110 animate-slow-zoom"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})` }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-4xl w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-[1px] bg-brand-gold"></span>
                <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em]">{t('hero_verified')}</span>
            </div>
            
            <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter uppercase leading-[0.85] text-white mb-8 text-gold-glow drop-shadow-2xl">
              WILLWI<br/>STUDIO
            </h1>
            
            <p className="text-slate-300 text-xs md:text-sm tracking-[0.3em] uppercase mb-12 font-light max-w-xl leading-loose opacity-80 whitespace-pre-line border-l border-brand-gold/30 pl-6">
                {t('hero_desc_long')}
            </p>

            <div className="flex flex-wrap gap-4">
                <Link to="/database" className="px-10 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand-gold transition-all shadow-xl">
                    瀏覽作品庫
                </Link>
                <Link to="/interactive" className="px-10 py-4 border border-white/20 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all backdrop-blur-md">
                    互動創作實驗室
                </Link>
            </div>
        </div>
        
        {/* BOTTOM STATS / SCROLL HINT */}
        <div className="absolute bottom-10 left-6 md:left-20 z-10 flex items-center gap-10">
            <div className="text-left">
                <div className="text-2xl font-black text-white">{songs.length}+</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-widest">Released Works</div>
            </div>
            <div className="text-left border-l border-white/10 pl-10">
                <div className="text-2xl font-black text-white">{songs.filter(s => s.isInteractiveActive).length}</div>
                <div className="text-[8px] text-slate-500 uppercase tracking-widest">Interactive Ready</div>
            </div>
        </div>
      </section>

      {/* FEATURED WORKS - PUBLIC SHOWCASE */}
      <section className="py-32 px-6 md:px-20 bg-slate-950">
          <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-16">
                  <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-white">精選作品</h2>
                      <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mt-2 font-bold">Featured Catalog</p>
                  </div>
                  <Link to="/database" className="text-[10px] text-brand-gold font-bold uppercase tracking-widest hover:underline transition-all underline-offset-8">VIEW ALL CATALOG →</Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {featuredSongs.map(song => (
                      <div key={song.id} className="group cursor-pointer" onClick={() => navigate(`/song/${song.id}`)}>
                          <div className="aspect-square relative overflow-hidden mb-6 shadow-2xl">
                              <img src={song.coverUrl} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" alt="" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="px-6 py-2 border border-white text-white text-[9px] font-black uppercase tracking-widest">瞭解更多</span>
                              </div>
                              {song.language === '日語' && <div className="absolute top-4 left-4 bg-brand-accent text-slate-950 px-2 py-0.5 text-[8px] font-black uppercase">J-Pop</div>}
                          </div>
                          <h3 className="text-xl font-black text-white uppercase truncate">{song.title}</h3>
                          <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-2">{song.releaseDate} • {song.language}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* CALL TO INTERACTION */}
      <section className="py-40 px-6 md:px-20 relative overflow-hidden bg-black">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-gold/5 blur-[120px] rounded-full translate-x-1/2"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-8 leading-none italic">
                CREATE WITH<br/><span className="text-brand-gold">WILLWI</span>
              </h2>
              <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.4em] mb-12 leading-relaxed max-w-2xl mx-auto">
                不僅僅是聽音樂。進入實驗室，將您感興趣的曲目轉化為獨特的視覺體驗。
              </p>
              <button onClick={() => navigate('/interactive')} className="px-16 py-6 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_50px_rgba(251,191,36,0.3)]">
                進入製作室
              </button>
          </div>
      </section>
    </div>
  );
};

export default Home;
