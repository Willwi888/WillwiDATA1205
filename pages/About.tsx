
import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black text-slate-200 pt-32 pb-60 px-6 animate-fade-in relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10 text-center space-y-32">
        
        <div className="bg-[#050a14] border border-white/5 p-20 rounded-sm shadow-2xl space-y-16">
            <p className="text-slate-500 text-sm uppercase tracking-widest">這裡不是販售內容的地方，</p>
            <h2 className="text-4xl md:text-5xl font-medium text-white uppercase tracking-tight leading-relaxed">
                而是一個讓作品被好好完成、被理解的空間。
            </h2>
        </div>

        <div className="space-y-16">
            <span className="text-slate-600 font-medium uppercase tracking-[0.5em] text-[10px]">關注我們的動態</span>
            <div className="flex flex-wrap justify-center gap-6">
                {['WEBSITE', 'SPOTIFY', 'APPLE MUSIC', 'YOUTUBE', 'TIDAL'].map(channel => (
                    <a key={channel} href="#" className="px-12 py-5 border border-white/10 text-white text-[10px] font-medium uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded-sm">{channel}</a>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default About;
