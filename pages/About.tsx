
import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-20 pb-20 px-6 animate-fade-in relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/5 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-16 border-l-4 border-brand-gold pl-8 py-2">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-2">About Willwi</h1>
            <p className="text-sm md:text-base text-brand-gold font-bold uppercase tracking-[0.3em]">Chen Wei-Er • Independent Musician</p>
        </div>

        {/* GLOBAL RECOGNITION (Minimal & Authoritative) */}
        <div className="mb-24 p-10 bg-gradient-to-br from-[#0f172a] to-black border border-white/10 rounded-sm relative overflow-hidden group shadow-2xl">
            {/* Decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-48 h-48 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14H15v-4.5l-2.5 4.5-2.5-4.5v4.5H8.5V8h2l1.5 2.7L13.5 8h2v8z"/></svg>
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                     <span className="w-2 h-2 bg-[#FF6050] rounded-full animate-pulse shadow-[0_0_10px_#FF6050]"></span>
                     <h3 className="text-[10px] font-black text-[#FF6050] uppercase tracking-[0.4em]">Global Recognition</h3>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 leading-tight">
                    Musixmatch <br /> Official Verified
                </h2>

                <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-[0.2em] mb-12 max-w-lg leading-relaxed">
                    Certified Identity within the Global Music Metadata Ecosystem.<br/>
                    Ensuring lyrical integrity and creative transparency across all platforms.
                </p>
                
                <a href="https://www.musixmatch.com/artist/Willwi-1798471457" target="_blank" rel="noreferrer" className="inline-flex items-center gap-6 group cursor-pointer border border-white/10 px-10 py-5 bg-white/5 hover:bg-white hover:text-black transition-all rounded-sm">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">View Verified Profile</span>
                    <span className="text-brand-gold group-hover:text-black text-lg">→</span>
                </a>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mb-20">
            
            {/* CHINESE SECTION */}
            <div className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">創作定位</h3>
                    <p className="text-sm leading-loose text-slate-300 font-light text-justify">
                        Willwi（陳威兒）是一位以詞曲創作與音樂製作為核心的獨立音樂人，長期專注於以作品完成度與聲音敘事為中心的創作實踐。
                        <br/><br/>
                        其工作內容包含原創音樂發行、音樂製作，以及商業演出與專案型現場表演，演出以作品導向為主，並依合作需求參與品牌活動與各類專案。
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">公共交流</h3>
                    <p className="text-sm leading-loose text-slate-300 font-light text-justify">
                        在公共交流方面，曾受邀至四所大學進行演講與分享，主題涵蓋音樂創作、產業經驗與跨領域實務，與教育與知識分享性質之場域保持持續互動。
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">曝光選擇</h3>
                    <p className="text-sm leading-loose text-slate-300 font-light text-justify">
                        Willwi 的發展路徑並未以傳統媒體或電視曝光作為主要方向。他將電視與綜藝型通告視為藝人表演的專業領域，因此不參與該類型曝光競逐；其公開活動重心放在作品本身、現場演出、專案合作與教育交流。
                        <br/><br/>
                        此定位源於對產業分工的尊重與個人創作節奏的選擇，而非能見度、資源或能力條件所致。
                    </p>
                </div>
            </div>

            {/* ENGLISH SECTION */}
            <div className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Creative Positioning</h3>
                    <p className="text-xs leading-loose text-slate-400 font-medium text-justify tracking-wide">
                        Willwi (Chen Wei-Er) is an independent musician whose work centers on songwriting and music production, with a long-term focus on narrative-driven sound and the integrity of completed works.
                        <br/><br/>
                        His professional activities include original music releases, music production, as well as commercial performances and project-based live appearances, primarily oriented around the work itself and tailored to brand events and commissioned projects.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Public Engagement</h3>
                    <p className="text-xs leading-loose text-slate-400 font-medium text-justify tracking-wide">
                        In the area of public engagement, he has been invited to speak at four universities, sharing experiences related to music creation, industry practice, and cross-disciplinary work in educational contexts.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Exposure Strategy</h3>
                    <p className="text-xs leading-loose text-slate-400 font-medium text-justify tracking-wide">
                        Willwi’s career path does not prioritize traditional television or mainstream media exposure. He regards television and variety show appearances as professional roles belonging to performing artists and therefore does not participate in that exposure-driven track. His public-facing work focuses instead on music creation, live performance projects, collaborations, and educational exchange.
                        <br/><br/>
                        This positioning reflects a deliberate professional choice and respect for industry roles, rather than limitations of visibility, access, or capability.
                    </p>
                </div>
            </div>
        </div>

        {/* SOCIAL LINKS (MONOCHROME & FRAMED) */}
        <div className="border-t border-white/10 pt-12 text-center">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] mb-8">Official Channels</h3>
            <div className="flex flex-wrap justify-center gap-4">
                <a href="https://willwi.com" target="_blank" rel="noreferrer" className="w-40 py-3 border border-slate-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">Website</a>
                <a href="https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4" target="_blank" rel="noreferrer" className="w-40 py-3 border border-slate-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">Spotify</a>
                <a href="https://music.apple.com/tw/artist/willwi/1798471457" target="_blank" rel="noreferrer" className="w-40 py-3 border border-slate-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">Apple Music</a>
                <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="w-40 py-3 border border-slate-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">YouTube</a>
                <a href="https://tidal.com/artist/54856609" target="_blank" rel="noreferrer" className="w-40 py-3 border border-slate-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all">TIDAL</a>
            </div>
        </div>

      </div>
    </div>
  );
};

export default About;
