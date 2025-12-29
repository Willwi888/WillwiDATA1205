
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
        {/* Background Image */}
        <div className="absolute inset-0 bg-cover bg-[position:right_center] md:bg-right"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})` }}></div>
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-7xl w-full text-left flex flex-col items-start animate-fade-in-up">
            <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em] mb-8 block border border-brand-gold/40 px-6 py-2 rounded-sm backdrop-blur-md bg-black/20">
                {t('hero_verified')}
            </span>
            
            <h1 className="text-[10vw] md:text-[7.5rem] font-black tracking-tighter uppercase leading-[0.85] text-white mb-8 text-gold-glow max-w-4xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              {t('hero_title').split(' ').map((word: string, i: number) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
            </h1>
            
            <p className="text-slate-300 text-xs md:text-sm tracking-[0.4em] uppercase mb-20 font-light max-w-xl leading-relaxed opacity-80 border-l-2 border-brand-gold/60 pl-8 whitespace-pre-line">
                {t('hero_desc_long')}
            </p>

            {/* PAYMENT COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/20 w-full max-w-5xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                {/* COLUMN 1: INTERACTIVE */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/60 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-brand-gold font-black text-[11px] uppercase tracking-[0.4em] mb-4">{t('home_col_resonance_title')}</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-8">{t('home_col_resonance_desc')}</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">{t('home_col_resonance_price')}</div>
                    <ul className="text-[9px] text-slate-400 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> {t('home_col_resonance_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> {t('home_col_resonance_li2')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> {t('home_col_resonance_li3')}</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-brand-gold transition-all">
                        {t('home_btn_enter')}
                    </button>
                </div>

                {/* COLUMN 2: CLOUD CINEMA */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/80 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden border-x border-white/10">
                    <div className="absolute top-0 right-0 bg-brand-accent text-slate-900 text-[9px] font-black px-4 py-1.5 uppercase tracking-widest">{t('home_tag_premium')}</div>
                    <h3 className="text-brand-accent font-black text-[11px] uppercase tracking-[0.4em] mb-4">{t('home_col_cinema_title')}</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-8">{t('home_col_cinema_desc')}</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">{t('home_col_cinema_price')}</div>
                    <ul className="text-[9px] text-slate-300 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> {t('home_col_cinema_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> {t('home_col_cinema_li2')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> {t('home_col_cinema_li3')}</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 bg-brand-accent text-black font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-white transition-all">
                        {t('home_btn_details')}
                    </button>
                </div>

                {/* COLUMN 3: PURE SUPPORT */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/40 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-white font-black text-[11px] uppercase tracking-[0.4em] mb-4">{t('home_col_support_title')}</h3>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-8">{t('home_col_support_desc')}</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">{t('home_col_support_price')}</div>
                    <ul className="text-[9px] text-slate-500 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> {t('home_col_support_li1')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> {t('home_col_support_li2')}</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> {t('home_col_support_li3')}</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 border border-white/30 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-white group-hover:text-black transition-all">
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
