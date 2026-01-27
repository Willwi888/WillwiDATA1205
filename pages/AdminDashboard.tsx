
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, ReleaseCategory, Language } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';

type Tab = 'catalog' | 'doc' | 'settings' | 'payment' | 'visuals';
type SortKey = 'releaseDate' | 'title' | 'language' | 'upc' | 'isrc';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud, playSong, currentSong, isPlaying } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'local' | 'spotify'>('local');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing_assets'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'releaseDate', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Grouping / Expansion State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Settings state
  const [qrImages, setQrImages] = useState({
      global_payment: '',
      production: '',
      cinema: '',
      support: '',
      line: ''
  });
  const [accessCode, setAccessCode] = useState('8888');
  const [visualsForm, setVisualsForm] = useState({
      portraitUrl: '',
      defaultCoverUrl: ''
  });

  useEffect(() => {
      setQrImages({
          global_payment: localStorage.getItem('qr_global_payment') || '',
          production: localStorage.getItem('qr_production') || '',
          cinema: localStorage.getItem('qr_cinema') || '',
          support: localStorage.getItem('qr_support') || '',
          line: localStorage.getItem('qr_line') || ''
      });
      setAccessCode(localStorage.getItem('willwi_access_code') || '8888');
      
      if (isAdmin) {
          setVisualsForm({
              portraitUrl: globalSettings.portraitUrl,
              defaultCoverUrl: globalSettings.defaultCoverUrl
          });
      }
  }, [isAdmin, globalSettings]);

  // Spotify Search
  useEffect(() => {
    if (searchMode === 'spotify' && searchTerm.length >= 2) {
        const timer = setTimeout(async () => {
            setIsSearchingSpotify(true);
            try {
                const res = await searchSpotifyTracks(searchTerm);
                setSpotifyResults(res);
            } catch(e) { console.error(e); } 
            finally { setIsSearchingSpotify(false); }
        }, 600);
        return () => clearTimeout(timer);
    }
  }, [searchMode, searchTerm]);

  // Filter & Sort Core
  const processedSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.isrc && s.isrc.includes(searchTerm)) ||
          (s.upc && s.upc.includes(searchTerm))
      );
      if (filterStatus === 'active') result = result.filter(s => s.isInteractiveActive);
      if (filterStatus === 'inactive') result = result.filter(s => !s.isInteractiveActive);
      if (filterStatus === 'missing_assets') result = result.filter(s => !s.lyrics || !s.audioUrl);
      
      return result.sort((a, b) => {
          let valA = a[sortConfig.key] || '';
          let valB = b[sortConfig.key] || '';
          if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
          return valA < valB ? 1 : -1;
      });
  }, [songs, searchTerm, filterStatus, sortConfig]);

  // Grouped by UPC
  const groupedCatalog = useMemo(() => {
      const groups: Record<string, Song[]> = {};
      processedSongs.forEach(song => {
          const key = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${song.id}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(song);
      });
      return Object.values(groups).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [processedSongs]);

  const handleToggleGroup = (key: string) => {
      const next = new Set(expandedGroups);
      if (next.has(key)) next.delete(key); else next.add(key);
      setExpandedGroups(next);
  };

  const exportDocCsv = () => {
      const headers = ["Title", "ISRC", "UPC", "Date", "Language", "Category", "Label", "SpotifyID"];
      const rows = songs.map(s => [
          s.title, s.isrc || '', s.upc || '', s.releaseDate, s.language, 
          s.releaseCategory || '', s.releaseCompany || 'Willwi Music', s.spotifyId || ''
      ]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `WILLWI_CATALOG_DOC_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">Unlock Console</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Central Control</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                New Song
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">Exit</button>
          </div>
      </div>

      <nav className="flex gap-4 mb-10 border-b border-white/5 pb-4">
          {[
              { id: 'catalog', label: 'UPC 作品集' },
              { id: 'doc', label: '文檔中心' },
              { id: 'settings', label: '備份中心' },
              { id: 'payment', label: '金流 QR' },
              { id: 'visuals', label: '系統視覺' }
          ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all ${activeTab === t.id ? 'bg-brand-gold text-black' : 'text-slate-500 hover:text-white'}`}>{t.label}</button>
          ))}
      </nav>

      {activeTab === 'catalog' && (
          <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/10 p-2 rounded-lg flex flex-col md:flex-row gap-2">
                  <div className="flex bg-black/50 rounded-md p-1 border border-white/5">
                      <button onClick={() => setSearchMode('local')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all ${searchMode === 'local' ? 'bg-brand-gold text-black' : 'text-slate-500 hover:text-white'}`}>Database</button>
                      <button onClick={() => setSearchMode('spotify')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all flex items-center gap-2 ${searchMode === 'spotify' ? 'bg-[#1DB954] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Spotify</button>
                  </div>
                  <div className="flex-1 relative">
                      <input type="text" placeholder={searchMode === 'local' ? "搜尋作品, UPC 或 ISRC..." : "輸入關鍵字搜尋 Spotify..."} className="w-full bg-black/50 border border-transparent focus:border-brand-accent/50 rounded-md pl-10 pr-4 py-3 text-white text-xs font-bold outline-none uppercase transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <svg className={`w-4 h-4 absolute left-3 top-3 transition-colors ${isSearchingSpotify ? 'text-brand-accent animate-spin' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
              </div>

              {searchMode === 'local' ? (
                  <div className="space-y-4">
                      {groupedCatalog.map(group => {
                          const main = group[0];
                          const key = main.upc ? normalizeIdentifier(main.upc) : `SINGLE_${main.id}`;
                          const isExpanded = expandedGroups.has(key);
                          const isAlbum = group.length > 1 || main.releaseCategory === ReleaseCategory.Album;
                          
                          return (
                              <div key={key} className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden transition-all hover:border-white/10">
                                  <div className="p-4 flex items-center gap-6 cursor-pointer hover:bg-white/[0.02]" onClick={() => handleToggleGroup(key)}>
                                      <img src={main.coverUrl} className="w-16 h-16 object-cover rounded shadow-lg" alt="" />
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3 mb-1">
                                              <h4 className="text-white font-bold uppercase tracking-wider text-sm truncate">{main.title}</h4>
                                              <span className={`text-[8px] font-black px-2 py-0.5 rounded ${isAlbum ? 'bg-brand-accent/20 text-brand-accent' : 'bg-slate-800 text-slate-500'}`}>{isAlbum ? 'ALBUM' : 'SINGLE'}</span>
                                          </div>
                                          <div className="flex gap-4 text-[9px] font-mono text-slate-500 uppercase">
                                              <span>{main.releaseDate}</span>
                                              <span>{group.length} Tracks</span>
                                              {main.upc && <span className="text-slate-700">UPC: {main.upc}</span>}
                                          </div>
                                      </div>
                                      <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                      </div>
                                  </div>
                                  {isExpanded && (
                                      <div className="border-t border-white/5 bg-black/20">
                                          <table className="w-full text-left text-xs">
                                              <thead className="bg-black/40 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                  <tr>
                                                      <th className="p-4 w-12">#</th>
                                                      <th className="p-4">Track Title</th>
                                                      <th className="p-4 text-center">Interactive</th>
                                                      <th className="p-4 text-right">Actions</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-white/5">
                                                  {group.map((song, idx) => (
                                                      <tr key={song.id} className="hover:bg-white/[0.01]">
                                                          <td className="p-4 text-slate-500 font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                                                          <td className="p-4 font-bold text-slate-300">{song.title}</td>
                                                          <td className="p-4 text-center">
                                                              <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-3 py-0.5 text-[8px] font-black rounded ${song.isInteractiveActive ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'}`}>{song.isInteractiveActive ? 'ON' : 'OFF'}</button>
                                                          </td>
                                                          <td className="p-4 text-right space-x-4">
                                                              <button onClick={() => playSong(song)} className="text-[10px] text-brand-gold font-black uppercase">Play</button>
                                                              <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase">Edit</button>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {spotifyResults.map(track => (
                          <div key={track.id} className="flex gap-4 p-4 bg-slate-900 border border-white/5 rounded-lg">
                              <img src={track.album.images?.[0]?.url} className="w-16 h-16 object-cover rounded shadow-lg" alt="" />
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                      <div className="text-xs font-bold text-white truncate">{track.name}</div>
                                      <div className="text-[10px] text-slate-500 truncate">{track.artists.map((a:any)=>a.name).join(', ')}</div>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                      <span className="text-[9px] font-mono text-slate-600">{track.album.release_date}</span>
                                      <button onClick={() => navigate('/add', { state: { spotifyTrack: track } })} className="px-3 py-1 bg-[#1DB954] text-black text-[9px] font-black uppercase rounded">Import</button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'doc' && (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Metadata Documentation</h3>
                  <button onClick={exportDocCsv} className="bg-brand-accent text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded">Export CSV</button>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-[10px] font-mono">
                      <thead className="bg-black text-slate-500 font-black uppercase">
                          <tr>
                              <th className="p-4">Title</th>
                              <th className="p-4">ISRC</th>
                              <th className="p-4">UPC</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Lang</th>
                              <th className="p-4">Spotify ID</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {processedSongs.map(s => (
                              <tr key={s.id} className="hover:bg-white/[0.02] text-slate-300">
                                  <td className="p-4 font-bold text-white">{s.title}</td>
                                  <td className="p-4">{s.isrc || '-'}</td>
                                  <td className="p-4">{s.upc || '-'}</td>
                                  <td className="p-4">{s.releaseDate}</td>
                                  <td className="p-4">{s.language}</td>
                                  <td className="p-4 text-brand-gold">{s.spotifyId || '-'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              <div className="bg-slate-900 border border-brand-accent/30 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.3em] mb-8">Data Center</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between">
                          <div>
                              <h4 className="text-white text-base font-bold mb-3">Export Catalog</h4>
                              <p className="text-xs text-slate-500 mb-8">Backup all songs and metadata to a JSON file.</p>
                          </div>
                          <button onClick={() => dbService.getAllSongs().then(data => {
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = `WILLWI_DB_BACKUP.json`;
                              a.click();
                          })} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest rounded">Download JSON</button>
                      </div>
                      <div className="p-8 bg-black/40 border border-red-900/30 rounded-lg flex flex-col justify-between">
                          <div>
                              <h4 className="text-red-400 text-base font-bold mb-3">Import Catalog</h4>
                              <p className="text-xs text-slate-500 mb-8">Overwrite current database with a JSON file.</p>
                          </div>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && window.confirm('WIPE DATA AND RE-IMPORT?')) {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                      const data = JSON.parse(ev.target?.result as string);
                                      await dbService.clearAllSongs();
                                      await dbService.bulkAdd(data);
                                      window.location.reload();
                                  };
                                  reader.readAsText(file);
                              }
                          }} />
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-red-500 text-red-500 font-black text-[11px] uppercase tracking-widest rounded">Upload & Overwrite</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Other tabs simplified or kept same as previous context */}
    </div>
  );
};

export default AdminDashboard;
