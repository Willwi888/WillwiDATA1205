
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, Song, ReleaseCategory } from '../types';

const Database: React.FC = () => {
  const { songs, globalSettings, playSong } = useData();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(song => {
      const normalizedUPC = song.upc ? normalizeIdentifier(song.upc) : '';
      const groupKey = normalizedUPC ? normalizedUPC : `SINGLE_${song.id}`;
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
    <div className="animate-fade-in max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black">
      {/* Catalog Header - Clean Typography */}
      <div className="mb-20">
           <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.8em] mb-6 block">OFFICIAL DISCOGRAPHY</span>
           <h2 className="text-[80px] md:text-[100px] font-medium text-white tracking-tighter uppercase leading-[0.8] mb-12">CATALOG</h2>
           <div className="flex gap-4">
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-slate-500 uppercase tracking-widest">TOTAL WORKS: {songs.length}</div>
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-slate-500 uppercase tracking-widest">DISPLAYING {groupedAlbums.length} ITEMS</div>
           </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">
        <div className="md:col-span-8 relative">
            <input
              type="text"
              placeholder="SEARCH BY UPC / ISRC / TITLE"
              className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-xs font-normal uppercase tracking-widest outline-none focus:border-brand-gold/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="md:col-span-4">
            <select className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-[10px] font-normal uppercase tracking-widest outline-none cursor-pointer" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">All Languages</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
      </div>

      {/* Album Grid - Exactly matching the screenshot style */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-20">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              const isEP = main.releaseCategory === ReleaseCategory.EP;
              const isAlbum = main.releaseCategory === ReleaseCategory.Album || albumSongs.length > 1;
              const typeLabel = isEP ? 'EP' : (isAlbum ? 'ALBUM' : 'SINGLE');
              const cover = main.coverUrl || globalSettings.defaultCoverUrl;

              return (
                  <div key={main.id} className="group cursor-pointer">
                      <div className="aspect-square relative overflow-hidden bg-slate-900 border border-white/5 transition-all duration-500 group-hover:border-brand-gold/30 shadow-2xl rounded-sm">
                          <img 
                            src={cover} 
                            onClick={() => navigate(`/song/${main.id}`)}
                            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" 
                            alt={main.title} 
                            onError={(e) => { (e.target as HTMLImageElement).src = globalSettings.defaultCoverUrl; }}
                          />
                          {/* Inner Type Label - As seen in screenshot */}
                          <div className="absolute bottom-4 left-4">
                              <span className="bg-black/80 backdrop-blur-md border border-white/10 text-white text-[9px] font-medium uppercase tracking-widest px-3 py-1.5">
                                  {typeLabel}
                              </span>
                          </div>
                          {/* Hover Play Toggle */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <button onClick={(e) => { e.stopPropagation(); playSong(main); }} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:bg-brand-gold transition-colors">
                                   <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                               </button>
                          </div>
                      </div>
                      {/* Metadata structure matching screenshot precisely */}
                      <div className="mt-6 space-y-1.5" onClick={() => navigate(`/song/${main.id}`)}>
                        <h4 className="text-[14px] font-medium text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors truncate">
                            {main.title}
                        </h4>
                        <p className="text-[10px] font-normal text-white uppercase tracking-[0.2em] opacity-90">
                            {typeLabel}
                        </p>
                        <p className="text-[9px] text-slate-500 font-normal uppercase tracking-widest opacity-80">
                            {main.releaseDate.split('-')[0]} • {typeLabel}
                        </p>
                        <p className="text-[8px] text-slate-700 font-mono tracking-widest mt-1 opacity-60">
                            ISRC: {main.isrc || 'UNKNOWN'}
                        </p>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; 

export default Database;
