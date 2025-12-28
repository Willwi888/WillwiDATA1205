
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
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-2">{t('about_title')}</h1>
            <p className="text-sm md:text-base text-brand-gold font-bold uppercase tracking-[0.3em]">{t('about_subtitle')}</p>
        </div>

        {/* Content Grid */}
        <div className="space-y-12 mb-20">
            <div className="space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">{t('about_section_1_title')}</h3>
                <p className="text-sm leading-loose text-slate-300 font-light text-justify whitespace-pre-line">
                    {t('about_section_1_content')}
                </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">{t('about_section_2_title')}</h3>
                <p className="text-sm leading-loose text-slate-300 font-light text-justify whitespace-pre-line">
                    {t('about_section_2_content')}
                </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">{t('about_section_3_title')}</h3>
                <p className="text-sm leading-loose text-slate-300 font-light text-justify whitespace-pre-line">
                    {t('about_section_3_content')}
                </p>
            </div>
        </div>

        {/* SOCIAL LINKS (MONOCHROME & FRAMED) */}
        <div className="border-t border-white/10 pt-12 text-center">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] mb-8">{t('about_social_title')}</h3>
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
