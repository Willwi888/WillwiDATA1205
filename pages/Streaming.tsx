
import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const Streaming: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      {/* Page Header */}
      <div className="mb-20 text-center relative">
           <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
           <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">
             {t('streaming_title')}
           </h2>
           <p className="text-slate-600 text-[10px] font-bold tracking-[1em] uppercase relative z-10">
             {t('streaming_subtitle')}
           </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT: YouTube Exclusive Zone (7/12 width) - 官網獨家影音 */}
        <div className="lg:col-span-7 space-y-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        {t('streaming_youtube_title')}
                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest animate-pulse">
                          EXCLUSIVE
                        </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{t('streaming_youtube_desc')}</p>
                </div>
                <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/30">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </div>
            </div>

            {/* Featured Video Player */}
            <div className="relative group bg-slate-900 border border-white/10 overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 hover:border-red-600/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/Hsc1T0lVq-o?rel=0&showinfo=0&modestbranding=1" 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        className="opacity-90 group-hover:opacity-100 transition-opacity"
                    ></iframe>
                </div>
                
                <div className="p-10 bg-gradient-to-b from-slate-900 to-black">
                    <h4 className="text-2xl font-black text-white uppercase mb-4 leading-tight group-hover:text-red-500 transition-colors">
                      Latest Official Release
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xl font-light">
                      這是 Willwi 為官網聽眾準備的獨家視聽專區。您可以直接在此觀看最新 MV，或點擊下方按鈕訂閱官方頻道以獲得更多第一手創作動態。
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <a 
                          href="https://www.youtube.com/@Willwi888?sub_confirmation=1" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-10 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all shadow-lg rounded-full"
                        >
                          {t('streaming_btn_subscribe')}
                        </a>
                        <a 
                          href="https://www.youtube.com/@Willwi888/videos" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-8 py-4 border border-white/10 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all rounded-full"
                        >
                          BROWSE ALL VIDEOS
                        </a>
                    </div>
                </div>
                
                {/* Metallic Shine Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </div>
            </div>

            {/* Playlist Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                    { id: 'PL1', title: 'Music Videos', count: 'Official MV', desc: '高品質視覺影像與故事呈現。', link: 'https://www.youtube.com/@Willwi888' },
                    { id: 'PL2', title: 'Live Performance', count: 'Live Session', desc: '現場演出的純粹能量。', link: 'https://www.youtube.com/@Willwi888' },
                    { id: 'PL3', title: 'Behind Scenes', count: 'Studio Vlog', desc: '創作幕後錄音與製作紀實。', link: 'https://www.youtube.com/@Willwi888' },
                    { id: 'PL4', title: 'Short Clips', count: 'Exclusive Clips', desc: '官網限定短篇創作片段。', link: 'https://www.youtube.com/@Willwi888' }
                ].map((item) => (
                    <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="p-8 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-red-600/30 transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-red-500 transition-colors">{item.count}</span>
                            <svg className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                        <h5 className="text-lg font-black text-white uppercase mb-2">{item.title}</h5>
                        <p className="text-xs text-slate-500 leading-relaxed mt-auto font-light">{item.desc}</p>
                    </a>
                ))}
            </div>
        </div>

        {/* RIGHT: Spotify Audition Hub (5/12 width) - 嵌入式播放器 */}
        <div className="lg:col-span-5 space-y-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight">{t('streaming_spotify_title')}</h3>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">{t('streaming_spotify_desc')}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 4-.9 7.4-.5 10.3 1.3.2.1.3.5.2.6zm1.5-3.3c-.3.4-.8.5-1.1.3-2.9-1.8-7.2-2.3-10.6-1.3-.4.1-.9-.1-1-.6-.1-.4.1-.9.6-1 3.9-1.2 8.7-.6 12 1.5.4.2.5.7.1 1.1zm.1-3.4C15.6 8.3 9.7 8.1 6.3 9.1c-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-.9 10.5-.7 14.5 1.7.5.3.6.9.3 1.3-.2.5-.8.6-1.3.4z"/>
                  </svg>
                </div>
            </div>

            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-6 group transition-all duration-700 hover:border-emerald-500/40 relative">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <iframe 
                    src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
                    width="100%" 
                    height="700" 
                    frameBorder="0" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    className="rounded-2xl grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 relative z-10"
                ></iframe>
                
                <div className="mt-8 text-center px-6 relative z-10">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-4">Official Discovery Player</p>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      在此可預覽 Willwi 的所有數位發行。歡迎跟隨歌手，將您喜愛的曲目加入播放清單。
                    </p>
                </div>
            </div>
            
            {/* Extended Platform Links */}
            <div className="space-y-4">
                {[
                    { label: 'Apple Music', link: 'https://music.apple.com/tw/artist/willwi/1798471457', color: 'bg-white text-black hover:bg-slate-200' },
                    { label: 'TIDAL High-Res', link: 'https://tidal.com/artist/54856609', color: 'bg-slate-800 text-white hover:bg-white hover:text-black border border-white/10' },
                    { label: 'YouTube Music', link: 'https://www.youtube.com/@Willwi888', color: 'bg-red-900/20 text-red-500 border border-red-900/30 hover:bg-red-600 hover:text-white' }
                ].map((btn, i) => (
                    <a key={i} href={btn.link} target="_blank" rel="noreferrer" className={`block w-full py-5 text-center font-black text-[10px] uppercase tracking-[0.5em] transition-all rounded-sm shadow-xl ${btn.color}`}>
                        {btn.label}
                    </a>
                ))}
            </div>
        </div>

      </div>

      {/* Brand Footer Message */}
      <div className="mt-32 pt-20 border-t border-white/5 text-center max-w-2xl mx-auto">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[1em] mb-4 opacity-50">Willwi Studio Media Hub</p>
          <p className="text-slate-500 text-xs italic font-light opacity-80 leading-relaxed">
            "創作不僅是聲音的排列，更是靈魂與世界的共鳴。感謝您在此停留與聆聽。"
          </p>
      </div>
    </div>
  );
};

export default Streaming;
