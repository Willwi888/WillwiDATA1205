
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs } = useData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  // UPC 分組邏輯
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
    <div className="animate-fade-in max-w-screen-2xl mx-auto px-10 pt-32 pb-60">
      <div className="mb-20">
           <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.6em] mb-4 block">Official Discography</span>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none">Catalog</h2>
      </div>

      <div className="max-w-4xl mb-24 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="SEARCH BY UPC / ISRC / TITLE..."
          className="flex-1 bg-white/5 border border-white/10 px-6 py-5 text-white outline-none text-xs font-bold uppercase tracking-widest focus:border-brand-gold transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="bg-white/5 text-slate-400 px-6 py-5 text-[10px] font-black uppercase tracking-widest outline-none border border-white/10" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-12">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              return (
                  <div key={main.id} onClick={() => navigate(`/song/${main.id}`)} className="group cursor-pointer">
                      <div className="aspect-square w-full relative overflow-hidden bg-slate-900 mb-6 border border-white/5 group-hover:border-brand-gold transition-all duration-500">
                          <img src={main.coverUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt="" />
                          <div className="absolute bottom-4 left-4">
                              <span className="text-[8px] font-black text-brand-gold bg-black/80 px-2 py-1 uppercase tracking-widest border border-brand-gold/20">
                                  {albumSongs.length > 1 ? `${albumSongs.length} TRACKS` : (main.releaseCategory || 'SINGLE')}
                              </span>
                          </div>
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase truncate tracking-widest group-hover:text-brand-gold transition-colors">{main.title}</h4>
                      <p className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-widest">{main.releaseDate.split('-')[0]} • {main.releaseCompany || 'WILLWI MUSIC'}</p>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; export default Database;
