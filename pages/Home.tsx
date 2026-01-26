import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useData, resolveDirectLink } from '../context/DataContext';
import PaymentModal from '../components/PaymentModal';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { globalSettings } = useData();
  const navigate = useNavigate();
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payMode, setPayMode] = useState<'support' | 'production' | 'cinema'>('support');

  const openPayment = (mode: 'support' | 'production' | 'cinema') => {
      setPayMode(mode);
      setIsPaymentOpen(true);
  };

  const isVideo = globalSettings.portraitUrl?.toLowerCase().match(/\.(mp4|webm|ogg|mov)/i) || 
                  globalSettings.portraitUrl?.includes('raw=1') || 
                  globalSettings.portraitUrl?.includes('dl=1');

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-hidden bg-black">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {isVideo ? (
          <video src={resolveDirectLink(globalSettings.portraitUrl)} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-10 transition-opacity duration-3000" />
        ) : (
          <div className="absolute inset-0 bg-cover bg-center opacity-10 transition-transform duration-[30000ms] scale-125" style={{ backgroundImage: `url(${globalSettings.portraitUrl})` }}></div>
        )}
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[95vw] border-[0.2px] border-orange-500/5 rounded-full animate-zen-spin pointer-events-none"></div>

      <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24 py-72">
        
        {/* Existence Manifesto */}
        <div className="flex flex-col items-center text-center mb-64 animate-fade-in-up">
            <div className="w-12 h-[0.5px] bg-brand-gold mb-20 opacity-30"></div>
            
            <h1 className="text-[14vw] md:text-[10rem] font-thin tracking-tighter uppercase leading-[0.8] mb-24 text-white select-none filter blur-[0.6px] hover:blur-0 transition-all duration-[2000ms]">
              WILLWI
            </h1>
            
            <div className="max-w-3xl px-8 relative py-20 bg-white/[0.01] backdrop-blur-3xl border border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[0.5px] h-20 bg-brand-gold/40"></div>
                <div className="text-slate-400 text-sm md:text-xl tracking-[0.6em] uppercase leading-[2.8] font-thin opacity-80 whitespace-pre-line">
                    {t('manifesto_content')}
                </div>
            </div>
        </div>

        {/* Action Tiers */}
        <div className="w-full max-w-[1600px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-stretch">
                {[
                  { mode: 'support' as const, title: '熱能贊助', eng: 'Thermal Support', price: '100', desc: '單純支持創作。\n協助平台數據與空間維護。' },
                  { mode: 'production' as const, title: '手作對時體驗', eng: 'Production Access', price: '320', desc: '取得錄製室存取權，\n紀錄歌詞的每一處呼吸。', highlight: true },
                  { mode: 'cinema' as const, title: '大師影視方案', eng: 'Cinema Master', price: '2800', desc: '提供高品質支持，\n獲取數位簽名與優先權。' }
                ].map((tier, i) => (
                    <div key={i} className={`group relative bg-white/[0.01] border p-16 flex flex-col transition-all duration-1000 hover:bg-white/[0.02] backdrop-blur-3xl ${tier.highlight ? 'border-orange-500/20 scale-[1.03] z-10 shadow-[0_0_120px_rgba(217,119,6,0.02)]' : 'border-white/5 hover:border-white/20'}`}>
                        <div className="mb-16">
                            <h3 className={`${tier.highlight ? 'text-brand-gold' : 'text-slate-600'} text-[9px] uppercase tracking-[1em] mb-6`}>{tier.title}</h3>
                            <p className="text-slate-800 text-[7px] uppercase tracking-widest">{tier.eng}</p>
                        </div>
                        <div className="mb-20">
                            <div className="text-4xl text-white tracking-tighter flex items-baseline gap-3">
                                <span className="text-[9px] opacity-20 tracking-normal">NT$</span>{tier.price}
                            </div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-12 leading-[2.4] whitespace-pre-line">{tier.desc}</p>
                        </div>
                        <button onClick={() => openPayment(tier.mode)} className={`w-full py-6 border text-[8px] uppercase tracking-[1em] transition-all duration-700 ${tier.highlight ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black' : 'border-white/5 text-white/30 hover:border-white hover:text-white'}`}>
                            {tier.mode === 'production' ? 'GET ACCESS' : tier.mode === 'cinema' ? 'MASTER' : 'SUPPORT'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} initialMode={payMode} />
    </div>
  );
}; export default Home;