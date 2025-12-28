import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, filterLang]);

  const handleStartSession = (songId: string) => {
      const s = songs.find(x => x.id === songId);
      if (!s?.isInteractiveActive && !isAdmin) {
          alert("此作品互動模組暫未對外開放。");
          return;
      }
      navigate('/interactive', { state: { targetSongId: songId } });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      <div className="mb-20 text-center">
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow">Database</h2>
           <p className="text-slate-600 text-[10px] font-bold tracking-[0.8em] uppercase">Willwi Official Catalog</p>
      </div>

      <div className="flex flex-col md:flex-row gap-px mb-16 bg-white/5 p-px border border-white/10">
        <input
          type="text"
          placeholder="SEARCH TRACK / ISRC..."
          className="flex-grow bg-black px-8 py-5 text-white outline-none text-sm font-black uppercase tracking-widest focus:bg-slate-900 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
            className="bg-black text-slate-400 px-8 py-5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white border-l border-white/10" 
            value={filterLang} 
            onChange={(e) => setFilterLang(e.target.value)}
        >
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-white/10 border border-white/10">
          {filteredSongs.map(song => (
              <div key={song.id} className="group relative bg-black p-8 transition-all hover:bg-slate-900/50 flex flex-col h-full">
                  <div className="flex flex-col gap-6 relative z-10 flex-grow">
                      {/* Cover Art - UPDATED: Removed grayscale class */}
                      <div className="aspect-square w-full relative overflow-hidden bg-slate-900 border border-white/5 shadow-lg group-hover:border-brand-gold/30 transition-all">
                          <img src={song.coverUrl} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt="" />
                      </div>
                      
                      <div className="flex flex-col flex-grow">
                          <div className="flex justify-between items-start mb-2">
                               <span className="text-[9px] text-brand-gold font-black uppercase tracking-widest border border-brand-gold/30 px-2 py-0.5">{song.language}</span>
                               <span className="text-[9px] text-slate-600 font-mono">{song.releaseDate}</span>
                          </div>
                          <h4 className="text-2xl font-black text-white uppercase truncate mb-6 group-hover:text-brand-gold transition-colors" title={song.title}>{song.title}</h4>
                          
                          {/* Player Always Visible */}
                          {song.spotifyId ? (
                              <div className="mb-6 rounded-lg overflow-hidden bg-black shadow-lg">
                                  <iframe 
                                    src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`} 
                                    width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"
                                    className="bg-slate-800"
                                  ></iframe>
                              </div>
                          ) : (
                               <div className="mb-6 h-20 bg-slate-900/50 border border-white/5 flex items-center justify-center text-[9px] text-slate-600 uppercase tracking-widest">
                                   Spotify Preview Unavailable
                               </div>
                          )}

                          {/* External Links Buttons */}
                          <div className="flex gap-2 mb-4">
                              {song.youtubeUrl && (
                                  <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                                      YouTube
                                  </a>
                              )}
                              {song.smartLink && (
                                  <a href={song.smartLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 border border-blue-900/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded">
                                      Link
                                  </a>
                              )}
                          </div>

                          <div className="flex gap-1 mt-auto pt-4 border-t border-white/10">
                              <button 
                                onClick={() => handleStartSession(song.id)} 
                                className="flex-grow bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all"
                              >
                                  Enter Lab
                              </button>
                              <button 
                                onClick={() => navigate(`/song/${song.id}`)} 
                                className="px-6 bg-slate-900 text-slate-400 py-4 text-[10px] font-black uppercase hover:text-white transition-all"
                              >
                                  Info
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {filteredSongs.length === 0 && (
          <div className="py-60 text-center border border-white/10">
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[1em]">Empty Collection.</p>
          </div>
      )}
    </div>
  );
};

export default Database;