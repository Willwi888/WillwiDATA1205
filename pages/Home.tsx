
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-end overflow-hidden bg-transparent">
      
      {/* Main view is now pure and cinematic */}
      <div className="flex-grow"></div>

      {/* Bottom Interface: Floating Glass Cards */}
      <section className="relative z-10 w-full flex flex-col items-center px-10 pb-32">
        <div className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            {[
                { label: '互動實驗室', price: '320', sub: 'Handcrafted Interaction', target: '/interactive' },
                { label: '雲端影院 + 簽名', price: '2,800', sub: 'Cloud Cinema & Sig', target: '/interactive', highlight: true },
                { label: '音樂食糧', price: '100', sub: 'Creative Support', target: '/interactive' }
            ].map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate(item.target)}
                  className={`group relative p-12 flex flex-col border border-white/5 transition-all duration-700 cursor-pointer overflow-hidden backdrop-blur-md hover:border-white/20 ${item.highlight ? 'bg-white/[0.02]' : 'bg-black/5'}`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative z-10">
                        <div className="mb-10">
                            <h3 className="text-white/40 font-light text-[11px] uppercase tracking-[0.4em] mb-4 group-hover:text-white transition-colors">{item.label}</h3>
                            <p className="text-slate-600 text-[9px] uppercase tracking-widest font-normal group-hover:text-slate-400 transition-colors">{item.sub}</p>
                        </div>
                        <div className="mb-12">
                            <div className="text-5xl font-thin text-white tracking-tighter flex items-baseline gap-3">
                                <span className="text-[10px] font-normal opacity-20 tracking-normal group-hover:opacity-40 transition-opacity">NT$</span>
                                <span className="opacity-90 group-hover:opacity-100 transition-opacity">{item.price}</span>
                            </div>
                        </div>
                        <button className="w-full py-5 border border-white/5 text-white/30 font-medium text-[9px] uppercase tracking-[0.8em] group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-500 pl-[0.8em]">
                            SELECT OPTION
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold/0 to-transparent group-hover:via-brand-gold/40 transition-all duration-1000"></div>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
