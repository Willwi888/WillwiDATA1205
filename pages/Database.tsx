import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, getLanguageColor } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); 

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (song.isrc?.toLowerCase().includes(searchTerm.toLowerCase()) || song.upc?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, filterLang]);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-32">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{t('db_title')}</h2>
           <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px] tracking-widest">
                <span className="text-brand-gold">WILLWI CATALOG</span>
                <span>/</span>
                <span>TOTAL TRACKS: {songs.length}</span>
           </div>
        </div>
        
        <div className="flex bg-slate-900 border border-white/10 p-1">
            <button onClick={() => setViewMode('grid')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Grid</button>
            <button onClick={() => setViewMode('table')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>List</button>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-white/10 mb-12 flex flex-col md:flex-row">
        <input
          type="text"
          placeholder={t('db_search_placeholder')}
          className="flex-grow bg-transparent px-6 py-4 text-white outline-none placeholder-slate-700 text-sm font-bold uppercase tracking-widest"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="w-px bg-white/10 hidden md:block"></div>
        <select className="bg-transparent text-slate-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white appearance-none" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
            <option value="All">All Languages</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {filteredSongs.map(song => (
                <div key={song.id} onClick={() => navigate(`/song/${song.id}`)} className="group cursor-pointer">
                    <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden mb-6 shadow-2xl">
                        <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                    </div>
                    <h4 className="text-[12px] font-black text-white uppercase tracking-widest truncate">{song.title}</h4>
                    <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">{song.releaseDate}</p>
                </div>
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/5 bg-slate-900/20">
            <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-black">
                    <tr>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Metadata</th>
                        <th className="px-8 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Release</th>
                        <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} onClick={() => navigate(`/song/${song.id}`)} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                            <td className="px-8 py-6 whitespace-nowrap">
                                <div className="flex items-center gap-5">
                                    <img className="h-12 w-12 object-cover border border-white/10" src={song.coverUrl} alt="" />
                                    <div>
                                        <div className="text-sm font-black text-white group-hover:text-brand-gold transition-colors">{song.title}</div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{song.language}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-mono text-slate-400">ISRC: {song.isrc || '--'}</div>
                                    <div className="text-[10px] font-mono text-slate-600">UPC: {song.upc || '--'}</div>
                                </div>
                            </td>
                            <td className="px-8 py-6 whitespace-nowrap text-[10px] text-slate-500 font-mono hidden sm:table-cell tracking-widest">{song.releaseDate}</td>
                            <td className="px-8 py-6 text-right"><span className="text-slate-800 group-hover:text-white transition-colors text-[9px] font-black">VIEW_DETAILS</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default Database;