
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
      <div className="mb-20">
           <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.8em] mb-6 block">OFFICIAL DISCOGRAPHY</span>
           <h2 className="text-[80px] md:text-[100px] font-medium text-white tracking-tighter uppercase leading-[0.8] mb-12">CATALOG</h2>
           <div className="flex gap-4">
              <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-slate-500 uppercase tracking-widest">TOTAL WORKS: {songs.length}</div>
           </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">
        <div className="md:col-span-8 relative">
            <input
              type="text"
              placeholder="SEARCH BY UPC / ISRC / TITLE"
              className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-xs font-light uppercase tracking-widest outline-none focus:border-brand-gold/40 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="md:col-span-4">
            <select className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-[10px] font-light uppercase tracking-widest outline-none cursor-pointer" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">All Languages</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-10 gap-y-20">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              const isAlbum = albumSongs.length > 1;
              const typeLabel = isAlbum ? 'ALBUM' : main.releaseCategory?.replace(' (單曲)', '').toUpperCase() || 'SINGLE';
              const cover = main.coverUrl || globalSettings.defaultCoverUrl;

              return (
                  <div key={main.id} className="group cursor-pointer">
                      <div className="aspect-square relative overflow-hidden bg-slate-900 border border-white/5 transition-all duration-500 group-hover:border-brand-gold/30 shadow-2xl rounded-sm">
                          <img 
                            src={cover} 
                            onClick={() => navigate(`/song/${main.id}`)}
                            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 group-hover:opacity-40" 
                            alt={main.title} 
                          />
                          
                          {/* Hover Tracklist Preview - 仿照串流頻道互動 */}
                          <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                              <div className="space-y-1.5 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                  {albumSongs.slice(0, 4).map((s, i) => (
                                      <div key={s.id} className="flex items-baseline gap-2">
                                          <span className="text-[8px] text-brand-gold font-mono opacity-60">0{i+1}</span>
                                          <span className="text-[10px] text-white font-light uppercase tracking-widest truncate">{s.title}</span>
                                      </div>
                                  ))}
                                  {albumSongs.length > 4 && <div className="text-[8px] text-slate-500 font-medium pt-2">+ {albumSongs.length - 4} MORE TRACKS</div>}
                              </div>
                          </div>

                          <div className="absolute bottom-4 left-4 group-hover:opacity-0 transition-opacity">
                              <span className="bg-black/80 backdrop-blur-md border border-white/10 text-white text-[9px] font-medium uppercase tracking-widest px-3 py-1.5">
                                  {typeLabel}
                              </span>
                          </div>
                      </div>
                      <div className="mt-6 space-y-1" onClick={() => navigate(`/song/${main.id}`)}>
                        <h4 className="text-[13px] font-medium text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors truncate">{main.title}</h4>
                        <p className="text-[10px] font-light text-white uppercase tracking-[0.2em] opacity-80">{typeLabel}</p>
                        <p className="text-[9px] text-slate-500 font-light uppercase tracking-widest">{main.releaseDate.split('-')[0]} • {main.releaseCompany || 'WILLWI MUSIC'}</p>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; 

export default Database;
