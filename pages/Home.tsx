
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
      {/* Background Layers */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-[10000ms] scale-110"
        style={{ backgroundImage: `url(${globalSettings.portraitUrl})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.15)_0%,transparent_70%)]"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24 pt-48 pb-32">
        
        {/* Manifesto Section */}
        <div className="flex flex-col items-center text-center mb-12 animate-fade-in-up">
            <div className="w-12 h-[1px] bg-brand-gold mb-6"></div>
            <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.8em] mb-8">
                {t('manifesto_title')}
            </span>
            
            <h1 className="text-[22vw] md:text-[16rem] font-black tracking-tighter uppercase leading-[0.7] mb-12 text-white select-none filter drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              WILLWI
            </h1>
            
            <div className="max-w-3xl">
                <p className="text-white text-sm md:text-xl tracking-[0.5em] uppercase font-semibold leading-relaxed">
                    {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                </p>
            </div>
        </div>

        {/* Action Tiers Grid */}
        <div className="w-full max-w-[1400px] mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                
                {/* Mode 1: LAB (Standard) */}
                <div 
                  onClick={() => navigate('/interactive')} 
                  className="group relative bg-white/[0.02] border border-white/10 p-12 flex flex-col hover:border-brand-gold/50 hover:bg-white/[0.04] transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-xl"
                >
                    <div className="mb-10">
                        <h3 className="text-brand-gold font-black text-[12px] uppercase tracking-[0.4em] mb-4">互動實驗室</h3>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold opacity-60">Handcrafted Interaction</p>
                    </div>
                    
                    <div className="mb-12">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>320
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4 font-bold">手工對時每一句歌詞 留下屬於你的重量</p>
                    </div>

                    <ul className="text-[10px] text-slate-400 space-y-4 mb-12 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full"></span> 參與單曲製作體驗</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full"></span> 真實感官呼吸紀錄</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full"></span> 獲得專屬成品影片</li>
                    </ul>

                    <button className="w-full py-6 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-brand-gold group-hover:text-black group-hover:border-brand-gold transition-all duration-500">
                        ENTER STUDIO
                    </button>
                </div>

                {/* Mode 2: CINEMA (Premium / Featured) */}
                <div 
                  onClick={() => navigate('/interactive')} 
                  className="group relative bg-brand-accent/5 border border-brand-accent/40 p-12 flex flex-col scale-105 z-20 backdrop-blur-2xl shadow-[0_40px_100px_rgba(56,189,248,0.15)] rounded-sm hover:bg-brand-accent/10 transition-all duration-700 cursor-pointer overflow-hidden"
                >
                    {/* Glow Highlight */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 blur-[60px]"></div>

                    <div className="mb-10">
                        <h3 className="text-brand-accent font-black text-[12px] uppercase tracking-[0.4em] mb-4">雲端影院 + 簽名</h3>
                        <p className="text-white text-[10px] uppercase tracking-widest font-bold">Cloud Cinema & Sig</p>
                    </div>
                    
                    <div className="mb-12">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>2,800
                        </div>
                        <p className="text-[10px] text-brand-accent/80 uppercase tracking-widest mt-4 font-bold">4K 高畫質重製 & 數位簽名</p>
                    </div>

                    <ul className="text-[10px] text-white space-y-4 mb-12 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full shadow-glow"></span> 4K Ultra-HD Master</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full shadow-glow"></span> 歌手親筆數位簽名</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full shadow-glow"></span> 優先製作權限</li>
                    </ul>

                    <button className="w-full py-7 bg-brand-accent text-black font-black text-[10px] uppercase tracking-[0.6em] hover:bg-white transition-all duration-500 shadow-[0_10px_30px_rgba(56,189,248,0.3)]">
                        PREMIUM ACCESS
                    </button>
                </div>

                {/* Mode 3: SUPPORT (Micro) */}
                <div 
                  onClick={() => navigate('/interactive')} 
                  className="group relative bg-white/[0.01] border border-white/5 p-12 flex flex-col hover:border-white/30 hover:bg-white/[0.03] transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-md"
                >
                    <div className="mb-10">
                        <h3 className="text-white font-black text-[12px] uppercase tracking-[0.4em] mb-4 opacity-80">音樂食糧</h3>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold opacity-40">Creative Support</p>
                    </div>
                    
                    <div className="mb-12">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>100
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-4 font-bold">純粹創作能量挹注</p>
                    </div>

                    <ul className="text-[10px] text-slate-600 space-y-4 mb-12 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3">贊助一份錄音餐點</li>
                        <li className="flex items-center gap-3">支持獨立音樂發行</li>
                        <li className="flex items-center gap-3">社群特別致謝</li>
                    </ul>

                    <button className="w-full py-6 border border-white/5 text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-500">
                        SUPPORT
                    </button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
