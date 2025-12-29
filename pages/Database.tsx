
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language } from '../types';
import { useTranslation } from '../context/LanguageContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-16 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
           <div>
               <h2 className="text-6xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow">音樂作品庫</h2>
               <p className="text-slate-600 text-[10px] font-bold tracking-[0.5em] uppercase">The Official Willwi Discography</p>
           </div>
           
           <div className="flex flex-col md:flex-row gap-px bg-white/5 p-px border border-white/10 w-full md:w-auto">
                <input
                    type="text"
                    placeholder="搜尋歌名 / ISRC..."
                    className="bg-black px-6 py-4 text-white outline-none text-[10px] font-black uppercase tracking-widest focus:bg-slate-900 transition-all w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                    className="bg-black text-slate-400 px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white border-l border-white/10" 
                    value={filterLang} 
                    onChange={(e) => setFilterLang(e.target.value)}
                >
                    <option value="All">所有語言</option>
                    {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
           </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredSongs.map(song => (
              <div 
                key={song.id} 
                className="group relative bg-slate-900/20 border border-white/5 p-5 transition-all hover:bg-white/[0.03] hover:border-brand-gold/20 flex flex-col h-full cursor-pointer shadow-lg"
                onClick={() => navigate(`/song/${song.id}`)}
              >
                  {/* Artwork Container */}
                  <div className="aspect-square w-full relative overflow-hidden mb-6 bg-black shadow-2xl">
                      <img src={song.coverUrl} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                      
                      {/* Quick Action Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                           <span className="text-[8px] text-brand-gold font-black uppercase tracking-widest border border-brand-gold/30 px-2 py-0.5 rounded-sm">{song.language}</span>
                           <span className="text-[8px] text-slate-600 font-mono">{song.releaseDate.split('-')[0]}</span>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase truncate mb-1 group-hover:text-brand-gold transition-colors">{song.title}</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-6 font-bold">{song.releaseCompany || 'Independent Release'}</p>
                      
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                              {song.releaseCategory}
                          </span>
                          <svg className="w-3 h-3 text-slate-600 group-hover:text-brand-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {filteredSongs.length === 0 && (
          <div className="py-40 text-center border border-dashed border-white/10 rounded-xl">
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em]">此分類目前尚無作品</p>
          </div>
      )}
    </div>
  );
};

export default Database;
