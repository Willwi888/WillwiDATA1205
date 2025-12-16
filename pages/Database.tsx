import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, getLanguageColor, Song } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();
  const navigate = useNavigate();
  
  // --- PASSWORD PROTECTION STATE ---
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [showEditorPick, setShowEditorPick] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); 

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // UPDATED: Accept both legacy code and new master key
      if (passwordInput === '8888' || passwordInput === 'eloveg2026') {
          enableAdmin();
          setLoginError('');
      } else {
          setLoginError('Invalid Access Code');
      }
  };

  // 1. RENDER PASSWORD GATE IF NOT ADMIN
  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6">
                       <svg className="w-8 h-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">{t('db_title')}</h2>
                   <p className="text-slate-400 text-sm mb-6">此頁面為內部資料庫。請輸入存取密碼。<br/><span className="text-xs text-slate-500">(Private Catalog. Please enter access code.)</span></p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input 
                          type="password" 
                          placeholder="Code"
                          className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none focus:border-brand-accent transition-colors"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                       />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">
                           Unlock
                       </button>
                   </form>
               </div>
          </div>
      );
  }

  // 2. MAIN CONTENT (Only rendered if isAdmin is true)
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
  const getMissingFields = (song: Song) => {
    const missing = [];
    if (!song.isrc) missing.push('ISRC');
    
    // Logic Update: Skip lyrics check if the song is Instrumental
    if (song.language !== Language.Instrumental) {
        if (!song.lyrics || song.lyrics.trim().length === 0) {
            missing.push('Lyrics');
        }
    }
    
    if (!song.spotifyLink && !song.spotifyId) missing.push('Spotify');
    return missing;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{t('db_title')}</h2>
           <div className="flex items-center gap-3 text-slate-400 font-mono text-xs tracking-widest">
                <span>INDEXED: {songs.length}</span>
                <span className="text-slate-700">|</span>
                <span>UPDATED: {new Date().toISOString().split('T')[0]}</span>
                {isAdmin && (
                   <span className="ml-2 text-[10px] bg-red-900/20 text-red-500 px-2 py-0.5 rounded border border-red-900/50 font-bold animate-pulse">
                       UNLOCKED
                   </span>
               )}
           </div>
        </div>
        
        <div className="flex bg-slate-900/80 rounded p-1 border border-white/10 self-start md:self-auto backdrop-blur-sm">
            <button 
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            >
                List
            </button>
            <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            >
                Grid
            </button>
        </div>
      </div>

      {/* Filter Bar - Premium Style */}
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
            <select 
                className="bg-transparent text-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer hover:text-white appearance-none"
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
            >
                <option value="All">All Languages</option>
                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select 
                className="bg-transparent text-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer hover:text-white appearance-none"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
            >
                <option value="All">All Projects</option>
                {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button 
                onClick={() => setShowEditorPick(!showEditorPick)}
                className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider border transition-colors ${showEditorPick ? 'bg-brand-gold text-slate-900 border-brand-gold' : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-white'}`}
            >
                ★ Picks
            </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-16">
            
            {/* 1. ALBUMS (Grouped by UPC) */}
            {Object.keys(groupedContent.albums).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {Object.entries(groupedContent.albums).map(([upc, albumSongs]) => {
                        const sortedTracks = (albumSongs as Song[]).sort((a,b) => a.title.localeCompare(b.title));
                        const coverSong = sortedTracks[0];
                        
                        return (
                            <div key={upc} className="bg-slate-900/60 backdrop-blur-sm rounded border border-white/5 group hover:border-brand-accent/30 transition-all duration-500">
                                {/* Album Header */}
                                <div className="relative h-48 overflow-hidden rounded-t">
                                     <img src={coverSong.coverUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700 blur-sm" alt="bg" />
                                     <div className="absolute inset-0 flex items-center p-6 gap-6 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent">
                                         <img src={coverSong.coverUrl} className="w-24 h-24 shadow-2xl object-cover z-10 border border-white/10" alt="cover" />
                                         <div className="z-10 overflow-hidden">
                                             <div className="text-[10px] font-bold text-brand-accent tracking-[0.2em] uppercase mb-1">Album</div>
                                             <h3 className="text-xl font-bold text-white leading-tight truncate">{coverSong.title}</h3>
                                             <p className="text-[10px] text-slate-500 font-mono mt-2 tracking-wider">UPC: {upc}</p>
                                         </div>
                                     </div>
                                </div>
                                
                                {/* Tracklist */}
                                <div className="divide-y divide-white/5">
                                    {sortedTracks.map((song, idx) => (
                                        <Link 
                                            key={song.id} 
                                            to={`/song/${song.id}`}
                                            className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group/track"
                                        >
                                            <span className="text-slate-600 font-mono text-[10px] w-4 text-center group-hover/track:text-brand-accent">{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-300 group-hover/track:text-white truncate transition-colors">{song.title}</div>
                                            </div>
                                            <div className="text-[10px] text-slate-600 font-mono hidden sm:block">ISRC: {song.isrc || '-'}</div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Separator */}
            {Object.keys(groupedContent.albums).length > 0 && groupedContent.singles.length > 0 && (
                <div className="flex items-center gap-4 py-8">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Singles Collection</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
            )}

            {/* 2. SINGLES */}
            {groupedContent.singles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {groupedContent.singles.map(song => (
                    <Link key={song.id} to={`/song/${song.id}`} className="group relative">
                        <div className="aspect-square overflow-hidden bg-slate-900 border border-white/5 relative mb-3">
                            <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                            {song.isEditorPick && (
                                <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                                Pick
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col">
                            <h3 className="font-bold text-base text-white group-hover:text-brand-accent transition-colors truncate">{song.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${getLanguageColor(song.language)}`}></span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{song.versionLabel || song.language}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-1">UPC: {song.upc || '-'}</div>
                        </div>
                    </Link>
                    ))}
                </div>
            )}
        </div>
      ) : (
        // Premium Table View
        <div className="overflow-x-auto bg-slate-900/40 backdrop-blur-md rounded border border-white/5">
            <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-slate-950/50">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_cover')}</th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_info')}</th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hidden md:table-cell">ISRC / UPC</th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hidden sm:table-cell">{t('db_col_release')}</th>
                        {/* Always show Status since they are admin now */}
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('db_col_status')}</th>
                        <th scope="col" className="px-6 py-4"></th> 
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => {
                        const missing = getMissingFields(song);
                        return (
                            <tr 
                                key={song.id} 
                                onClick={() => navigate(`/song/${song.id}`)}
                                className="hover:bg-white/5 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="h-10 w-10 bg-black relative overflow-hidden border border-white/10">
                                        <img className="h-full w-full object-cover" src={song.coverUrl} alt="" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-white mb-1 group-hover:text-brand-accent transition-colors">{song.title}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{song.language}</span>
                                        {song.versionLabel && <span className="text-[10px] text-slate-600 border border-slate-700 px-1 rounded">{song.versionLabel}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-500 font-mono hidden md:table-cell">
                                    <div>ISRC: {song.isrc || '-'}</div>
                                    <div>UPC: {song.upc || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-500 font-mono hidden sm:table-cell tracking-wider">
                                    {song.releaseDate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {missing.length > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500/50 inline-block"></span>
                                        </div>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-green-500/50 inline-block"></span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-slate-700 group-hover:text-white transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" /></svg>
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredSongs.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-sm uppercase tracking-widest">
                    {t('db_empty')}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

// Helper mainly for visuals since we don't have duration data
const formatDuration = (song: Song) => {
    return ""; 
}

export default Database;