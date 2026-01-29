
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { globalSettings } = useData();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-hidden bg-black">
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 transition-transform duration-[20000ms] scale-105"
        style={{ backgroundImage: `url(${globalSettings.portraitUrl})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24">
        {/* Manifesto Section Removed per user request */}
        <div className="flex flex-col items-center text-center animate-fade-in-up max-w-6xl">
            {/* Main Action Button - White square block style */}
            <div className="mt-0">
                <button 
                  onClick={() => navigate('/interactive')} 
                  className="px-16 md:px-28 py-8 md:py-10 bg-white text-black font-medium text-sm md:text-base uppercase tracking-[0.6em] hover:bg-brand-gold transition-all duration-700 shadow-2xl rounded-sm"
                >
                  {t('btn_start_studio')}
                </button>
            </div>
        </div>

        {/* Support Options */}
        <div className="w-full max-w-[1200px] mt-40 opacity-40 hover:opacity-100 transition-opacity duration-1000 hidden md:block">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch grayscale hover:grayscale-0 transition-all">
                <div onClick={() => navigate('/interactive')} className="group relative bg-white/[0.01] border border-white/5 p-8 flex flex-col transition-all cursor-pointer rounded-sm backdrop-blur-md">
                    <div className="mb-4"><h3 className="text-white/40 font-medium text-[10px] uppercase tracking-[0.4em] mb-2 group-hover:text-brand-gold">互動實驗室</h3><p className="text-slate-600 text-[8px] uppercase tracking-widest font-normal opacity-60">Handcrafted Interaction</p></div>
                    <div className="mb-4"><div className="text-2xl font-light text-white tracking-tighter flex items-baseline gap-2"><span className="text-[10px] font-normal opacity-30 tracking-normal">NT$</span>320</div></div>
                </div>
                <div onClick={() => navigate('/interactive')} className="group relative bg-white/[0.01] border border-white/5 p-8 flex flex-col transition-all cursor-pointer rounded-sm backdrop-blur-md">
                    <div className="mb-4"><h3 className="text-white/40 font-medium text-[10px] uppercase tracking-[0.4em] mb-2 group-hover:text-brand-accent">雲端影院 + 簽名</h3><p className="text-slate-600 text-[8px] uppercase tracking-widest font-normal opacity-60">Cloud Cinema & Sig</p></div>
                    <div className="mb-4"><div className="text-2xl font-light text-white tracking-tighter flex items-baseline gap-2"><span className="text-[10px] font-normal opacity-30 tracking-normal">NT$</span>2,800</div></div>
                </div>
                <div onClick={() => navigate('/interactive')} className="group relative bg-white/[0.01] border border-white/5 p-8 flex flex-col transition-all cursor-pointer rounded-sm backdrop-blur-md">
                    <div className="mb-4"><h3 className="text-white/40 font-medium text-[10px] uppercase tracking-[0.4em] mb-2 group-hover:text-white">音樂食糧</h3><p className="text-slate-600 text-[8px] uppercase tracking-widest font-normal opacity-60">Creative Support</p></div>
                    <div className="mb-4"><div className="text-2xl font-light text-white tracking-tighter flex items-baseline gap-2"><span className="text-[10px] font-normal opacity-30 tracking-normal">NT$</span>100</div></div>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
