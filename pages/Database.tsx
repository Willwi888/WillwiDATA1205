
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs, globalSettings, playSong, currentSong, isPlaying } = useData();
  const { isAdmin } = useUser(); // 引入權限檢查
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
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
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
          className="flex-1 bg-white/5 border border-white/20 px-6 py-5 text-white outline-none text-xs font-bold uppercase tracking-widest focus:border-brand-gold transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="bg-white/5 text-white font-black px-6 py-5 text-[10px] uppercase tracking-widest outline-none border border-white/20" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-16">
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              // Determine label: Prefer releaseCategory, fallback to track count logic
              let label = 'SINGLE';
              if (main.releaseCategory) {
                  // Simplify string "Album (專輯)" to "ALBUM"
                  label = main.releaseCategory.split(' ')[0].toUpperCase();
              } else if (albumSongs.length > 1) {
                  label = 'ALBUM';
              }
              
              const cover = main.coverUrl || globalSettings.defaultCoverUrl;
              const isCurrentPlaying = currentSong?.id === main.id;

              return (
                  <div key={main.id} className="group cursor-pointer">
                      <div className="aspect-square w-full relative overflow-hidden bg-slate-900 mb-5 border border-white/10 group-hover:border-brand-gold transition-all duration-500 shadow-2xl rounded-sm">
                          {/* Real Album Cover Presentation */}
                          <img 
                            src={cover} 
                            onClick={() => navigate(`/song/${main.id}`)}
                            className="w-full h-full object-cover opacity-100 grayscale-0 transition-all duration-700 group-hover:scale-105" 
                            alt={main.title} 
                          />
                          {/* Subtle gradient for tag visibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-60"></div>
                          
                          {/* Play Button Overlay - ONLY FOR ADMIN */}
                          {isAdmin && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); playSong(main); }}
                                    className="w-14 h-14 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-[0_0_30px_#fbbf24] hover:scale-110 transition-transform active:scale-95"
                                >
                                    {isCurrentPlaying && isPlaying ? (
                                        <svg className="w-5 h-5 ml-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    ) : (
                                        <svg className="w-6 h-6 ml-[3px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    )}
                                </button>
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 pointer-events-none">
                              <span className="text-[9px] font-black text-white bg-black/90 px-3 py-1 uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-lg">
                                  {label}
                              </span>
                          </div>
                      </div>
                      <div onClick={() => navigate(`/song/${main.id}`)}>
                        <h4 className="text-sm font-bold text-white uppercase truncate tracking-widest group-hover:text-brand-gold transition-colors">{main.title}</h4>
                        <div className="flex flex-col gap-1 mt-2">
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold opacity-80">
                                {main.releaseDate.split('-')[0]} • {main.releaseCompany || 'WILLWI MUSIC'}
                            </p>
                            {main.upc && (
                                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest font-bold">
                                    UPC: {main.upc}
                                </p>
                            )}
                        </div>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; 

export default Database;
