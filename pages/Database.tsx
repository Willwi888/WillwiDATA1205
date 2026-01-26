
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs } = useData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  // UPC 聚合邏輯：將相同 UPC 的單曲聚合為一張專輯
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    
    songs.forEach(song => {
      // 聚合規則：如果有 UPC 則以 UPC 為準，否則視為獨立單曲
      const groupKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });

    return Object.values(groups).filter(group => {
      const matchesSearch = group.some(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
      );
      const matchesLang = filterLang === 'All' || group.some(s => s.language === filterLang);
      return matchesSearch && matchesLang;
    }).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="animate-fade-in max-w-screen-2xl mx-auto px-10 pt-56 pb-60 font-sans">
      <div className="mb-32 flex flex-col md:flex-row justify-between items-end gap-12">
           <div>
              <div className="flex items-center gap-8 mb-6">
                  <div className="w-16 h-[0.5px] bg-brand-gold opacity-40"></div>
                  <span className="text-brand-gold font-thin text-[10px] uppercase tracking-[1em]">Authority Catalog</span>
              </div>
              <h2 className="text-8xl md:text-11xl font-thin text-white tracking-tighter uppercase leading-[0.8]">Discography</h2>
           </div>
           <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-thin text-slate-700 uppercase tracking-[0.8em] block mb-4">Master Archives</span>
              <span className="text-5xl font-thin text-white tracking-tighter">{groupedAlbums.length}</span>
           </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10 mb-32 border-b border-white/5 pb-16">
        <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="SEARCH BY UPC / ISRC / TITLE..."
              className="w-full bg-transparent border-none py-6 text-white outline-none text-2xl md:text-4xl font-thin uppercase tracking-tighter placeholder:text-white/5 focus:placeholder:text-white/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-brand-gold group-focus-within:w-full transition-all duration-1000"></div>
        </div>
        <div className="flex items-center gap-8">
            <label className="text-[10px] font-thin text-slate-600 uppercase tracking-widest">Region:</label>
            <select 
              className="bg-white/5 text-white font-thin px-10 py-5 text-[11px] uppercase tracking-[0.4em] outline-none border border-white/5 focus:border-brand-gold transition-all appearance-none min-w-[240px]" 
              value={filterLang} 
              onChange={(e) => setFilterLang(e.target.value)}
            >
                <option value="All">Global Manifest</option>
                {Object.values(Language).map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
        </div>
      </div>

      {groupedAlbums.length === 0 ? (
        <div className="py-60 text-center">
            <p className="text-slate-700 font-thin uppercase tracking-[1.5em] animate-pulse">NO RECORDS_FOUND_IN_MANIFEST</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-12 gap-y-24">
            {groupedAlbums.map(albumSongs => {
                const main = albumSongs[0];
                const isAlbum = albumSongs.length > 1;
                return (
                    <div key={main.id} onClick={() => navigate(`/song/${main.id}`)} className="group cursor-pointer">
                        <div className="aspect-square w-full relative overflow-hidden bg-slate-900 mb-10 border border-white/5 group-hover:border-brand-gold transition-all duration-1000 shadow-2xl">
                            <img 
                              src={main.coverUrl} 
                              className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s] ease-out" 
                              alt={main.title}
                            />
                            
                            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                                <span className="text-[8px] font-thin text-white bg-black/60 backdrop-blur-md px-4 py-2 uppercase tracking-[0.2em] border border-white/10">
                                    {isAlbum ? 'ALBUM' : (main.releaseCategory || 'SINGLE')}
                                </span>
                            </div>

                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="text-[9px] font-thin text-white uppercase tracking-[1em] border border-white/10 px-8 py-4 bg-black/60">OPEN_COLLECTION</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xl font-thin text-white uppercase truncate tracking-tight group-hover:text-brand-gold transition-colors duration-700">
                              {main.title}
                            </h4>
                            <div className="flex items-center gap-5">
                                <span className="text-[10px] text-brand-gold font-thin uppercase tracking-[0.2em]">{main.releaseDate.split('-')[0]}</span>
                                <div className="w-[0.5px] h-3 bg-white/10"></div>
                                <span className="text-[9px] text-slate-600 font-mono tracking-widest truncate">{main.upc || 'NO_UPC'}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}; export default Database;
