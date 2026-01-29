
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
              placeholder="搜尋作品名稱或 ISRC..."
              className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-xs font-medium uppercase tracking-widest outline-none focus:border-brand-gold/40 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="md:col-span-4">
            <select className="w-full bg-slate-900/40 border border-white/5 px-8 py-6 text-white text-[10px] font-medium uppercase tracking-widest outline-none cursor-pointer" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">所有語言</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
      </div>

      <div className="space-y-6">
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-white/5 text-[10px] font-medium text-slate-500 uppercase tracking-widest border-b border-white/10">
              <div className="col-span-1">PREVIEW</div>
              <div className="col-span-3">作品名稱</div>
              <div className="col-span-2 text-center">ISRC</div>
              <div className="col-span-1 text-center">發行類別</div>
              <div className="col-span-1 text-center">語系</div>
              <div className="col-span-1 text-center">日期</div>
              <div className="col-span-1 text-center">發行公司</div>
              <div className="col-span-2 text-right">ACTIONS</div>
          </div>
          
          {groupedAlbums.map(albumSongs => {
              const main = albumSongs[0];
              const isAlbum = albumSongs.length > 1;
              const typeLabel = isAlbum ? 'ALBUM' : main.releaseCategory?.replace(' (單曲)', '').toUpperCase() || '--';
              
              return (
                  <div key={main.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-6 bg-[#050a14] border border-white/5 items-center hover:bg-white/[0.03] transition-all group rounded-sm">
                      <div className="col-span-1">
                          <button onClick={() => playSong(main)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-brand-gold hover:text-black transition-all">
                              ▶
                          </button>
                      </div>
                      <div className="col-span-3 flex items-center gap-4">
                          <img src={main.coverUrl} className="w-12 h-12 object-cover rounded-sm shadow-xl" alt="" />
                          <div>
                              <h4 className="text-sm font-medium text-white uppercase tracking-widest truncate">{main.title}</h4>
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-1">ORIGINAL</p>
                          </div>
                      </div>
                      <div className="col-span-2 text-center text-[10px] font-mono text-brand-gold uppercase tracking-widest">
                          {main.isrc || '--'}
                      </div>
                      <div className="col-span-1 text-center text-[10px] text-slate-400 uppercase tracking-widest">
                          {typeLabel}
                      </div>
                      <div className="col-span-1 text-center">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 text-white text-[9px] font-medium uppercase tracking-widest rounded-sm">{main.language}</span>
                      </div>
                      <div className="col-span-1 text-center text-[10px] text-slate-500 font-mono">
                          {main.releaseDate}
                      </div>
                      <div className="col-span-1 text-center text-[10px] text-slate-600 uppercase tracking-widest truncate">
                          {main.releaseCompany || '--'}
                      </div>
                      <div className="col-span-2 flex justify-end gap-3">
                          <button onClick={() => navigate(`/song/${main.id}`)} className="px-5 py-2 border border-white/10 text-white text-[9px] font-medium uppercase tracking-widest hover:bg-white/10 transition-all">INFO</button>
                          <button onClick={() => navigate(`/interactive`, { state: { targetSongId: main.id } })} className="px-5 py-2 bg-white text-black text-[9px] font-medium uppercase tracking-widest hover:bg-brand-gold transition-all">START LAB</button>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}; 

export default Database;
