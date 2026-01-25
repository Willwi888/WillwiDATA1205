
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useData, ASSETS } from '../context/DataContext';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { globalSettings } = useData();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-hidden">
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-10 md:px-24 py-32">
        
        <div className="absolute inset-0 bg-cover bg-center opacity-100 transition-all duration-[6000ms]"
             style={{ backgroundImage: `url(${ASSETS.willwiPortrait})` }}></div>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgba(251,191,36,0.22)_0%,transparent_75%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        <div className="relative z-10 max-w-7xl w-full flex flex-col items-center text-center animate-fade-in-up">
            
            <div className="mb-14 flex items-center gap-10">
                <div className="h-[1px] w-20 bg-brand-gold/40"></div>
                <span className="text-brand-gold font-black text-[12px] uppercase tracking-[1em] drop-shadow-glow">
                    {t('manifesto_title')}
                </span>
                <div className="h-[1px] w-20 bg-brand-gold/40"></div>
            </div>
            
            <h1 className="text-[18vw] md:text-[14rem] font-black tracking-tighter uppercase leading-[0.75] mb-12 text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)] select-none">
              WILLWI
            </h1>
            
            <div className="max-w-4xl mb-32">
                <p className="text-slate-100 text-sm md:text-2xl tracking-[0.4em] uppercase font-bold leading-loose drop-shadow-2xl opacity-90">
                    {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                </p>
            </div>

            <div className="w-full max-w-[1500px]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    
                    {/* Mode 1: LAB */}
                    <div onClick={() => navigate('/interactive')} className="group relative bg-black/40 border border-white/10 p-16 flex flex-col items-start hover:border-brand-gold hover:bg-black/90 transition-all duration-500 cursor-pointer rounded-sm backdrop-blur-3xl text-left hover:-translate-y-2">
                        <h3 className="text-brand-gold font-black text-[14px] uppercase tracking-[0.5em] mb-8">互動實驗室</h3>
                        <p className="text-slate-400 text-[11px] uppercase tracking-widest mb-14 font-bold">手工對時每一句歌詞 留下屬於你的重量</p>
                        <div className="text-7xl font-black text-white mb-14 tracking-tighter">
                            <span className="text-lg font-normal mr-2 opacity-30">NT$</span>320
                        </div>
                        <ul className="text-[11px] text-slate-500 space-y-7 mb-20 uppercase tracking-widest flex-grow font-bold">
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-gold rounded-full shadow-glow"></span> 參與單曲製作體驗</li>
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-gold rounded-full shadow-glow"></span> 每一秒都是真實的痕跡</li>
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-gold rounded-full shadow-glow"></span> 獲得專屬 MP4 影片檔案</li>
                        </ul>
                        <button className="w-full py-8 border-2 border-white/10 text-white font-black text-[11px] uppercase tracking-[0.8em] group-hover:bg-brand-gold group-hover:text-black group-hover:border-brand-gold transition-all">
                            ENTER LAB
                        </button>
                    </div>

                    {/* Mode 2: CINEMA */}
                    <div onClick={() => navigate('/interactive')} className="group relative bg-brand-accent/5 border-2 border-brand-accent/40 p-16 flex flex-col items-start hover:bg-brand-accent/20 transition-all duration-500 cursor-pointer rounded-sm backdrop-blur-[80px] scale-105 shadow-[0_50px_120px_rgba(56,189,248,0.3)] text-left hover:-translate-y-3">
                        <div className="absolute -top-5 left-16 bg-brand-accent text-black text-[10px] font-black px-8 py-2.5 uppercase tracking-[0.4em] shadow-lg">HIGH FIDELITY</div>
                        <h3 className="text-brand-accent font-black text-[14px] uppercase tracking-[0.5em] mb-8">雲端影院 + 簽名</h3>
                        <p className="text-slate-100 text-[11px] uppercase tracking-widest mb-14 font-bold">4K 高畫質重製 & 數位簽名</p>
                        <div className="text-7xl font-black text-white mb-14 tracking-tighter">
                            <span className="text-lg font-normal mr-2 opacity-30">NT$</span>2,800
                        </div>
                        <ul className="text-[11px] text-slate-100 space-y-7 mb-20 uppercase tracking-widest flex-grow font-bold">
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-accent rounded-full shadow-glow"></span> 4K 高畫質重製</li>
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-accent rounded-full shadow-glow"></span> 歌手親筆數位簽名</li>
                            <li className="flex items-center gap-5"><span className="w-2 h-2 bg-brand-accent rounded-full shadow-glow"></span> 優先製作權限</li>
                        </ul>
                        <button className="w-full py-9 bg-brand-accent text-black font-black text-[11px] uppercase tracking-[0.8em] shadow-[0_0_50px_rgba(56,189,248,0.4)] hover:bg-white transition-all">
                            PREMIUM ACCESS
                        </button>
                    </div>

                    {/* Mode 3: SUPPORT */}
                    <div onClick={() => navigate('/interactive')} className="group relative bg-black/30 border border-white/5 p-16 flex flex-col items-start hover:border-white/30 hover:bg-black/70 transition-all duration-500 cursor-pointer rounded-sm backdrop-blur-3xl text-left hover:-translate-y-2">
                        <h3 className="text-white font-black text-[14px] uppercase tracking-[0.5em] mb-8">音樂食糧</h3>
                        <p className="text-slate-600 text-[11px] uppercase tracking-widest mb-14 font-bold">純粹創作能量挹注</p>
                        <div className="text-7xl font-black text-white mb-14 tracking-tighter">
                            <span className="text-lg font-normal mr-2 opacity-30">NT$</span>100
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-7 mb-20 uppercase tracking-widest flex-grow font-bold">
                            <li className="flex items-center gap-5">贊助一份錄音餐點</li>
                            <li className="flex items-center gap-5">支持獨立音樂發行</li>
                            <li className="flex items-center gap-5">創作者社群特別致謝</li>
                        </ul>
                        <button className="w-full py-8 border-2 border-white/10 text-slate-400 font-black text-[11px] uppercase tracking-[0.8em] group-hover:bg-white group-hover:text-black group-hover:border-white transition-all">
                            SUPPORT
                        </button>
                    </div>
                </div>

                {/* 獨家特輯區塊 (截圖紅框處) */}
                {globalSettings.exclusiveYoutubeUrl && (
                  <div className="mt-24 mb-10 animate-fade-in-up">
                    <a 
                      href={globalSettings.exclusiveYoutubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group block relative w-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-brand-gold/30 p-10 md:p-16 transition-all duration-700 rounded-sm"
                    >
                      <div className="flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
                        <div className="flex-1">
                          <span className="text-brand-gold font-black text-[10px] uppercase tracking-[0.6em] mb-4 block">Exclusive Release</span>
                          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter group-hover:text-brand-gold transition-colors">WATCH THE LATEST EXCLUSIVE</h2>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform bg-black/40">
                            <svg className="w-6 h-6 text-brand-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-colors">YOUTUBE MUSIC</span>
                        </div>
                      </div>
                      <div className="absolute top-5 right-10 text-white/5 group-hover:text-brand-gold/10 transition-colors text-6xl pointer-events-none select-none">❄</div>
                    </a>
                  </div>
                )}
            </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
