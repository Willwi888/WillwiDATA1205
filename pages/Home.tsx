import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

interface HomeConfig {
    title: string;
    youtubeUrl: string;
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const handleNavigateToMode = (mode: string) => {
      navigate('/interactive', { state: { initialMode: mode } });
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden py-24">
        <div className="absolute inset-0 bg-cover bg-center"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, filter: 'brightness(0.5)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        <div className="relative z-10 max-w-6xl w-full text-center animate-fade-in-up">
            <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em] mb-6 block border border-brand-gold/30 px-4 py-2 inline-block mx-auto rounded-full backdrop-blur-md">
                {t('common_verified')}
            </span>
            <h1 className="text-[15vw] md:text-[10rem] font-black tracking-tighter uppercase leading-none text-white mb-6 text-gold-glow">
              {t('hero_title')}
            </h1>
            <p className="text-white text-xs md:text-sm tracking-[0.6em] uppercase mb-16 font-light max-w-2xl mx-auto leading-loose opacity-80">
                {t('hero_subtitle')}<br/>
                {t('hero_desc')}
            </p>

            {/* THREE PAYMENT COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
                
                {/* COLUMN 1: INTERACTIVE */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-slate-900/60 backdrop-blur-md border border-white/10 p-8 flex flex-col items-center hover:bg-slate-900/90 hover:border-brand-gold transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold/50 group-hover:bg-brand-gold transition-all"></div>
                    <h3 className="text-brand-gold font-black text-sm uppercase tracking-[0.3em] mb-4">{t('home_col_resonance_title')}</h3>
                    <p className="text-white text-[10px] uppercase tracking-widest mb-6 h-8">{t('home_col_resonance_desc')}</p>
                    <div className="text-3xl font-black text-white mb-6">{t('home_col_resonance_price')}</div>
                    <ul className="text-[9px] text-slate-400 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/10">
                        <li>{t('home_col_resonance_li1')}</li>
                        <li>{t('home_col_resonance_li2')}</li>
                        <li>{t('home_col_resonance_li3')}</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 bg-brand-gold text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-white transition-all">
                        {t('home_btn_enter')}
                    </button>
                </div>

                {/* COLUMN 2: CLOUD CINEMA */}
                <div onClick={() => handleNavigateToMode('cloud-cinema')} className="group relative bg-gradient-to-b from-slate-900/80 to-black/80 backdrop-blur-md border border-brand-accent/30 p-8 flex flex-col items-center hover:border-brand-accent transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
                    <div className="absolute top-0 right-0 bg-brand-accent text-slate-900 text-[9px] font-bold px-3 py-1 uppercase tracking-widest">{t('home_tag_premium')}</div>
                    <h3 className="text-brand-accent font-black text-sm uppercase tracking-[0.3em] mb-4">{t('home_col_cinema_title')}</h3>
                    <p className="text-white text-[10px] uppercase tracking-widest mb-6 h-8">{t('home_col_cinema_desc')}</p>
                    <div className="text-3xl font-black text-white mb-6">{t('home_col_cinema_price')}</div>
                    <ul className="text-[9px] text-slate-400 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/10">
                        <li>{t('home_col_cinema_li1')}</li>
                        <li>{t('home_col_cinema_li2')}</li>
                        <li>{t('home_col_cinema_li3')}</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 border border-brand-accent text-brand-accent font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-brand-accent group-hover:text-black transition-all">
                        {t('home_btn_details')}
                    </button>
                </div>

                {/* COLUMN 3: PURE SUPPORT */}
                <div onClick={() => handleNavigateToMode('pure-support')} className="group relative bg-slate-900/40 backdrop-blur-sm border border-white/10 p-8 flex flex-col items-center hover:bg-slate-900/80 hover:border-white transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300">
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.3em] mb-4">{t('home_col_support_title')}</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-6 h-8">{t('home_col_support_desc')}</p>
                    <div className="text-3xl font-serif italic text-slate-300 mb-6">{t('home_col_support_price')}</div>
                    <ul className="text-[9px] text-slate-500 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/5">
                        <li>{t('home_col_support_li1')}</li>
                        <li>{t('home_col_support_li2')}</li>
                        <li>{t('home_col_support_li3')}</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 border border-white/20 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-white group-hover:text-black transition-all">
                        {t('home_btn_support')}
                    </button>
                </div>

            </div>
        </div>
      </section>

      {/* HOW TO OPERATE GUIDE */}
      <section className="w-full max-w-6xl px-6 py-20 border-b border-white/5 relative z-10 bg-slate-950/50 backdrop-blur-sm">
        <div className="text-center mb-16">
            <h3 className="text-brand-gold text-xs font-black uppercase tracking-[0.5em] mb-4">{t('guide_section_subtitle')}</h3>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('guide_section_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">01</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">{t('guide_step1_title')}</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest whitespace-pre-line">
                        {t('guide_step1_desc')}
                    </p>
                </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">02</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">{t('guide_step2_title')}</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest whitespace-pre-line">
                        {t('guide_step2_desc')}
                    </p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">03</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">{t('guide_step3_title')}</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest whitespace-pre-line">
                        {t('guide_step3_desc')}
                    </p>
                </div>
            </div>
        </div>
      </section>

    </div>
  );
};

export default Home;