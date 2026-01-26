
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import PaymentModal from '../components/PaymentModal';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { globalSettings } = useData();
  const navigate = useNavigate();
  
  // 支付彈窗狀態管理
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payMode, setPayMode] = useState<'support' | 'production' | 'cinema'>('support');

  const openPayment = (mode: 'support' | 'production' | 'cinema') => {
      setPayMode(mode);
      setIsPaymentOpen(true);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-hidden bg-black">
      {/* Background Layers - Connected to dynamic portraitUrl */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 transition-transform duration-[10000ms] scale-110"
        style={{ backgroundImage: `url(${globalSettings.portraitUrl})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-6 md:px-24 pt-48 pb-32">
        
        {/* Manifesto Section */}
        <div className="flex flex-col items-center text-center mb-12 animate-fade-in-up">
            <div className="w-12 h-[1px] bg-brand-gold mb-6 opacity-30"></div>
            <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.8em] mb-12 opacity-80">
                {t('manifesto_title')}
            </span>
            
            <h1 className="text-[20vw] md:text-[16rem] font-black tracking-tighter uppercase leading-[0.7] mb-12 text-white select-none filter drop-shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              WILLWI
            </h1>
            
            <div className="max-w-3xl px-4">
                <p className="text-slate-300 text-sm md:text-xl tracking-[0.4em] uppercase font-bold leading-relaxed opacity-60">
                    {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                </p>
            </div>
        </div>

        {/* Action Tiers Grid - 100, 320, 2800 */}
        <div className="w-full max-w-[1400px] mt-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                
                {/* Mode 1: Support ($100 單純支持) */}
                <div 
                  className="group relative bg-white/[0.02] border border-white/5 p-10 flex flex-col hover:border-brand-gold/30 hover:bg-white/[0.04] transition-all duration-700 rounded-sm backdrop-blur-3xl"
                >
                    <div className="mb-8">
                        <h3 className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] mb-4 group-hover:text-brand-gold transition-colors">熱能贊助方案</h3>
                        <p className="text-slate-600 text-[9px] uppercase tracking-widest font-bold opacity-60">Thermal Support</p>
                    </div>
                    
                    <div className="mb-10">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>100
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-6 font-bold leading-relaxed">單純支持創作。請團隊喝杯咖啡，協助平台數據維護。</p>
                    </div>

                    <ul className="text-[9px] text-slate-600 space-y-4 mb-10 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-slate-700 rounded-full"></span> 創作能量補充</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-slate-700 rounded-full"></span> 優先獲取最新作品情報</li>
                    </ul>

                    <button 
                      onClick={() => openPayment('support')}
                      className="w-full py-5 bg-white/5 text-white font-black text-[9px] uppercase tracking-[0.6em] group-hover:bg-white group-hover:text-black transition-all duration-500"
                    >
                        SUPPORT NOW
                    </button>
                </div>

                {/* Mode 2: Production ($320 手作對時) */}
                <div 
                  className="group relative bg-white/[0.03] border border-brand-gold/20 p-10 flex flex-col hover:border-brand-gold hover:bg-white/[0.05] transition-all duration-700 rounded-sm backdrop-blur-3xl shadow-[0_0_50px_rgba(251,191,36,0.05)] scale-105 z-10"
                >
                    <div className="mb-8">
                        <h3 className="text-brand-gold font-black text-[11px] uppercase tracking-[0.4em] mb-4">手作對時體驗</h3>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">Production Access</p>
                    </div>
                    
                    <div className="mb-10">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>320
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-6 font-bold leading-relaxed">取得錄製室存取權，親手紀錄每一句歌詞的呼吸與節奏。</p>
                    </div>

                    <ul className="text-[9px] text-slate-500 space-y-4 mb-10 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span> 專業級對時工具</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full"></span> 8 秒有機噪點背景渲染</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-gold rounded-full"></span> 導出策展成品影片</li>
                    </ul>

                    <button 
                      onClick={() => openPayment('production')}
                      className="w-full py-5 bg-brand-gold text-black font-black text-[9px] uppercase tracking-[0.6em] hover:bg-white transition-all duration-500"
                    >
                        GET ACCESS
                    </button>
                    
                    <button 
                      onClick={() => navigate('/interactive')}
                      className="w-full mt-2 py-2 text-brand-gold/40 hover:text-brand-gold text-[8px] font-black uppercase tracking-widest transition-colors"
                    >
                      Skip to Studio (Debug)
                    </button>
                </div>

                {/* Mode 3: Cinema ($2800 大師方案) */}
                <div 
                  className="group relative bg-white/[0.02] border border-white/5 p-10 flex flex-col hover:border-brand-accent/40 hover:bg-white/[0.04] transition-all duration-700 rounded-sm backdrop-blur-3xl"
                >
                    <div className="mb-8">
                        <h3 className="text-brand-accent font-black text-[11px] uppercase tracking-[0.4em] mb-4">大師影視方案</h3>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold opacity-60">Cinema Master</p>
                    </div>
                    
                    <div className="mb-10">
                        <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                            <span className="text-xs font-normal opacity-30 tracking-normal">NT$</span>2800
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-6 font-bold leading-relaxed">提供最高品質的創作支持，獲取數位簽名與錄音室優先權。</p>
                    </div>

                    <ul className="text-[9px] text-slate-500 space-y-4 mb-10 uppercase tracking-widest font-bold flex-grow">
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full"></span> 4K 高畫質渲染權限</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full"></span> 專屬數位收藏證明</li>
                        <li className="flex items-center gap-3"><span className="w-1 h-1 bg-brand-accent rounded-full"></span> 贊助錄音室與後期資源</li>
                    </ul>

                    <button 
                      onClick={() => openPayment('cinema')}
                      className="w-full py-5 bg-white/5 text-white font-black text-[9px] uppercase tracking-[0.6em] group-hover:bg-brand-accent group-hover:text-black transition-all duration-500"
                    >
                        BECOME MASTER
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* 支付彈窗組件 */}
      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        initialMode={payMode}
      />
    </div>
  );
};

export default Home;
