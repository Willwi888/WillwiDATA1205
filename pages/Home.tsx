
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
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-[10000ms] scale-110"
        style={{ backgroundImage: `url(${globalSettings.portraitUrl})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24 pt-48 pb-32">
        <div className="flex flex-col items-center text-center mb-12 animate-fade-in-up">
            <div className="w-12 h-[1px] bg-brand-gold mb-6"></div>
            <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.8em] mb-8">
                {t('manifesto_title')}
            </span>
            
            <h1 className="text-[22vw] md:text-[16rem] font-black tracking-tighter uppercase leading-[0.7] mb-12 text-white select-none">
              WILLWI
            </h1>
            
            <div className="max-w-4xl">
                <p className="text-white text-sm md:text-2xl tracking-[0.4em] uppercase font-bold leading-relaxed">
                    {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                </p>
            </div>
        </div>

        <div className="w-full max-w-[1400px] mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                <div onClick={() => navigate('/interactive')} className="group relative bg-white/[0.02] border border-white/10 p-12 flex flex-col hover:border-brand-gold/50 transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-xl">
                    <div className="mb-10"><h3 className="text-brand-gold font-black text-[12px] uppercase tracking-[0.4em] mb-4">互動實驗室</h3><p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold opacity-60">Handcrafted Interaction</p></div>
                    <div className="mb-12"><div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2"><span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>320</div></div>
                    <button className="w-full py-6 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-brand-gold group-hover:text-black transition-all duration-500">ENTER STUDIO</button>
                </div>
                <div onClick={() => navigate('/interactive')} className="group relative bg-brand-accent/5 border border-brand-accent/40 p-12 flex flex-col scale-105 z-20 backdrop-blur-2xl rounded-sm hover:bg-brand-accent/10 transition-all duration-700 cursor-pointer overflow-hidden shadow-2xl">
                    <div className="mb-10"><h3 className="text-brand-accent font-black text-[12px] uppercase tracking-[0.4em] mb-4">雲端影院 + 簽名</h3><p className="text-white text-[10px] uppercase tracking-widest font-bold">Cloud Cinema & Sig</p></div>
                    <div className="mb-12"><div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2"><span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>2,800</div></div>
                    <button className="w-full py-7 bg-brand-accent text-black font-black text-[10px] uppercase tracking-[0.6em] hover:bg-white transition-all duration-500">PREMIUM ACCESS</button>
                </div>
                <div onClick={() => navigate('/interactive')} className="group relative bg-white/[0.01] border border-white/5 p-12 flex flex-col hover:border-white/30 transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-md">
                    <div className="mb-10"><h3 className="text-white font-black text-[12px] uppercase tracking-[0.4em] mb-4 opacity-80">音樂食糧</h3><p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold opacity-40">Creative Support</p></div>
                    <div className="mb-12"><div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2"><span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>100</div></div>
                    <button className="w-full py-6 border border-white/5 text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-white group-hover:text-black transition-all duration-500">SUPPORT</button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
