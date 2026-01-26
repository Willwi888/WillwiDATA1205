import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs } = useData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(song => {
      const groupKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });

    return Object.values(groups).filter(group => {
      const matchesSearch = group.some(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm))
      );
      const matchesLang = filterLang === 'All' || group.some(s => s.language === filterLang);
      return matchesSearch && matchesLang;
    }).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="max-w-screen-2xl mx-auto px-10 pt-48 pb-60 animate-fade-in">
      
      <div className="mb-24 space-y-16">
          <div className="flex items-end justify-between border-b border-white/5 pb-12">
            <h2 className="text-7xl md:text-9xl font-thin text-white tracking-tighter uppercase leading-none">Catalog</h2>
            <div className="text-right">
               <span className="text-[10px] uppercase tracking-[1em] text-white/20 block mb-2">Total Archives</span>
               <span className="text-4xl font-thin text-brand-gold">{groupedAlbums.length}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 w-full border-b border-white/10">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  className="w-full bg-transparent py-4 text-white outline-none text-2xl font-thin uppercase tracking-tight placeholder:text-white/5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* 橫式橫向濾鏡 */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
                <span className="text-[9px] uppercase tracking-widest text-white/20 whitespace-nowrap">Region:</span>
                <div className="flex gap-4">
                    {['All', ...Object.values(Language)].map(l => (
                        <button 
                            key={l}
                            onClick={() => setFilterLang(l)}
                            className={`text-[9px] uppercase tracking-widest px-4 py-1 border transition-all whitespace-nowrap ${filterLang === l ? 'border-brand-gold text-brand-gold' : 'border-white/5 text-white/20 hover:text-white'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-10 gap-y-20">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              return (
                  <div key={main.id} onClick={() => navigate(`/song/${main.id}`)} className="group cursor-pointer">
                      <div className="aspect-square w-full relative overflow-hidden border border-white/5 group-hover:border-brand-gold transition-all duration-700 bg-white/[0.01]">
                          <img src={main.coverUrl} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s]" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-sm transition-all duration-500">
                             <span className="text-[9px] uppercase tracking-[1em] border border-white/20 px-6 py-3">Open</span>
                          </div>
                      </div>
                      <div className="mt-8 space-y-2">
                          <h4 className="text-xl font-thin uppercase tracking-tight truncate group-hover:text-brand-gold transition-colors">{main.title}</h4>
                          <div className="flex items-center gap-4 text-[9px] font-mono text-white/20">
                              <span>{main.releaseDate.split('-')[0]}</span>
                              <span className="truncate">{main.upc || 'NO UPC'}</span>
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; export default Database;