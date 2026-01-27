
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, ReleaseCategory, Language } from '../types';
import { searchSpotifyAlbums, getSpotifyAlbumTracks } from '../services/spotifyService';
import { useToast } from '../components/Layout';

type Tab = 'catalog' | 'settings' | 'documentation';
type SearchScope = 'local' | 'spotify_album';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAppendSongs, playSong, currentSong, isPlaying } = useData();
  const { isAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('local');
  const [spotifyAlbums, setSpotifyAlbums] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selection & Batch State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isBatchEditing, setIsBatchEditing] = useState(false);

  // Spotify Search Logic
  useEffect(() => {
    if (searchScope === 'spotify_album' && searchTerm.length > 2) {
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchSpotifyAlbums(searchTerm);
                setSpotifyAlbums(res);
            } catch(e) { showToast("Spotify 搜尋失敗", "error"); }
            finally { setIsSearching(false); }
        }, 600);
        return () => clearTimeout(timer);
    }
  }, [searchTerm, searchScope]);

  // Grouped Songs
  const groupedCatalog = useMemo(() => {
      const groups: Record<string, Song[]> = {};
      const filtered = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
      );
      
      filtered.forEach(song => {
          const key = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${song.id}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(song);
      });
      return Object.values(groups).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm]);

  // Selection Handlers
  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedIds(next);
  };

  const toggleSelectAlbum = (songsInAlbum: Song[], force?: boolean) => {
      const next = new Set(selectedIds);
      const allSelected = songsInAlbum.every(s => next.has(s.id));
      const shouldSelect = force !== undefined ? force : !allSelected;
      
      songsInAlbum.forEach(s => {
          if (shouldSelect) next.add(s.id); else next.delete(s.id);
      });
      setSelectedIds(next);
  };

  const handleBatchUpdateStatus = async (active: boolean) => {
      if (selectedIds.size === 0) return;
      showToast(`正在更新 ${selectedIds.size} 首歌曲狀態...`);
      for (const id of Array.from(selectedIds)) {
          await updateSong(id, { isInteractiveActive: active });
      }
      showToast("批量更新完成", "success");
      setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
      if (!window.confirm(`確定要刪除選中的 ${selectedIds.size} 首歌曲嗎？此動作不可撤銷。`)) return;
      showToast(`正在刪除...`);
      for (const id of Array.from(selectedIds)) {
          await deleteSong(id);
      }
      setSelectedIds(new Set());
      showToast("批量刪除成功");
  };

  const handleImportAlbum = async (album: any) => {
      showToast(`正在解析專輯《${album.name}》音軌...`);
      setIsSearching(true);
      try {
          const fullAlbum = await getSpotifyAlbumTracks(album.id);
          if (fullAlbum && fullAlbum.tracks) {
              const upc = fullAlbum.external_ids?.upc || album.id;
              const newSongs: Song[] = fullAlbum.tracks.items.map((track: any) => ({
                  id: track.id,
                  title: track.name,
                  isrc: track.external_ids?.isrc || '',
                  upc: upc,
                  releaseDate: album.release_date,
                  releaseCategory: album.album_type === 'album' ? ReleaseCategory.Album : ReleaseCategory.Single,
                  language: Language.Mandarin,
                  projectType: ProjectType.Indie,
                  releaseCompany: album.label || 'Willwi Music',
                  coverUrl: album.images?.[0]?.url || '',
                  spotifyId: track.id,
                  isInteractiveActive: true,
                  isEditorPick: false,
                  credits: `© ${album.release_date.split('-')[0]} ${album.label || 'Willwi Music'}`
              }));
              await bulkAppendSongs(newSongs);
              showToast(`成功匯入專輯：${album.name}`, "success");
              setSearchScope('local');
          }
      } catch(e) { showToast("導入失敗", "error"); }
      finally { setIsSearching(false); }
  };

  if (!isAdmin) return null; // Already handled by parent or context, but safe-guard

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-60">
      
      {/* Header & Main Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Willwi Management</h1>
            <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Central Metadata Engine</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-gold text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                New Release
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded hover:text-white transition-all">Exit</button>
          </div>
      </div>

      <nav className="flex gap-8 mb-10 border-b border-white/5 pb-4">
          {['catalog', 'documentation', 'settings'].map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t as Tab)} 
                className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all pb-4 relative ${activeTab === t ? 'text-brand-gold' : 'text-slate-500 hover:text-white'}`}
              >
                  {t}
                  {activeTab === t && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-gold animate-blur-in"></div>}
              </button>
          ))}
      </nav>

      {activeTab === 'catalog' && (
          <div className="space-y-6">
              {/* Toolbar */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                  <div className="flex bg-black p-1 rounded border border-white/5">
                      <button onClick={() => setSearchScope('local')} className={`px-5 py-2 text-[9px] font-black uppercase rounded ${searchScope === 'local' ? 'bg-white/5 text-white shadow-inner' : 'text-slate-600 hover:text-white'}`}>Local DB</button>
                      <button onClick={() => setSearchScope('spotify_album')} className={`px-5 py-2 text-[9px] font-black uppercase rounded flex items-center gap-2 ${searchScope === 'spotify_album' ? 'bg-[#1DB954] text-black shadow-lg' : 'text-slate-600 hover:text-white'}`}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                          Spotify Import
                      </button>
                  </div>
                  <div className="flex-1 relative">
                      <input 
                        type="text" 
                        placeholder={searchScope === 'local' ? "搜尋歌曲, UPC 或 ISRC..." : "輸入專輯名稱一鍵整張導入..."} 
                        className="w-full h-full bg-black/50 border border-white/10 px-10 text-xs text-white font-bold outline-none focus:border-brand-gold transition-all rounded" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                      <svg className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isSearching ? 'text-brand-gold animate-spin' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
              </div>

              {searchScope === 'spotify_album' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {spotifyAlbums.map(album => (
                          <div key={album.id} className="group bg-slate-900 border border-white/5 rounded-xl overflow-hidden hover:border-brand-gold/50 transition-all flex flex-col">
                              <div className="aspect-square relative overflow-hidden">
                                  <img src={album.images?.[0]?.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" alt="" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button onClick={() => handleImportAlbum(album)} className="bg-brand-gold text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-2xl">Import Catalog</button>
                                  </div>
                              </div>
                              <div className="p-5 flex-1 flex flex-col justify-between">
                                  <div>
                                      <h4 className="text-white font-bold text-sm uppercase truncate mb-1">{album.name}</h4>
                                      <p className="text-[10px] text-slate-500 font-mono">{album.release_date} • {album.total_tracks} Tracks</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {spotifyAlbums.length === 0 && !isSearching && searchTerm.length > 2 && (
                          <div className="col-span-full py-20 text-center text-slate-600 uppercase tracking-widest text-xs font-black">No albums found on Spotify</div>
                      )}
                  </div>
              ) : (
                  <div className="space-y-4 animate-fade-in">
                      {groupedCatalog.map(group => {
                          const main = group[0];
                          const key = main.upc ? normalizeIdentifier(main.upc) : `SINGLE_${main.id}`;
                          const isExpanded = expandedGroups.has(key);
                          const albumSelectedCount = group.filter(s => selectedIds.has(s.id)).length;
                          const isFullySelected = albumSelectedCount === group.length;

                          return (
                              <div key={key} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${isFullySelected ? 'border-brand-gold/40' : 'border-white/5'}`}>
                                  {/* Album Header */}
                                  <div className="p-4 flex items-center gap-6 cursor-pointer hover:bg-white/[0.02]" onClick={() => {
                                      const next = new Set(expandedGroups);
                                      if (next.has(key)) next.delete(key); else next.add(key);
                                      setExpandedGroups(next);
                                  }}>
                                      <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                          <input 
                                            type="checkbox" 
                                            checked={isFullySelected} 
                                            ref={el => el && (el.indeterminate = albumSelectedCount > 0 && !isFullySelected)}
                                            onChange={() => toggleSelectAlbum(group)}
                                            className="w-4 h-4 rounded-sm accent-brand-gold border-white/20 bg-black"
                                          />
                                      </div>
                                      <img src={main.coverUrl} className="w-12 h-12 object-cover rounded shadow-lg" alt="" />
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3">
                                              <h4 className="text-white font-bold text-sm truncate uppercase tracking-widest">{main.title}</h4>
                                              <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-slate-500 uppercase font-black">{group.length} Tracks</span>
                                          </div>
                                          <p className="text-[9px] text-slate-600 font-mono mt-1 uppercase tracking-widest">{main.releaseDate} • UPC: {main.upc || 'NONE'}</p>
                                      </div>
                                      <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                      </div>
                                  </div>

                                  {/* Tracks List */}
                                  {isExpanded && (
                                      <div className="border-t border-white/5 bg-black/20">
                                          <table className="w-full text-left text-[10px] font-mono">
                                              <thead className="text-slate-600 uppercase tracking-widest border-b border-white/5 bg-black/40">
                                                  <tr>
                                                      <th className="p-4 w-12"></th>
                                                      <th className="p-4">Track Title</th>
                                                      <th className="p-4">ISRC</th>
                                                      <th className="p-4 text-center">Status</th>
                                                      <th className="p-4 text-right">Action</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-white/5">
                                                  {group.map((song, idx) => (
                                                      <tr key={song.id} className={`hover:bg-white/[0.02] ${selectedIds.has(song.id) ? 'bg-brand-gold/10' : ''}`}>
                                                          <td className="p-4 text-center">
                                                              <input 
                                                                type="checkbox" 
                                                                checked={selectedIds.has(song.id)} 
                                                                onChange={() => toggleSelect(song.id)}
                                                                className="w-4 h-4 rounded-sm accent-brand-gold border-white/10 bg-black"
                                                              />
                                                          </td>
                                                          <td className="p-4 font-bold text-slate-200 uppercase tracking-wider">{song.title}</td>
                                                          <td className="p-4 text-slate-500">{song.isrc}</td>
                                                          <td className="p-4 text-center">
                                                              <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-3 py-1 text-[8px] font-black rounded ${song.isInteractiveActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-800 text-slate-600 border border-white/5'}`}>{song.isInteractiveActive ? 'ACTIVE' : 'LOCKED'}</button>
                                                          </td>
                                                          <td className="p-4 text-right space-x-3">
                                                              <button onClick={() => playSong(song)} className={`text-[9px] font-black uppercase tracking-widest ${currentSong?.id === song.id && isPlaying ? 'text-brand-gold' : 'text-slate-500 hover:text-white'}`}>Preview</button>
                                                              <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] font-black text-slate-700 hover:text-white uppercase">Edit</button>
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
              )}
          </div>
      )}

      {/* Batch Toolbar (Floating) */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] bg-slate-900 border border-brand-gold/30 rounded-full px-10 py-6 flex items-center gap-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-fade-in-up backdrop-blur-3xl">
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">{selectedIds.size} SELECTED</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-[8px] text-slate-500 uppercase tracking-widest text-left hover:text-white">Clear All</button>
              </div>
              <div className="h-10 w-[1px] bg-white/10"></div>
              <div className="flex gap-4">
                  <button onClick={() => handleBatchUpdateStatus(true)} className="px-6 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-500 transition-all">Enable Lab</button>
                  <button onClick={() => handleBatchUpdateStatus(false)} className="px-6 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-slate-700 transition-all">Lock Lab</button>
                  <button onClick={handleBatchDelete} className="px-6 py-2 border border-red-900 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-red-900 hover:text-white transition-all">Delete</button>
              </div>
          </div>
      )}

      {/* Documentation Tab */}
      {activeTab === 'documentation' && (
          <div className="animate-fade-in space-y-8">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Metadata Catalog View</h3>
                  <button onClick={() => {
                      const csv = songs.map(s => `${s.title},${s.isrc},${s.upc},${s.releaseDate},${s.language}`).join('\n');
                      const blob = new Blob([`Title,ISRC,UPC,ReleaseDate,Language\n${csv}`], { type: 'text/csv' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'WILLWI_CATALOG.csv'; a.click();
                  }} className="px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest border border-white/10">Download CSV Report</button>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-x-auto shadow-2xl">
                  <table className="w-full text-left text-[10px] font-mono border-collapse">
                      <thead className="bg-black text-slate-600 font-black uppercase tracking-[0.2em]">
                          <tr>
                              <th className="p-4">Title</th>
                              <th className="p-4">ISRC Code</th>
                              <th className="p-4">UPC / EAN</th>
                              <th className="p-4">Language</th>
                              <th className="p-4">Release Date</th>
                              <th className="p-4">Label</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-400">
                          {songs.map(s => (
                              <tr key={s.id} className="hover:bg-white/[0.02]">
                                  <td className="p-4 font-bold text-white uppercase">{s.title}</td>
                                  <td className="p-4">{s.isrc || '-'}</td>
                                  <td className="p-4">{s.upc || '-'}</td>
                                  <td className="p-4">{s.language}</td>
                                  <td className="p-4">{s.releaseDate}</td>
                                  <td className="p-4 truncate max-w-[150px]">{s.releaseCompany || 'Willwi Music'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
              <div className="bg-slate-900 border border-brand-accent/20 p-10 rounded-2xl shadow-2xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.4em] mb-8">Data & Sync Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-xl">
                          <h4 className="text-white text-base font-bold mb-3">Backup Local DB</h4>
                          <p className="text-[10px] text-slate-500 mb-8 leading-loose uppercase tracking-widest">下載目前所有歌曲 metadata 至 JSON 檔案供手動存檔。</p>
                          <button onClick={() => dbService.getAllSongs().then(data => {
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `WILLWI_META_BAK.json`; a.click();
                          })} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">Generate JSON</button>
                      </div>
                      <div className="p-8 bg-black/40 border border-red-900/20 rounded-xl">
                          <h4 className="text-red-400 text-base font-bold mb-3">Restore & Overwrite</h4>
                          <p className="text-[10px] text-slate-500 mb-8 leading-loose uppercase tracking-widest">上傳 JSON 備份檔。注意：這會完全清除目前的資料庫內容。</p>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && window.confirm('確定要執行全資料覆蓋嗎？')) {
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
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-red-900 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all">Upload JSON</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
