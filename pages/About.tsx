
import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-32 pb-40 px-6 animate-fade-in relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/5 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-16 border-l-4 border-brand-gold pl-8 py-2">
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white mb-2 leading-none">About Willwi</h1>
            <p className="text-sm md:text-base text-brand-gold font-bold uppercase tracking-[0.4em] mt-4">Independent Musician • Creative Producer</p>
        </div>

        {/* FEATURED VIDEO SHOWCASE (Replaced Musixmatch block) */}
        <div className="mb-24 relative">
            <div className="aspect-video w-full bg-black border border-white/10 rounded-sm overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] group">
                {/* Featured Video Embed */}
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/videoseries?list=UUfO3p8G-yXvB8Z0vV_uG_WA" 
                    title="Willwi Official Film" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="opacity-70 group-hover:opacity-100 transition-opacity duration-1000"
                ></iframe>
                
                {/* Overlay Tag */}
                <div className="absolute top-6 left-6 pointer-events-none">
                    <span className="bg-brand-gold text-black text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-sm shadow-2xl">
                        Featured Film
                    </span>
                </div>
            </div>
            
            {/* Visual Support Info */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="max-w-md">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        DOCUMENTING THE EVOLUTION OF SOUND.<br/>
                        EXPLORE THE VISUAL NARRATIVE OF WILLWI'S CREATIVE JOURNEY.
                    </p>
                </div>
                <a 
                    href="https://www.youtube.com/@Willwi888" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-6 group border border-white/10 px-8 py-4 bg-white/5 hover:bg-white hover:text-black transition-all"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Subscribe on YouTube</span>
                    <span className="text-brand-gold group-hover:text-black text-lg">→</span>
                </a>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-24">
            {/* CHINESE SECTION */}
            <div className="space-y-10">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">創作定位</h3>
                    <p className="text-sm leading-loose text-slate-300 font-light text-justify">
                        Willwi（陳威兒）是一位以詞曲創作與音樂製作為核心的獨立音樂人，長期專注於以作品完成度與聲音敘事為中心的創作實踐。
                        <br/><br/>
                        其工作內容包含原創音樂發行、音樂製作，以及商業演出與專案型現場表演，演出以作品導向為主，並依合作需求參與品牌活動與各類專案。
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">公共交流</h3>
                    <p className="text-sm leading-loose text-slate-300 font-light text-justify">
                        在公共交流方面，曾受邀至四所大學進行演講與分享，主題涵蓋音樂創作、產業經驗與跨領域實務，與教育與知識分享性質之場域保持持續互動。
                    </p>
                </div>
            </div>

            {/* ENGLISH SECTION */}
            <div className="space-y-10">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Creative Positioning</h3>
                    <p className="text-xs leading-loose text-slate-400 font-medium text-justify tracking-wide">
                        Willwi (Chen Wei-Er) is an independent musician whose work centers on songwriting and music production, with a long-term focus on narrative-driven sound and the integrity of completed works.
                        <br/><br/>
                        His professional activities include original music releases, music production, as well as commercial performances and project-based live appearances, primarily oriented around the work itself.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-4">Exposure Strategy</h3>
                    <p className="text-xs leading-loose text-slate-400 font-medium text-justify tracking-wide">
                        Willwi’s career path does not prioritize traditional television or mainstream media exposure. He regards television and variety show appearances as professional roles belonging to performing artists. His public-facing work focuses instead on music creation, live performance projects, and collaborations.
                    </p>
                </div>
            </div>
        </div>

        {/* SOCIAL LINKS (MONOCHROME & FRAMED) */}
        <div className="border-t border-white/10 pt-16 text-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12">Official Distribution & Channels</h3>
            <div className="flex flex-wrap justify-center gap-4">
                <a href="https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4" target="_blank" rel="noreferrer" className="w-48 py-4 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-black hover:border-brand-gold transition-all">Spotify</a>
                <a href="https://music.apple.com/tw/artist/willwi/1798471457" target="_blank" rel="noreferrer" className="w-48 py-4 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-black hover:border-brand-gold transition-all">Apple Music</a>
                <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="w-48 py-4 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-black hover:border-brand-gold transition-all">YouTube</a>
                <a href="https://tidal.com/artist/54856609" target="_blank" rel="noreferrer" className="w-48 py-4 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-black hover:border-brand-gold transition-all">TIDAL</a>
            </div>
        </div>

      </div>
    </div>
  );
};

export default About;
