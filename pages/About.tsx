
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
