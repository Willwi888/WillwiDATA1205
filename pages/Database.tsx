
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs } = useData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  // UPC 聚合邏輯：策展核心 - 將相同 UPC 的單曲聚合為一張專輯
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    
    songs.forEach(song => {
      // 如果沒有 UPC，則視為獨立單曲 (以 ID 作為 GroupKey)
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
    <div className="animate-fade-in max-w-screen-2xl mx-auto px-10 pt-48 pb-60">
      <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-10">
           <div>
              <div className="flex items-center gap-6 mb-4">
                  <div className="w-12 h-[1px] bg-brand-gold"></div>
                  <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.6em]">Curated Discography</span>
              </div>
              <h2 className="text-8xl font-black text-white tracking-tighter uppercase leading-none">Catalog</h2>
           </div>
           <div className="text-right">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] block mb-2">Total Collections</span>
              <span className="text-4xl font-black text-white">{groupedAlbums.length}</span>
           </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-24 border-b border-white/10 pb-12">
        <div className="flex-1 relative">
            <input
              type="text"
              placeholder="SEARCH BY ALBUM UPC / ISRC / TITLE..."
              className="w-full bg-transparent border-none py-4 text-white outline-none text-2xl font-bold uppercase tracking-widest placeholder:text-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-brand-gold/40 to-transparent"></div>
        </div>
        <div className="flex items-center gap-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Region:</label>
            <select 
              className="bg-white/5 text-white font-black px-8 py-4 text-[11px] uppercase tracking-[0.3em] outline-none border border-white/10 focus:border-brand-gold transition-all rounded-sm appearance-none min-w-[200px]" 
              value={filterLang} 
              onChange={(e) => setFilterLang(e.target.value)}
            >
                <option value="All">All Regions</option>
                {Object.values(Language).map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
        </div>
      </div>

      {groupedAlbums.length === 0 ? (
        <div className="py-40 text-center">
            <p className="text-slate-600 font-black uppercase tracking-[1em]">No records found for current curation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-10 gap-y-20">
            {groupedAlbums.map(albumSongs => {
                const main = albumSongs[0];
                const isAlbum = albumSongs.length > 1;
                return (
                    <div key={main.id} onClick={() => navigate(`/song/${main.id}`)} className="group cursor-pointer">
                        <div className="aspect-square w-full relative overflow-hidden bg-slate-900 mb-8 border border-white/5 group-hover:border-brand-gold transition-all duration-700 shadow-2xl rounded-sm">
                            <img 
                              src={main.coverUrl} 
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[2s] ease-out" 
                              alt={main.title}
                            />
                            
                            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                <span className="text-[8px] font-black text-white bg-black/80 backdrop-blur-md px-3 py-1.5 uppercase tracking-widest border border-white/10">
                                    {isAlbum ? 'ALBUM' : (main.releaseCategory || 'SINGLE')}
                                </span>
                                {isAlbum && (
                                    <span className="text-[8px] font-black text-black bg-brand-gold px-3 py-1.5 uppercase tracking-widest">
                                        {albumSongs.length} Tracks
                                    </span>
                                )}
                            </div>

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-sm">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] border border-white/20 px-6 py-3 bg-black/40">Inspect Collection</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-lg font-black text-white uppercase truncate tracking-tight group-hover:text-brand-gold transition-colors duration-300">
                              {main.title}
                            </h4>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-brand-gold font-bold uppercase tracking-[0.2em]">{main.releaseDate.split('-')[0]}</span>
                                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{main.upc || 'NO UPC'}</span>
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
