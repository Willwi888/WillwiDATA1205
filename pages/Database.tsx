
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Language, Song } from '../types';

const Database: React.FC = () => {
  const { songs, globalSettings, playSong, currentSong, isPlaying } = useData();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  /**
   * 優化後的分組邏輯
   * 1. 優先使用 UPC 分組。
   * 2. 若無 UPC 或 UPC 僅包含空格，則將每首作品視為獨立個體，避免錯誤合併。
   * 3. 確保展示所有 79 首作品。
   */
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    
    songs.forEach(song => {
      const normalizedUPC = song.upc ? normalizeIdentifier(song.upc) : '';
      
      // 如果 UPC 經過標準化後為空，則使用該歌曲的唯一 ID 作為 Key，確保它獨立顯示
      const groupKey = normalizedUPC 
        ? normalizedUPC 
        : `SINGLE_TRACK_${song.id}`;

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
    }).sort((a, b) => {
        // 排序優先級：發行日期 (新 -> 舊) > 標題
        const dateA = new Date(a[0].releaseDate).getTime();
        const dateB = new Date(b[0].releaseDate).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return a[0].title.localeCompare(b[0].title);
    });
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="animate-fade-in max-w-screen-2xl mx-auto px-10 pt-32 pb-60">
      <div className="mb-20">
           <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.6em] mb-4 block">Official Discography</span>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-none">Catalog</h2>
           <div className="mt-6 flex items-center gap-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                Total Works: <span className="text-brand-gold">{songs.length}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                Displaying {groupedAlbums.length} {groupedAlbums.length === songs.length ? 'Items' : 'Groups'}
              </span>
           </div>
      </div>

      <div className="max-w-4xl mb-24 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <input
              type="text"
              placeholder="SEARCH BY UPC / ISRC / TITLE..."
              className="w-full bg-white/5 border border-white/20 px-6 py-5 text-white outline-none text-xs font-bold uppercase tracking-widest focus:border-brand-gold transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px] font-black uppercase">Clear</button>
            )}
        </div>
        <select className="bg-white/5 text-white font-black px-6 py-5 text-[10px] uppercase tracking-widest outline-none border border-white/20" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {groupedAlbums.length === 0 ? (
          <div className="py-40 text-center">
              <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-sm italic">No records matching your search</p>
          </div>
      ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-16">
              {groupedAlbums.map(albumSongs => {
                  const main = albumSongs[0];
                  let label = 'SINGLE';
                  
                  // 判斷類型標籤
                  if (main.releaseCategory) {
                      label = main.releaseCategory.split(' ')[0].toUpperCase();
                  } else if (albumSongs.length > 1) {
                      label = 'ALBUM';
                  }
                  
                  const cover = main.coverUrl || globalSettings.defaultCoverUrl;
                  const isCurrentPlaying = currentSong?.id === main.id;

                  return (
                      <div key={main.id} className="group cursor-pointer">
                          <div className="aspect-square w-full relative overflow-hidden bg-slate-900 mb-5 border border-white/10 group-hover:border-brand-gold transition-all duration-500 shadow-2xl rounded-sm">
                              <img 
                                src={cover} 
                                onClick={() => navigate(`/song/${main.id}`)}
                                className="w-full h-full object-cover opacity-100 grayscale-0 transition-all duration-700 group-hover:scale-105" 
                                alt={main.title} 
                                onError={(e) => { (e.target as HTMLImageElement).src = globalSettings.defaultCoverUrl; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-60"></div>
                              
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

                              <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col gap-1 items-start">
                                  <span className="text-[9px] font-black text-white bg-black/90 px-3 py-1 uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-lg w-fit">
                                      {label}
                                  </span>
                                  {albumSongs.length > 1 && (
                                      <span className="text-[8px] font-black text-brand-gold bg-black/90 px-2 py-0.5 uppercase tracking-widest border border-brand-gold/20 backdrop-blur-md shadow-lg w-fit">
                                          {albumSongs.length} Tracks
                                      </span>
                                  )}
                              </div>
                          </div>
                          <div onClick={() => navigate(`/song/${main.id}`)}>
                            <h4 className="text-sm font-bold text-white uppercase truncate tracking-widest group-hover:text-brand-gold transition-colors">{main.title}</h4>
                            <div className="flex flex-col gap-1 mt-2">
                                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold opacity-80">
                                    {main.releaseDate.split('-')[0]} • {main.releaseCompany || 'WILLWI MUSIC'}
                                </p>
                                <div className="space-y-0.5 mt-1">
                                    {main.isrc && (
                                        <p className="text-[9px] text-brand-gold/70 font-mono uppercase tracking-widest font-bold">
                                            ISRC: {main.isrc}
                                        </p>
                                    )}
                                    {main.upc && (
                                        <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest font-bold">
                                            UPC: {main.upc}
                                        </p>
                                    )}
                                </div>
                            </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}; 

export default Database;
