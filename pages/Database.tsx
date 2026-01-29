
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, Song, ReleaseCategory } from '../types';

const Database: React.FC = () => {
  const { songs, playSong } = useData();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.isrc && s.isrc.includes(searchTerm)) ||
                           (s.upc && s.upc.includes(searchTerm));
      const matchesLang = filterLang === 'All' || s.language === filterLang;
      return matchesSearch && matchesLang;
    }).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="animate-fade-in max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-transparent">
      <div className="mb-20">
           <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.8em] mb-6 block">OFFICIAL DISCOGRAPHY</span>
           <h2 className="text-[80px] md:text-[100px] font-medium text-white tracking-tighter uppercase leading-[0.8] mb-12">CATALOG</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">
        <div className="md:col-span-8 relative">
            <input
              type="text"
              placeholder="搜尋作品名稱或 ISRC..."
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 px-8 py-6 text-white text-xs font-medium uppercase tracking-widest outline-none focus:border-brand-gold/40 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="md:col-span-4">
            <select className="w-full bg-white/5 backdrop-blur-md border border-white/10 px-8 py-6 text-white text-[10px] font-medium uppercase tracking-widest outline-none cursor-pointer" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">所有語言</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-20">
          {filteredSongs.map(song => (
              <div 
                key={song.id} 
                className="group cursor-pointer flex flex-col"
                onClick={() => navigate(`/song/${song.id}`)}
              >
                  <div className="aspect-square relative overflow-hidden bg-slate-900 mb-6 rounded-sm border border-white/5 group-hover:border-white/20 transition-all shadow-2xl">
                      <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/interactive`, { state: { targetSongId: song.id } }); }}
                            className="px-6 py-2 bg-white text-black text-[9px] font-medium uppercase tracking-widest hover:bg-brand-gold transition-all"
                          >
                              START LAB
                          </button>
                      </div>
                  </div>
                  <div className="space-y-1.5">
                      <h4 className="text-[15px] font-medium text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors truncate">{song.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{song.releaseCategory?.replace(' (單曲)', '') || 'SINGLE'}</p>
                      <p className="text-[9px] text-slate-600 font-mono tracking-widest">{song.releaseDate.split('-')[0]} • {song.releaseCategory?.replace(' (單曲)', '').toUpperCase() || 'SINGLE'}</p>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}; export default Database;
