
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { Language, Song, ReleaseCategory } from '../types';

const Database: React.FC = () => {
  const { songs, globalSettings, isSyncing, refreshData } = useData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  
  const tracklistRef = useRef<HTMLDivElement>(null);

  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(song => {
      const normalizedUPC = song.upc ? normalizeIdentifier(song.upc) : '';
      const groupKey = normalizedUPC ? `ALBUM_${normalizedUPC}` : `SINGLE_${song.id}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });

    return Object.entries(groups).filter(([_, group]) => {
      const matchesSearch = group.some(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
      );
      const matchesLang = filterLang === 'All' || group.some(s => s.language === filterLang);
      return matchesSearch && matchesLang;
    }).sort((a, b) => new Date(b[1][0].releaseDate).getTime() - new Date(a[1][0].releaseDate).getTime());
  }, [songs, searchTerm, filterLang]);

  // 預設展開黑灰色專輯 (UPC: WILLWI20251222)
  useEffect(() => {
      if (songs.length > 0 && !selectedAlbumId && !searchTerm) {
          const targetUPC = 'WILLWI20251222';
          const album = groupedAlbums.find(([key]) => key.includes(targetUPC));
          if (album) {
              setSelectedAlbumId(album[0]);
          }
      }
  }, [songs, groupedAlbums, searchTerm, selectedAlbumId]);

  const handleAlbumClick = (groupKey: string) => {
      if (selectedAlbumId === groupKey) {
          setSelectedAlbumId(null);
      } else {
          setSelectedAlbumId(groupKey);
          setTimeout(() => tracklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
  };

  const currentAlbumSongs = useMemo(() => {
      if (!selectedAlbumId) return [];
      const album = groupedAlbums.find(([key]) => key === selectedAlbumId);
      return album ? album[1].sort((a, b) => (a.isrc || '').localeCompare(b.isrc || '')) : [];
  }, [selectedAlbumId, groupedAlbums]);

  return (
    <div className="animate-fade-in max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black">
      <div className="mb-20 flex flex-col md:flex-row justify-between items-end gap-10">
           <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.8em] mb-6 block">OFFICIAL ARCHIVE</span>
              <h2 className="text-[80px] md:text-[100px] font-medium text-white tracking-tighter uppercase leading-[0.8]">DATABASE</h2>
           </div>
           <div className="flex gap-4 mb-4">
              <button 
                onClick={() => refreshData()} 
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isSyncing ? 'border-brand-gold text-brand-gold animate-pulse' : 'border-white/10 text-slate-500 hover:border-white hover:text-white'}`}
              >
                  {isSyncing ? 'Syncing...' : 'Cloud Refreshed'}
              </button>
           </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">
        <div className="md:col-span-8 relative">
            <input
              type="text"
              placeholder="搜尋條碼 (UPC) / ISRC / 作品名稱"
              className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-xs font-light uppercase tracking-widest outline-none focus:border-brand-gold/40 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="md:col-span-4">
            <select className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-[10px] font-light uppercase tracking-widest outline-none cursor-pointer" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">所有語系</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
      </div>

      {selectedAlbumId && currentAlbumSongs.length > 0 && (
          <div ref={tracklistRef} className="mb-24 bg-[#050a14] border border-white/10 rounded-sm p-8 md:p-16 animate-blur-in shadow-2xl relative">
              <button onClick={() => setSelectedAlbumId(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white uppercase text-[10px] font-bold tracking-widest transition-all">✕ 關閉</button>
              
              <div className="flex flex-col lg:flex-row gap-20">
                  <div className="w-full lg:w-96 shrink-0">
                      <img src={currentAlbumSongs[0].coverUrl || globalSettings.defaultCoverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="" />
                      <div className="mt-10 space-y-6 pt-10 border-t border-white/5 text-[10px] uppercase tracking-widest">
                          <div className="flex justify-between"><span className="text-slate-500">Record Label</span><span className="text-white">Willwi Music</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Release Date</span><span className="text-white">{currentAlbumSongs[0].releaseDate}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">UPC</span><span className="text-brand-gold font-mono">{currentAlbumSongs[0].upc || 'N/A'}</span></div>
                      </div>
                  </div>

                  <div className="flex-1">
                      <div className="mb-12">
                          <h3 className="text-4xl md:text-6xl text-white font-medium uppercase tracking-tighter leading-none mb-4">{currentAlbumSongs[0].title}</h3>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Track list & Metadata Status</p>
                      </div>

                      <div className="space-y-1">
                          {currentAlbumSongs.map((track, idx) => {
                              const isSynced = track.lyrics && track.lyrics.includes('[');
                              return (
                                <div key={track.id} className="group flex flex-col md:flex-row md:items-center justify-between py-5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all px-4 cursor-pointer" onClick={() => navigate(`/song/${track.id}`)}>
                                    <div className="flex items-center gap-8">
                                        <span className="text-slate-700 font-mono text-[11px] w-6">{idx + 1}</span>
                                        <span className="text-base text-white font-medium uppercase tracking-widest group-hover:text-brand-gold transition-colors">{track.title}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-sm border ${track.lyrics ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-800 border-white/5'}`}>Plain Lyrics</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-sm border ${isSynced ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-800 border-white/5'}`}>Synced Lyrics</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-sm border ${track.credits ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-800 border-white/5'}`}>Credits</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-sm border ${track.audioUrl ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-800 border-white/5'}`}>Audio Ref</span>
                                        <span className="text-brand-gold font-mono text-[10px] ml-4">{track.isrc}</span>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-12 gap-y-24">
          {groupedAlbums.map(([groupKey, albumSongs]) => {
              const main = albumSongs[0];
              const isSelected = selectedAlbumId === groupKey;
              const cover = main.coverUrl || globalSettings.defaultCoverUrl;

              return (
                  <div key={groupKey} className={`group cursor-pointer transition-all duration-700 ${isSelected ? 'opacity-20 scale-95' : 'hover:scale-105'}`} onClick={() => handleAlbumClick(groupKey)}>
                      <div className="aspect-square relative overflow-hidden bg-slate-900 border border-white/5 transition-all duration-700 group-hover:border-brand-gold/40 shadow-2xl rounded-sm">
                          <img src={cover} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={main.title} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <span className="text-[10px] text-white font-black uppercase tracking-[0.4em] border border-white/20 px-6 py-3 bg-black/40 backdrop-blur-xl">
                                  {albumSongs.length > 1 ? `收錄 ${albumSongs.length} 首` : '查看作品資訊'}
                              </span>
                          </div>
                      </div>
                      <div className="mt-8 space-y-2">
                        <h4 className="text-[15px] font-medium text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors truncate">{main.title}</h4>
                        <p className="text-[9px] text-slate-600 font-light uppercase tracking-widest">{main.releaseDate.split('-')[0]} • {main.releaseCompany || 'WILLWI MUSIC'}</p>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; 

export default Database;
