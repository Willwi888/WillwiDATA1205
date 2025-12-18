import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, getLanguageColor, Song } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [showEditorPick, setShowEditorPick] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); 

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (isAdmin && (song.isrc?.toLowerCase().includes(searchTerm.toLowerCase()) || song.upc?.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      const matchesProject = filterProject === 'All' || song.projectType === filterProject;
      const matchesPick = !showEditorPick || song.isEditorPick;

      return matchesSearch && matchesLang && matchesProject && matchesPick;
    });
  }, [songs, searchTerm, filterLang, filterProject, showEditorPick, isAdmin]);

  const groupedContent = useMemo(() => {
    const albums: { [upc: string]: Song[] } = {};
    const singles: Song[] = [];

    filteredSongs.forEach(song => {
        if (song.upc && song.upc.trim().length > 0) {
            if (!albums[song.upc]) albums[song.upc] = [];
            albums[song.upc].push(song);
        } else {
            singles.push(song);
        }
    });

    return { albums, singles };
  }, [filteredSongs]);

  const getMissingFields = (song: Song) => {
    const missing = [];
    if (!song.isrc) missing.push('ISRC');
    if (song.language !== Language.Instrumental && (!song.lyrics || song.lyrics.trim().length === 0)) missing.push('Lyrics');
    if (!song.spotifyLink && !song.spotifyId) missing.push('Spotify');
    return missing;
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{t('db_title')}</h2>
           <div className="flex items-center gap-3 text-slate-400 font-mono text-xs tracking-widest">
                <span>INDEXED: {songs.length}</span>
                <span className="text-slate-700">|</span>
                <span>UPDATED: {new Date().toISOString().split('T')[0]}</span>
                {isAdmin && <span className="ml-2 text-[10px] bg-red-900/20 text-red-500 px-2 py-0.5 rounded border border-red-900/50 font-bold">ADMIN VIEW</span>}
           </div>
        </div>
        
        <div className="flex bg-slate-900/80 rounded p-1 border border-white/10 self-start md:self-auto backdrop-blur-sm">
            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}>List</button>
            <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Grid</button>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md p-1 rounded border border-white/10 mb-10 flex flex-col lg:flex-row gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('db_search_placeholder')}
            className="w-full bg-transparent rounded px-4 py-3 text-white focus:bg-slate-900/50 outline-none placeholder-slate-600 text-sm font-medium transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-px w-full lg:w-px lg:h-auto bg-white/10 mx-2"></div>
        <div className="flex flex-col sm:flex-row gap-2 p-1">
            <select className="bg-transparent text-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer hover:text-white appearance-none" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                <option value="All">All Languages</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="bg-transparent text-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer hover:text-white appearance-none" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                <option value="All">All Projects</option>
                {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => setShowEditorPick(!showEditorPick)} className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider border transition-colors ${showEditorPick ? 'bg-brand-gold text-slate-900 border-brand-gold' : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-white'}`}>★ Picks</button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-16">
            {Object.keys(groupedContent.albums).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {Object.entries(groupedContent.albums).map(([upc, albumSongs]) => {
                        const sortedTracks = (albumSongs as Song[]).sort((a,b) => a.title.localeCompare(b.title));
                        const coverSong = sortedTracks[0];
                        return (
                            <div key={upc} className="bg-slate-900/60 backdrop-blur-sm rounded border border-white/5 group hover:border-brand-accent/30 transition-all duration-500">
                                <div className="relative h-48 overflow-hidden rounded-t">
                                     <img src={coverSong.coverUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-all blur-sm" alt="bg" />
                                     <div className="absolute inset-0 flex items-center p-6 gap-6 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent">
                                         <img src={coverSong.coverUrl} className="w-24 h-24 shadow-2xl object-cover z-10 border border-white/10" alt="cover" />
                                         <div className="z-10 overflow-hidden">
                                             <div className="text-[10px] font-bold text-brand-accent tracking-[0.2em] uppercase mb-1">Album</div>
                                             <h3 className="text-xl font-bold text-white leading-tight truncate">{coverSong.title}</h3>
                                             {isAdmin && <p className="text-[10px] text-slate-500 font-mono mt-2 tracking-wider">UPC: {upc}</p>}
                                         </div>
                                     </div>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {sortedTracks.map((song, idx) => (
                                        <Link key={song.id} to={`/song/${song.id}`} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group/track">
                                            <span className="text-slate-600 font-mono text-[10px] w-4 text-center group-hover/track:text-brand-accent">{idx + 1}</span>
                                            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-300 group-hover/track:text-white truncate transition-colors">{song.title}</div></div>
                                            <div className="flex gap-2">
                                                {song.spotifyLink && <span className="text-green-500 opacity-40 group-hover/track:opacity-100"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.29c-.215.352-.674.463-1.025.248-2.846-1.74-6.427-2.13-10.647-1.168-.403.092-.806-.16-.898-.562-.092-.403.16-.806.562-.898 4.625-1.057 8.575-.61 11.76 1.332.35.215.462.674.248 1.025zm1.468-3.264c-.27.437-.84.577-1.277.307-3.257-2.003-8.223-2.585-12.073-1.417-.49.15-.94-.132-1.09-.622-.15-.49.132-.94.622-1.09 4.39-1.332 9.873-.67 13.633 1.644.437.27.577.84.307 1.277zm.127-3.41c-3.906-2.32-10.334-2.533-14.103-1.387-.6.182-1.23-.16-1.41-.76-.182-.6.16-1.23.76-1.41 4.322-1.312 11.41-1.063 15.897 1.6 1.41.84 1.88 2.65 1.04 4.06-.54.91-1.5 1.22-2.34.897z"/></svg></span>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {groupedContent.singles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {groupedContent.singles.map(song => (
                    <Link key={song.id} to={`/song/${song.id}`} className="group relative">
                        <div className="aspect-square overflow-hidden bg-slate-900 border border-white/5 relative mb-3">
                            <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                            {song.isEditorPick && <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-2 py-1 uppercase tracking-widest">Pick</div>}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-bold text-base text-white group-hover:text-brand-accent transition-colors truncate">{song.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(song.language)}`}></span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{song.versionLabel || song.language}</span>
                            </div>
                        </div>
                    </Link>
                    ))}
                </div>
            )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 backdrop-blur-md rounded border border-white/5">
            <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-slate-950/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_cover')}</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_info')}</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hidden md:table-cell">Links</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hidden sm:table-cell">{t('db_col_release')}</th>
                        {isAdmin && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_status')}</th>}
                        <th className="px-6 py-4"></th> 
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} onClick={() => navigate(`/song/${song.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap"><div className="h-10 w-10 bg-black relative overflow-hidden border border-white/10"><img className="h-full w-full object-cover" src={song.coverUrl} alt="" /></div></td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-white mb-1 group-hover:text-brand-accent transition-colors">{song.title}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{song.language}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                <div className="flex gap-3">
                                    {song.spotifyLink && <span className="text-green-500 opacity-30 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.29c-.215.352-.674.463-1.025.248-2.846-1.74-6.427-2.13-10.647-1.168-.403.092-.806-.16-.898-.562-.092-.403.16-.806.562-.898 4.625-1.057 8.575-.61 11.76 1.332.35.215.462.674.248 1.025zm1.468-3.264c-.27.437-.84.577-1.277.307-3.257-2.003-8.223-2.585-12.073-1.417-.49.15-.94-.132-1.09-.622-.15-.49.132-.94.622-1.09 4.39-1.332 9.873-.67 13.633 1.644.437.27.577.84.307 1.277zm.127-3.41c-3.906-2.32-10.334-2.533-14.103-1.387-.6.182-1.23-.16-1.41-.76-.182-.6.16-1.23.76-1.41 4.322-1.312 11.41-1.063 15.897 1.6 1.41.84 1.88 2.65 1.04 4.06-.54.91-1.5 1.22-2.34.897z"/></svg></span>}
                                    {song.youtubeUrl && <span className="text-red-500 opacity-30 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg></span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-500 font-mono hidden sm:table-cell tracking-wider">{song.releaseDate}</td>
                            {isAdmin && <td className="px-6 py-4 whitespace-nowrap">
                                {getMissingFields(song).length > 0 ? <span className="w-2 h-2 rounded-full bg-red-500/50 inline-block"></span> : <span className="w-2 h-2 rounded-full bg-green-500/50 inline-block"></span>}
                            </td>}
                            <td className="px-6 py-4 text-right"><span className="text-slate-700 group-hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" /></svg></span></td>
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