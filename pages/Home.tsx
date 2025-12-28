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
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden py-24">
        <div className="absolute inset-0 bg-cover bg-center"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, filter: 'brightness(0.3)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        <div className="relative z-10 max-w-6xl w-full text-center animate-fade-in-up">
            <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em] mb-6 block border border-brand-gold/30 px-4 py-2 inline-block mx-auto rounded-full backdrop-blur-md">
                OFFICIAL VERIFIED
            </span>
            <h1 className="text-[12vw] md:text-[8rem] font-black tracking-tighter uppercase leading-none text-white mb-6 text-gold-glow">
              WILLWI STUDIO
            </h1>
            <p className="text-white text-xs md:text-sm tracking-[0.6em] uppercase mb-16 font-light max-w-2xl mx-auto leading-loose opacity-80">
                支持音樂人 Willwi 歌詞影片創作工具<br/>
                選擇作品 開始製作專屬您的動態歌詞影片
            </p>

            {/* THREE PAYMENT COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
                {/* COLUMN 1: INTERACTIVE */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-slate-900/60 backdrop-blur-md border border-white/10 p-8 flex flex-col items-center hover:bg-slate-900/90 hover:border-brand-gold transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold/50 group-hover:bg-brand-gold transition-all"></div>
                    <h3 className="text-brand-gold font-black text-sm uppercase tracking-[0.3em] mb-4">共鳴同步</h3>
                    <p className="text-white text-[10px] uppercase tracking-widest mb-6 h-8 text-center">手工對時動態歌詞影片</p>
                    <div className="text-3xl font-black text-white mb-6">NT$ 320</div>
                    <ul className="text-[9px] text-slate-400 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/10">
                        <li>✦ 參與單曲製作體驗</li>
                        <li>✦ 個人化對時紀錄</li>
                        <li>✦ 30天雲端下載連結</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 bg-brand-gold text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-white transition-all">
                        ENTER STUDIO
                    </button>
                </div>

                {/* COLUMN 2: CLOUD CINEMA */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-gradient-to-b from-slate-900/80 to-black/80 backdrop-blur-md border border-brand-accent/30 p-8 flex flex-col items-center hover:border-brand-accent transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
                    <div className="absolute top-0 right-0 bg-brand-accent text-slate-900 text-[9px] font-bold px-3 py-1 uppercase tracking-widest">PREMIUM</div>
                    <h3 className="text-brand-accent font-black text-sm uppercase tracking-[0.3em] mb-4">雲端影院</h3>
                    <p className="text-white text-[10px] uppercase tracking-widest mb-6 h-8 text-center">高畫質加歌手專屬簽名</p>
                    <div className="text-3xl font-black text-white mb-6">NT$ 2,800</div>
                    <ul className="text-[9px] text-slate-400 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/10">
                        <li>✦ 4K 高畫質重製</li>
                        <li>✦ 歌手親筆數位簽名</li>
                        <li>✦ 優先製作權限</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 border border-brand-accent text-brand-accent font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-brand-accent group-hover:text-black transition-all">
                        PREMIUM ACCESS
                    </button>
                </div>

                {/* COLUMN 3: PURE SUPPORT */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-slate-900/40 backdrop-blur-sm border border-white/10 p-8 flex flex-col items-center hover:bg-slate-900/80 hover:border-white transition-all cursor-pointer overflow-hidden transform hover:-translate-y-2 duration-300">
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.3em] mb-4">暖心支持</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-6 h-8 text-center">純粹創作能量挹注</p>
                    <div className="text-3xl font-black text-white mb-6">NT$ 100</div>
                    <ul className="text-[9px] text-slate-500 space-y-2 mb-8 text-left w-full pl-4 border-l border-white/5">
                        <li>✦ 贊助一份餐點</li>
                        <li>✦ 無負擔支持</li>
                        <li>✦ 創作者社群感謝</li>
                    </ul>
                    <button className="mt-auto px-8 py-3 border border-white/20 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-white group-hover:text-black transition-all">
                        SUPPORT
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* HOW TO OPERATE GUIDE */}
      <section className="w-full max-w-6xl px-6 py-20 border-b border-white/5 relative z-10 bg-slate-950/50 backdrop-blur-sm">
        <div className="text-center mb-16">
            <h3 className="text-brand-gold text-xs font-black uppercase tracking-[0.5em] mb-4">OPERATION GUIDE</h3>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">如何參與創作</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">01</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">選擇曲目與風格</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest">從 20 首精選曲目中挑選<br/>配置您喜愛的動態樣式</p>
                </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">02</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">手工對時錄製</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest">隨節奏點擊螢幕推進歌詞<br/>親手完成每一句同步</p>
                </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-6 group relative z-10">
                <div className="w-16 h-16 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-xl font-black text-slate-500 group-hover:border-brand-gold group-hover:text-brand-gold transition-all shadow-lg">03</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-3 text-sm">獲取動態影片</h4>
                    <p className="text-[10px] text-slate-400 leading-loose uppercase tracking-widest">系統自動生成錄製影片<br/>提供 30 天雲端下載連結</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;