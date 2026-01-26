
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
      const groupKey = song.upc ? normalizeIdentifier(song.upc) : `SGL_${normalizeIdentifier(song.id)}`;
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
    <div className="min-h-screen bg-black pt-48 px-10 lg:px-24 pb-60">
      <div className="mb-24 flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-white/5 pb-16 gap-8">
           <div className="space-y-4">
              <span className="text-brand-accent/60 text-[10px] font-bold uppercase tracking-[1em]">Master Curation</span>
              <h2 className="text-5xl lg:text-8xl font-black text-white tracking-tighter uppercase leading-none">Global Registry</h2>
           </div>
           <div className="text-right">
              <span className="text-[10px] text-white/20 uppercase tracking-widest mb-2 block">Identified Assets</span>
              <span className="text-5xl text-white/40 font-thin font-mono leading-none">{groupedAlbums.length}</span>
           </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-24 items-center bg-white/[0.02] p-8 border border-white/5">
          <div className="flex-1 relative w-full">
            <input
                type="text"
                placeholder="SEARCH REGISTRY (TITLE, ISRC, UPC)..."
                className="w-full bg-transparent border-b border-white/10 py-3 text-white font-thin outline-none text-base uppercase tracking-widest placeholder:text-white/5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="w-full md:w-auto bg-transparent text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] outline-none cursor-pointer border border-white/10 px-6 py-3" 
            value={filterLang} 
            onChange={(e) => setFilterLang(e.target.value)}
          >
              <option value="All">All Regions</option>
              {Object.values(Language).map(l => <option key={l} value={l} className="bg-black">{l}</option>)}
          </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-20">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              return (
                  <div key={main.id} onClick={() => navigate(`/song/${main.id}`)} className="group cursor-pointer">
                      <div className="aspect-square bg-slate-900 border border-white/10 mb-6 overflow-hidden relative">
                          <img 
                            src={main.coverUrl} 
                            className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700" 
                            alt=""
                          />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-[7px] text-brand-accent border border-brand-accent/20 uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              {main.isrc ? 'ISRC_VERIFIED' : 'PENDING'}
                          </div>
                      </div>
                      <div className="space-y-1">
                          <h4 className="text-[11px] text-white/30 uppercase tracking-widest group-hover:text-brand-accent transition-colors truncate">
                            {main.title}
                          </h4>
                          <div className="flex justify-between items-center text-[8px] font-mono text-white/5 group-hover:text-white/10 tracking-widest uppercase">
                            <span>{main.releaseDate.split('-')[0]}</span>
                            <span>{main.language}</span>
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; export default Database;
