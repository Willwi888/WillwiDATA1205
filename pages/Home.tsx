
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-between overflow-hidden bg-transparent">
      {/* 中心區域留白，讓宇宙背景展現，徹底移除標題與描述 */}
      <div className="flex-grow"></div>

      {/* 底部卡片區域 - 保持不變，提供核心功能入口 */}
      <section className="relative z-10 w-full flex flex-col items-center px-10 pb-32">
        <div className="w-full max-w-[1300px] grid grid-cols-1 md:grid-cols-3 gap-12 animate-fade-in-up">
            {[
                { label: '互動實驗室', price: '320', sub: 'Handcrafted Interaction', target: '/interactive' },
                { label: '雲端影院 + 簽名', price: '2,800', sub: 'Cloud Cinema & Sig', target: '/interactive', highlight: true },
                { label: '音樂食糧', price: '100', sub: 'Creative Support', target: '/interactive' }
            ].map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigate(item.target)}
                  className={`group relative p-12 flex flex-col border transition-all duration-700 cursor-pointer rounded-none overflow-hidden ${item.highlight ? 'bg-white/[0.02] border-white/20' : 'bg-transparent border-white/5 hover:border-white/20'}`}
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="mb-10 text-left">
                            <h3 className="text-white/80 font-light text-[11px] uppercase tracking-[0.4em] mb-4">{item.label}</h3>
                            <p className="text-slate-600 text-[9px] uppercase tracking-widest font-normal">{item.sub}</p>
                        </div>
                        <div className="mb-12 text-left">
                            <div className="text-5xl font-thin text-white tracking-tighter flex items-baseline gap-3">
                                <span className="text-[10px] font-normal opacity-30 tracking-normal">NT$</span>{item.price}
                            </div>
                        </div>
                        <button className="w-full py-5 border border-white/10 text-white/50 font-medium text-[9px] uppercase tracking-[0.8em] group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-500 pl-[0.8em]">
                            SELECT OPTION
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
