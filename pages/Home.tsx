
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigateToMode = (mode: string) => {
      navigate('/interactive', { state: { initialMode: mode } });
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 md:px-20 overflow-hidden py-24">
        {/* Background Image - 極致明亮處理 */}
        <div className="absolute inset-0 bg-cover bg-[position:right_center] md:bg-right opacity-100 transition-opacity duration-1000"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})` }}></div>
        
        {/* 極簡漸層 */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-transparent to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-7xl w-full text-left flex flex-col items-start animate-fade-in-up">
            {/* 標籤 */}
            <span className="text-brand-gold font-black text-[8px] md:text-[9px] uppercase tracking-[0.4em] mb-6 block border border-brand-gold/30 px-4 py-1.5 rounded-sm backdrop-blur-sm bg-black/10">
                {t('hero_verified')}
            </span>
            
            <div className="relative mb-10">
                {/* 僅顯示 WILLWI 並套用呼吸光暈 */}
                <h1 className="text-[12vw] md:text-[7rem] font-black tracking-tighter uppercase leading-[0.85] text-white select-none text-gold-glow">
                  WILLWI
                </h1>
                {/* 保留藍色小字 STUDIO */}
                <span className="inline-block mt-4 text-[10px] font-black tracking-[0.8em] text-brand-accent uppercase border-l-2 border-brand-accent pl-4 py-0.5 bg-black/10 backdrop-blur-sm">
                    STUDIO
                </span>
            </div>
            
            <p className="text-white text-[10px] md:text-xs tracking-[0.3em] uppercase mb-16 font-semibold max-w-xl leading-relaxed drop-shadow-md border-l border-brand-gold/40 pl-6 whitespace-pre-line bg-black/5 py-3">
                {t('hero_desc_long')}
            </p>

            {/* 功能卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/10 w-full max-w-5xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden rounded-sm">
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/40 p-10 flex flex-col items-start hover:bg-slate-900/60 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-brand-gold font-black text-[10px] uppercase tracking-[0.4em] mb-3">{t('home_col_resonance_title')}</h3>
                    <p className="text-slate-200 text-[9px] uppercase tracking-widest mb-6 leading-loose">{t('home_col_resonance_desc')}</p>
                    <div className="text-3xl font-black text-white mb-8 tracking-tighter">{t('home_col_resonance_price')}</div>
                    <ul className="text-[8px] text-slate-300 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> {t('home_col_resonance_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> {t('home_col_resonance_li2')}</li>
                    </ul>
                    <button className="mt-auto px-6 py-4 bg-white/10 text-white border border-white/20 font-black text-[9px] uppercase tracking-[0.3em] w-full group-hover:bg-brand-gold group-hover:text-black group-hover:border-brand-gold transition-all">
                        {t('home_btn_enter')}
                    </button>
                </div>

                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/60 p-10 flex flex-col items-start hover:bg-slate-900/60 transition-all cursor-pointer overflow-hidden border-x border-white/10">
                    <div className="absolute top-0 right-0 bg-brand-accent/80 text-slate-900 text-[8px] font-black px-4 py-1 uppercase tracking-widest">{t('home_tag_premium')}</div>
                    <h3 className="text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-3">{t('home_col_cinema_title')}</h3>
                    <p className="text-slate-100 text-[9px] uppercase tracking-widest mb-6 leading-loose">{t('home_col_cinema_desc')}</p>
                    <div className="text-3xl font-black text-white mb-8 tracking-tighter">{t('home_col_cinema_price')}</div>
                    <ul className="text-[8px] text-white space-y-3 mb-12 text-left w-full uppercase tracking-widest font-bold">
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-accent shadow-[0_0_12px_rgba(56,189,248,0.8)]"></span> {t('home_col_cinema_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-accent shadow-[0_0_12px_rgba(56,189,248,0.8)]"></span> {t('home_col_cinema_li2')}</li>
                    </ul>
                    <button className="mt-auto px-6 py-4 bg-brand-accent text-black font-black text-[9px] uppercase tracking-[0.3em] w-full hover:bg-white transition-all shadow-xl">
                        {t('home_btn_details')}
                    </button>
                </div>

                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/30 p-10 flex flex-col items-start hover:bg-slate-900/60 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] mb-3">{t('home_col_support_title')}</h3>
                    <p className="text-slate-300 text-[9px] uppercase tracking-widest mb-6 leading-loose">{t('home_col_support_desc')}</p>
                    <div className="text-3xl font-black text-white mb-8 tracking-tighter">{t('home_col_support_price')}</div>
                    <ul className="text-[8px] text-slate-400 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white"></span> {t('home_col_support_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white"></span> {t('home_col_support_li3')}</li>
                    </ul>
                    <button className="mt-auto px-6 py-4 border border-white/20 text-slate-300 font-black text-[9px] uppercase tracking-[0.3em] w-full group-hover:bg-white group-hover:text-black group-hover:border-white transition-all">
                        {t('home_btn_support')}
                    </button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
