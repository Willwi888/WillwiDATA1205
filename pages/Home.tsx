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
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 md:px-20 overflow-hidden py-24">
        {/* 背景亮度顯著提升，從 0.35 調整至 0.65 */}
        <div className="absolute inset-0 bg-cover bg-[position:right_center] md:bg-right"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})`, filter: 'brightness(0.65) contrast(1.1)' }}></div>
        
        {/* 精準垂直漸層：僅保留底部微量沈澱 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
        
        {/* 精準水平漸層：加強左側文字背後的對比，但快速消散至透明，不擋臉 */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/20 to-transparent"></div>

        <div className="relative z-10 max-w-7xl w-full text-left flex flex-col items-start animate-fade-in-up">
            <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.5em] mb-8 block border border-brand-gold/40 px-6 py-2 rounded-sm backdrop-blur-md bg-black/20">
                OFFICIAL VERIFIED
            </span>
            
            <h1 className="text-[10vw] md:text-[7.5rem] font-black tracking-tighter uppercase leading-[0.85] text-white mb-8 text-gold-glow max-w-4xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              WILLWI<br/>STUDIO
            </h1>
            
            <p className="text-white text-xs md:text-sm tracking-[0.6em] uppercase mb-20 font-light max-w-xl leading-relaxed opacity-90 border-l-2 border-brand-gold/60 pl-8 drop-shadow-lg">
                支持音樂人 WILLWI 歌詞影片創作工具<br/>
                選擇作品 開始製作專屬您的動態歌詞影片
            </p>

            {/* PAYMENT COLUMNS - 調整為低飽和半透明工業感，與明亮的背景形成層次 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/20 w-full max-w-5xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                {/* COLUMN 1: INTERACTIVE */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/60 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-brand-gold font-black text-[11px] uppercase tracking-[0.4em] mb-4">共鳴同步</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-8">手工對時動態歌詞影片</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">NT$ 320</div>
                    <ul className="text-[9px] text-slate-400 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> 參與單曲製作體驗</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> 個人化對時紀錄</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-gold"></span> 數位參與證明</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-brand-gold transition-all">
                        ENTER LAB
                    </button>
                </div>

                {/* COLUMN 2: CLOUD CINEMA */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/80 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden border-x border-white/10">
                    <div className="absolute top-0 right-0 bg-brand-accent text-slate-900 text-[9px] font-black px-4 py-1.5 uppercase tracking-widest">PREMIUM</div>
                    <h3 className="text-brand-accent font-black text-[11px] uppercase tracking-[0.4em] mb-4">雲端影院</h3>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-8">高畫質加歌手專屬簽名</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">NT$ 2,800</div>
                    <ul className="text-[9px] text-slate-300 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> 4K 高畫質重製</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> 歌手親筆數位簽名</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand-accent"></span> 優先製作權限</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 bg-brand-accent text-black font-black text-[10px] uppercase tracking-[0.3em] w-full hover:bg-white transition-all">
                        PREMIUM
                    </button>
                </div>

                {/* COLUMN 3: PURE SUPPORT */}
                <div onClick={() => handleNavigateToMode('intro')} className="group relative bg-black/40 p-10 flex flex-col items-start hover:bg-slate-900/80 transition-all cursor-pointer overflow-hidden">
                    <h3 className="text-white font-black text-[11px] uppercase tracking-[0.4em] mb-4">音樂食糧</h3>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-8">純粹創作能量挹注</p>
                    <div className="text-4xl font-black text-white mb-10 tracking-tighter">NT$ 100</div>
                    <ul className="text-[9px] text-slate-500 space-y-3 mb-12 text-left w-full uppercase tracking-widest">
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> 贊助一份餐點</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> 無負擔支持</li>
                        <li className="flex items-center gap-2"><span className="w-1 h-1 bg-white/40"></span> 創作者社群感謝</li>
                    </ul>
                    <button className="mt-auto px-10 py-4 border border-white/30 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] w-full group-hover:bg-white group-hover:text-black transition-all">
                        SUPPORT
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* HOW TO OPERATE GUIDE */}
      <section className="w-full max-w-7xl px-6 md:px-20 py-32 border-b border-white/10 relative z-10 bg-slate-950">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div className="text-left">
                <h3 className="text-brand-gold text-[10px] font-black uppercase tracking-[0.6em] mb-4">OPERATION GUIDE</h3>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter">如何參與創作</h2>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] max-w-md text-left md:text-right">
                我們建立了一個簡單的流程，讓您在支持音樂的同時，也能留下獨特的參與痕跡。
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5 shadow-2xl">
            <div className="flex flex-col items-start p-12 space-y-8 group relative bg-black hover:bg-slate-900 transition-all">
                <div className="text-4xl font-black text-slate-800 group-hover:text-brand-gold transition-colors font-mono">01</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-[0.2em] mb-6 text-lg">選擇曲目與風格</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest">從精選作品中挑選<br/>配置您喜愛的視覺與對位樣式</p>
                </div>
            </div>
            <div className="flex flex-col items-start p-12 space-y-8 group relative bg-black hover:bg-slate-900 transition-all border-x border-white/5">
                <div className="text-4xl font-black text-slate-800 group-hover:text-brand-gold transition-colors font-mono">02</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-[0.2em] mb-6 text-lg">手工對時錄製</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest">隨節奏點擊螢幕推進歌詞<br/>親手完成每一句同步與情感對位</p>
                </div>
            </div>
            <div className="flex flex-col items-start p-12 space-y-8 group relative bg-black hover:bg-slate-900 transition-all">
                <div className="text-4xl font-black text-slate-800 group-hover:text-brand-gold transition-colors font-mono">03</div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-[0.2em] mb-6 text-lg">獲取動態影片</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest">系統自動整合錄製成果與音訊<br/>產出專屬您的創作紀錄檔案</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;