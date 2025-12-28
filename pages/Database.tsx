import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, filterLang]);

  const handleStartSession = (songId: string) => {
      const s = songs.find(x => x.id === songId);
      if (!s?.isInteractiveActive && !isAdmin) {
          alert("此作品互動模組暫未對外開放。");
          return;
      }
      navigate('/interactive', { state: { targetSongId: songId } });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      <div className="mb-20 text-center">
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow">Selection Lobby</h2>
           <p className="text-slate-600 text-[10px] font-bold tracking-[0.8em] uppercase">選擇喜愛的作品，進入動態歌詞實驗室</p>
      </div>

      <div className="flex flex-col md:flex-row gap-px mb-16 bg-white/5 p-px border border-white/10">
        <input
          type="text"
          placeholder="SEARCH TRACK / ISRC..."
          className="flex-grow bg-black px-8 py-5 text-white outline-none text-sm font-black uppercase tracking-widest focus:bg-slate-900 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
            className="bg-black text-slate-400 px-8 py-5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white border-l border-white/10" 
            value={filterLang} 
            onChange={(e) => setFilterLang(e.target.value)}
        >
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1px bg-white/10 border border-white/10">
          {filteredSongs.map(song => (
              <div key={song.id} className="group relative bg-black p-8 transition-all hover:bg-slate-900/50">
                  <div className="flex flex-col gap-8 relative z-10">
                      <div className="aspect-square w-full relative overflow-hidden bg-slate-900 grayscale group-hover:grayscale-0 transition-all duration-700">
                          <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                               <button 
                                onClick={() => setActivePreviewId(activePreviewId === song.id ? null : song.id)}
                                className="w-14 h-14 bg-brand-gold text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
                               >
                                   {activePreviewId === song.id ? <div className="w-4 h-4 bg-black"></div> : <div className="w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-10 border-l-black ml-1"></div>}
                               </button>
                          </div>
                      </div>
                      
                      <div className="flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                               <span className="text-[9px] text-brand-gold font-black uppercase tracking-widest border border-brand-gold/30 px-2 py-0.5">{song.language}</span>
                               <span className="text-[9px] text-slate-600 font-mono">{song.releaseDate}</span>
                          </div>
                          <h4 className="text-2xl font-black text-white uppercase truncate mb-6 group-hover:text-brand-gold transition-colors">{song.title}</h4>
                          
                          <div className="flex gap-px bg-white/10">
                              <button 
                                onClick={() => handleStartSession(song.id)} 
                                className="flex-grow bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-gold transition-all"
                              >
                                  Start Lab
                              </button>
                              <button 
                                onClick={() => navigate(`/song/${song.id}`)} 
                                className="px-6 bg-slate-900 text-slate-400 py-4 text-[10px] font-black uppercase hover:text-white transition-all"
                              >
                                  Info
                              </button>
                          </div>
                      </div>
                  </div>

                  {activePreviewId === song.id && song.spotifyId && (
                      <div className="mt-8 animate-fade-in border-t border-white/10 pt-8">
                          <iframe 
                            src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`} 
                            width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"
                            className="grayscale contrast-125"
                          ></iframe>
                      </div>
                  )}
              </div>
          ))}
      </div>

      {filteredSongs.length === 0 && (
          <div className="py-60 text-center border border-white/10">
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[1em]">Empty Collection.</p>
          </div>
      )}
    </div>
  );
};

export default Database;