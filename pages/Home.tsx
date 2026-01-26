
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-hidden bg-black">
      {/* Background Layers */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 transition-transform duration-[10000ms] scale-110"
        style={{ backgroundImage: `url(${ASSETS.willwiPortrait})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24 pt-48 pb-32">
        
        {/* Manifesto Section */}
        <div className="flex flex-col items-center text-center mb-12 animate-fade-in-up">
            <div className="w-12 h-[1px] bg-brand-gold mb-6 opacity-30"></div>
            <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.8em] mb-12 opacity-80">
                {t('manifesto_title')}
            </span>
            
            <h1 className="text-[22vw] md:text-[16rem] font-black tracking-tighter uppercase leading-[0.7] mb-12 text-white select-none filter drop-shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              WILLWI
            </h1>
            
            <div className="max-w-3xl">
                <p className="text-slate-300 text-sm md:text-xl tracking-[0.4em] uppercase font-bold leading-relaxed opacity-60">
                    {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                </p>
            </div>
        </div>

        {/* Action Tiers Grid - 價格全面調降，回歸支持初衷 */}
        <div className="w-full max-w-[1200px] mt-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
                
                {/* Mode 1: PARTICIPATION (The $1 Protocol) */}
                <div 
                  onClick={() => navigate('/interactive')} 
                  className="group relative bg-white/[0.02] border border-white/5 p-12 flex flex-col hover:border-brand-gold/40 hover:bg-white/[0.04] transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-3xl"
                >
                    <div className="mb-10">
                        <h3 className="text-brand-gold font-black text-[12px] uppercase tracking-[0.4em] mb-4">手作對時體驗</h3>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold opacity-60">Handcrafted Interaction</p>
                    </div>
                    
                    <div className="mb-12">
                        <div className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>30
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-6 font-bold leading-relaxed">約合 $1 美金。取得存取權，親手紀錄每一句歌詞的呼吸。</p>
                    </div>

                    <ul className="text-[10px] text-slate-500 space-y-4 mb-12 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full opacity-40"></span> 入場 8 秒有機噪點背景渲染</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full opacity-40"></span> Musixmatch 專業級對時工具</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full opacity-40"></span> 導出專屬策展成品影片</li>
                    </ul>

                    <button className="w-full py-6 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-brand-gold group-hover:text-black group-hover:border-brand-gold transition-all duration-500">
                        ENTER STUDIO
                    </button>
                </div>

                {/* Mode 2: SUPPORTER (Premium) */}
                <div 
                  onClick={() => navigate('/interactive')} 
                  className="group relative bg-white/[0.02] border border-white/5 p-12 flex flex-col hover:border-brand-accent/40 hover:bg-white/[0.04] transition-all duration-700 cursor-pointer rounded-sm backdrop-blur-3xl"
                >
                    <div className="mb-10">
                        <h3 className="text-brand-accent font-black text-[12px] uppercase tracking-[0.4em] mb-4">深度支持方案</h3>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold opacity-60">Creative Support</p>
                    </div>
                    
                    <div className="mb-12">
                        <div className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>300
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-6 font-bold leading-relaxed">提供更多創作能量，獲取數位簽名與優先權限。</p>
                    </div>

                    <ul className="text-[10px] text-slate-500 space-y-4 mb-12 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full opacity-40"></span> 高畫質渲染與數位簽名</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full opacity-40"></span> 贊助錄音室與後期資源</li>
                    </ul>

                    <button className="w-full py-6 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.6em] group-hover:bg-brand-accent group-hover:text-black group-hover:border-brand-accent transition-all duration-500">
                        SUPPORT CREATION
                    </button>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
