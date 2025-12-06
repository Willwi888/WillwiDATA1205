import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, getLanguageColor, Song } from '../types';
import { useTranslation } from '../context/LanguageContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [showEditorPick, setShowEditorPick] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); 

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.isrc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.upc?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      const matchesProject = filterProject === 'All' || song.projectType === filterProject;
      const matchesPick = !showEditorPick || song.isEditorPick;

      return matchesSearch && matchesLang && matchesProject && matchesPick;
    });
  }, [songs, searchTerm, filterLang, filterProject, showEditorPick]);

  // Grouping Logic for Grid View
  const groupedContent = useMemo(() => {
    const albums: { [upc: string]: Song[] } = {};
    const singles: Song[] = [];

    filteredSongs.forEach(song => {
        if (song.upc && song.upc.trim().length > 0) {
            if (!albums[song.upc]) {
                albums[song.upc] = [];
            }
            albums[song.upc].push(song);
        } else {
            singles.push(song);
        }
    });

    return { albums, singles };
  }, [filteredSongs]);

  // Helper to check completeness
  const getMissingFields = (song: any) => {
    const missing = [];
    if (!song.isrc) missing.push('ISRC');
    if (!song.lyrics) missing.push('Lyrics');
    if (!song.spotifyLink && !song.spotifyId) missing.push('Spotify');
    return missing;
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-2xl font-bold text-white tracking-wide">{t('db_title')}</h2>
               <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-800">
                   Storage: IndexedDB OK
               </span>
           </div>
           <p className="text-slate-400 text-sm mt-1 font-mono">{t('db_total')}: {songs.length}</p>
        </div>
        
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 self-start md:self-auto">
            <button 
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                📋 {t('db_view_list')}
            </button>
            <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                🖼️ {t('db_view_grid')}
            </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('db_search_placeholder')}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none placeholder-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <select 
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            >
            <option value="All">{t('db_filter_lang')}</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select 
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            >
            <option value="All">{t('db_filter_project')}</option>
            {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button 
            onClick={() => setShowEditorPick(!showEditorPick)}
            className={`px-4 py-3 rounded-lg border transition-colors whitespace-nowrap ${showEditorPick ? 'bg-brand-gold text-slate-900 border-brand-gold font-bold' : 'border-slate-700 text-slate-300 hover:border-slate-400 bg-slate-950'}`}
            >
            ★ {t('form_label_pick')}
            </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-12">
            
            {/* 1. ALBUMS (Grouped by UPC) */}
            {Object.keys(groupedContent.albums).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {Object.entries(groupedContent.albums).map(([upc, albumSongs]) => {
                        // Sort tracks by title or ID (or track number if we had it)
                        const sortedTracks = (albumSongs as Song[]).sort((a,b) => a.title.localeCompare(b.title));
                        const coverSong = sortedTracks[0];
                        
                        return (
                            <div key={upc} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group hover:border-brand-accent/50 transition-all">
                                {/* Album Header */}
                                <div className="relative h-48 bg-black overflow-hidden">
                                     <img src={coverSong.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700 blur-sm scale-110" alt="bg" />
                                     <div className="absolute inset-0 flex items-center p-6 gap-6 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent">
                                         <img src={coverSong.coverUrl} className="w-24 h-24 rounded shadow-2xl object-cover z-10" alt="cover" />
                                         <div className="z-10 overflow-hidden">
                                             <div className="text-xs font-bold text-brand-accent tracking-widest uppercase mb-1">Album / EP</div>
                                             <h3 className="text-xl font-bold text-white leading-tight truncate">{coverSong.title}</h3>
                                             <p className="text-xs text-slate-400 font-mono mt-2">UPC: {upc}</p>
                                             <p className="text-xs text-slate-500 mt-1">{sortedTracks.length} Tracks</p>
                                         </div>
                                     </div>
                                </div>
                                
                                {/* Tracklist */}
                                <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar bg-slate-900/50">
                                    {sortedTracks.map((song, idx) => (
                                        <Link 
                                            key={song.id} 
                                            to={`/song/${song.id}`}
                                            className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg group/track transition-colors border border-transparent hover:border-slate-700"
                                        >
                                            <span className="text-slate-600 font-mono text-xs w-4 text-center group-hover/track:text-brand-accent">{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-300 group-hover/track:text-white truncate">{song.title}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                     <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(song.language)}`}></span>
                                                     <span className="text-[10px] text-slate-500">{song.versionLabel || song.language}</span>
                                                </div>
                                            </div>
                                            <div className="text-slate-600 group-hover/track:text-white">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Separator if both exist */}
            {Object.keys(groupedContent.albums).length > 0 && groupedContent.singles.length > 0 && (
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Singles</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                </div>
            )}

            {/* 2. SINGLES (No UPC or Unique) */}
            {groupedContent.singles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {groupedContent.singles.map(song => (
                    <Link key={song.id} to={`/song/${song.id}`} className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-brand-accent transition-all hover:shadow-2xl">
                        <div className="relative aspect-square overflow-hidden bg-black">
                        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                        {song.isEditorPick && (
                            <div className="absolute top-2 right-2 bg-brand-gold text-slate-900 text-xs font-bold px-2 py-1 rounded shadow">
                            PICK
                            </div>
                        )}
                        </div>
                        <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="overflow-hidden w-full">
                                <h3 className="font-bold text-lg text-white group-hover:text-brand-accent transition-colors truncate">{song.title}</h3>
                                <p className="text-sm text-slate-500 truncate">{song.versionLabel}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                                <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(song.language)}`}></span>
                                {song.language}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-500 border border-slate-700">{song.projectType}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 font-mono border-t border-slate-800 pt-3">
                            <span>{song.releaseDate}</span>
                            <span className="opacity-50">#{song.id.slice(-4)}</span>
                        </div>
                        </div>
                    </Link>
                    ))}
                </div>
            )}
        </div>
      ) : (
        // Table View (Unchanged logic, just keeping it consistent)
        <div className="overflow-x-auto bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
            <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('db_col_cover')}</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('db_col_info')}</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">ISRC / UPC</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">{t('db_col_release')}</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('db_col_status')}</th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                    </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-800">
                    {filteredSongs.map(song => {
                        const missing = getMissingFields(song);
                        return (
                            <tr key={song.id} className="hover:bg-slate-800/50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex-shrink-0 h-12 w-12 bg-black rounded overflow-hidden">
                                        <img className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={song.coverUrl} alt="" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-white mb-1">{song.title}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-950 border border-slate-700 text-slate-400">
                                            <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(song.language)}`}></span>
                                            {song.language}
                                        </span>
                                        {song.versionLabel && <span className="text-xs text-slate-500 border border-slate-800 px-1 rounded">{song.versionLabel}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono hidden md:table-cell">
                                    <div>{song.isrc || '-'}</div>
                                    {song.upc && <div className="text-slate-600 mt-1">{song.upc}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono hidden sm:table-cell">
                                    {song.releaseDate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {missing.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {missing.map(m => (
                                                <span key={m} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/30 text-red-400 border border-red-900/50 w-fit">
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                            {t('db_status_ok')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link to={`/song/${song.id}`} className="text-slate-400 hover:text-white transition-colors border border-slate-700 px-3 py-1 rounded hover:border-white">
                                        {t('btn_edit')}
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredSongs.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    {t('db_empty')}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Database;