
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, ReleaseCategory, Language } from '../types';
import { searchSpotifyAlbums, getSpotifyAlbumTracks } from '../services/spotifyService';
import { useToast } from '../components/Layout';

type Tab = 'catalog' | 'documentation' | 'payment' | 'settings';
type SearchScope = 'local' | 'spotify_album';

const AdminDashboard: React.FC = () => {
  const { 
    songs, updateSong, deleteSong, bulkAppendSongs, 
    playSong, currentSong, isPlaying, uploadSongsToCloud, isSyncing, globalSettings, setGlobalSettings
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser(); 
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('local');
  const [spotifyAlbums, setSpotifyAlbums] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Admin Login State (Local fallback if needed, but primary is UserContext)
  const [passwordInput, setPasswordInput] = useState('');

  // Selection & Batch State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchEditData, setBatchEditData] = useState<Partial<Song>>({});

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

  // Batch Handlers
  const handleBatchUpdate = async () => {
      if (selectedIds.size === 0) return;
      showToast(`正在更新 ${selectedIds.size} 首歌曲...`);
      for (const id of Array.from(selectedIds)) {
          await updateSong(id, batchEditData);
      }
      showToast("批量修改完成", "success");
      setSelectedIds(new Set());
      setIsBatchModalOpen(false);
      setBatchEditData({});
  };

  const handleImportAlbum = async (album: any) => {
      showToast(`解析專輯《${album.name}》...`);
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
              showToast(`匯入成功：${album.name}`, "success");
              setSearchScope('local');
          }
      } catch(e) { showToast("導入失敗", "error"); }
      finally { setIsSearching(false); }
  };

  const handleUpdateGlobalSettings = (updates: any) => {
      const newSettings = { ...globalSettings, ...updates };
      setGlobalSettings(newSettings);
      showToast("本地配置已更新，記得推送同步");
  };

  const handleQrUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              handleUpdateGlobalSettings({ [key]: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center px-6">
              <div className="bg-slate-900 border border-white/10 p-12 w-full max-w-md rounded shadow-2xl animate-fade-in">
                  <h2 className="text-3xl font-black text-white uppercase tracking-widest text-center mb-8">Admin Access</h2>
                  <div className="space-y-6">
                      <input 
                        type="password" 
                        placeholder="ENTER ACCESS CODE" 
                        className="w-full bg-black border border-white/10 p-6 text-white text-center font-mono tracking-[1em] text-2xl outline-none focus:border-brand-gold"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && passwordInput === '8520' && enableAdmin()}
                      />
                      <button 
                        onClick={() => { if(passwordInput === '8520') enableAdmin(); else showToast("密碼錯誤", "error"); }}
                        className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-widest rounded hover:bg-white transition-all"
                      >
                        Login
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-60">
      
      {/* Header with Cleaner Layout to prevent overlapping */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate">Willwi Console</h1>
            <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.4em]">Central Metadata Engine</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button 
                onClick={() => uploadSongsToCloud()} 
                disabled={isSyncing}
                className="h-12 px-8 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-brand-gold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center gap-2 disabled:opacity-50"
            >
                {isSyncing ? "SYNCING..." : "PUSH CLOUD SYNC"}
            </button>
            <button onClick={() => navigate('/add')} className="h-12 px-6 bg-brand-gold text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all">New Release</button>
            <button onClick={logoutAdmin} className="h-12 px-6 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded hover:text-white transition-all">Logout</button>
          </div>
      </div>

      <nav className="flex flex-wrap gap-6 md:gap-12 mb-12 border-b border-white/5 pb-4">
          {['catalog', 'documentation', 'payment', 'settings'].map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t as Tab)} 
                className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all pb-4 relative ${activeTab === t ? 'text-brand-gold' : 'text-slate-500 hover:text-white'}`}
              >
                  {t}
                  {activeTab === t && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-gold animate-blur-in"></div>}
              </button>
          ))}
      </nav>

      {/* CATALOG TAB CONTENT */}
      {activeTab === 'catalog' && (
          <div className="space-y-6">
              <div className="bg-slate-900 border border-white/5 p-4 rounded-lg flex flex-col md:flex-row gap-4">
                  <div className="flex bg-black p-1 rounded border border-white/5">
                      <button onClick={() => setSearchScope('local')} className={`px-4 py-2 text-[9px] font-black uppercase rounded ${searchScope === 'local' ? 'bg-white/5 text-white' : 'text-slate-600'}`}>Local Library</button>
                      <button onClick={() => setSearchScope('spotify_album')} className={`px-4 py-2 text-[9px] font-black uppercase rounded ${searchScope === 'spotify_album' ? 'bg-[#1DB954] text-black' : 'text-slate-600'}`}>Spotify Import</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="搜尋歌曲, UPC 或 ISRC..." 
                    className="flex-1 bg-black/50 border border-white/10 px-6 py-3 text-xs text-white font-bold outline-none focus:border-brand-gold transition-all" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>

              <div className="space-y-4 animate-fade-in">
                  {groupedCatalog.map(group => {
                      const main = group[0];
                      const key = main.upc ? normalizeIdentifier(main.upc) : `SINGLE_${main.id}`;
                      const isExpanded = expandedGroups.has(key);
                      const isSelectedCount = group.filter(s => selectedIds.has(s.id)).length;
                      const isAllSelected = isSelectedCount === group.length;

                      return (
                          <div key={key} className={`bg-slate-900 border rounded transition-all ${isAllSelected ? 'border-brand-gold/30' : 'border-white/5'}`}>
                              <div className="p-4 flex items-center gap-6 cursor-pointer" onClick={() => {
                                  const next = new Set(expandedGroups);
                                  if (next.has(key)) next.delete(key); else next.add(key);
                                  setExpandedGroups(next);
                              }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isAllSelected} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={() => {
                                        const next = new Set(selectedIds);
                                        group.forEach(s => isAllSelected ? next.delete(s.id) : next.add(s.id));
                                        setSelectedIds(next);
                                    }}
                                    className="w-4 h-4 accent-brand-gold"
                                  />
                                  <img src={main.coverUrl} className="w-12 h-12 object-cover rounded shadow-lg" alt="" />
                                  <div className="flex-1 min-w-0">
                                      <h4 className="text-white font-bold text-sm truncate uppercase tracking-widest">{main.title} {group.length > 1 && `(${group.length} Tracks)`}</h4>
                                      <p className="text-[9px] text-slate-600 font-mono mt-1 uppercase">UPC: {main.upc || 'N/A'}</p>
                                  </div>
                                  <div className="flex gap-4 items-center">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); playSong(main); }}
                                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentSong?.id === main.id && isPlaying ? 'bg-brand-gold text-black shadow-lg' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                      >
                                          {currentSong?.id === main.id && isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); navigate(`/add?edit=${main.id}`); }} className="h-10 px-4 text-[10px] font-black text-slate-400 hover:text-white transition-colors">EDIT</button>
                                      <div className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                      </div>
                                  </div>
                              </div>
                              {isExpanded && (
                                  <div className="border-t border-white/5 bg-black/20 animate-fade-in">
                                      {group.map(song => (
                                          <div key={song.id} className={`p-4 flex items-center gap-6 border-b border-white/5 hover:bg-white/[0.02] ${selectedIds.has(song.id) ? 'bg-brand-gold/5' : ''}`}>
                                              <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(song.id)} 
                                                onChange={() => {
                                                    const next = new Set(selectedIds);
                                                    if (next.has(song.id)) next.delete(song.id); else next.add(song.id);
                                                    setSelectedIds(next);
                                                }}
                                                className="w-4 h-4 accent-brand-gold"
                                              />
                                              <div className="flex-1">
                                                  <h5 className="text-xs font-bold text-slate-200">{song.title}</h5>
                                                  <p className="text-[9px] text-slate-500 font-mono">{song.isrc}</p>
                                              </div>
                                              <div className="flex gap-4 items-center">
                                                  <button 
                                                      onClick={() => playSong(song)}
                                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${currentSong?.id === song.id && isPlaying ? 'bg-brand-gold text-black' : 'bg-white/5 text-slate-400'}`}
                                                  >
                                                      {currentSong?.id === song.id && isPlaying ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                                  </button>
                                                  <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-3 py-1 text-[8px] font-black rounded ${song.isInteractiveActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{song.isInteractiveActive ? 'ACTIVE' : 'LOCKED'}</button>
                                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] font-black text-slate-500 hover:text-white">EDIT</button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* DOCUMENTATION TAB CONTENT */}
      {activeTab === 'documentation' && (
          <div className="animate-fade-in space-y-8">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Metadata Catalog View</h3>
                  <button onClick={() => {
                      const csv = songs.map(s => `${s.title},${s.isrc},${s.upc},${s.releaseDate},${s.language}`).join('\n');
                      const blob = new Blob([`Title,ISRC,UPC,ReleaseDate,Language\n${csv}`], { type: 'text/csv' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'WILLWI_CATALOG.csv'; a.click();
                  }} className="px-6 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-all">Download CSV Report</button>
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

      {/* PAYMENT / QR TAB */}
      {activeTab === 'payment' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-white/5 pb-8 gap-6">
                      <div>
                          <h3 className="text-xl font-black text-brand-gold uppercase tracking-[0.3em] mb-2">Access & Payment Configuration</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">管理全站金流 QR Code 與系統存取密碼</p>
                      </div>
                      <div className="bg-black/60 p-4 border border-brand-gold/30 rounded flex items-center gap-4">
                          <label className="text-[10px] font-black text-brand-gold uppercase">System Access Code:</label>
                          <input 
                            className="bg-black text-white font-mono text-center w-24 border-b border-white/20 outline-none focus:border-brand-gold" 
                            value={globalSettings.accessCode}
                            onChange={e => handleUpdateGlobalSettings({ accessCode: e.target.value })}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {[
                        { key: 'qr_global_payment', label: '主要收款 (LINE PAY)', color: 'border-emerald-500/30' },
                        { key: 'qr_line', label: 'LINE 官方帳號', color: 'border-white/10' },
                        { key: 'qr_production', label: '互動解鎖 (320元)', color: 'border-white/10' },
                        { key: 'qr_cinema', label: '影院權限 (2800元)', color: 'border-white/10' },
                        { key: 'qr_support', label: '微贊助 (100元)', color: 'border-white/10' }
                      ].map(item => (
                          <div key={item.key} className={`p-6 bg-black/40 border ${item.color} rounded-xl text-center space-y-6 flex flex-col`}>
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</h4>
                              <div className="flex-1 aspect-square bg-slate-950 border border-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                                  {globalSettings[item.key as keyof typeof globalSettings] ? (
                                      <img src={globalSettings[item.key as keyof typeof globalSettings]} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                      <span className="text-slate-700 text-[8px] uppercase tracking-widest">No Image</span>
                                  )}
                              </div>
                              <label className="block w-full cursor-pointer py-3 bg-white text-black font-black text-[9px] uppercase tracking-widest hover:bg-brand-gold transition-all rounded">
                                  UPLOAD NEW QR
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                              </label>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* SETTINGS / ENGINE TAB */}
      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
              <div className="bg-slate-900 border border-brand-accent/20 p-10 rounded-xl shadow-2xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.4em] mb-8">Database Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-xl">
                          <h4 className="text-white text-base font-bold mb-3">Backup Local DB</h4>
                          <button onClick={() => dbService.getAllSongs().then(data => {
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `WILLWI_BAK.json`; a.click();
                          })} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">Generate JSON</button>
                      </div>
                      <div className="p-8 bg-black/40 border border-red-900/20 rounded-xl">
                          <h4 className="text-red-400 text-base font-bold mb-3">Restore & Overwrite</h4>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && window.confirm('確定執行全覆蓋？')) {
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

      {/* Batch Floating Toolbar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[2000] bg-slate-950 border border-brand-gold/50 rounded-full px-10 py-6 flex items-center gap-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-fade-in-up backdrop-blur-3xl">
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">{selectedIds.size} SELECTED</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-[8px] text-slate-500 uppercase tracking-widest hover:text-white">Clear</button>
              </div>
              <div className="flex gap-4">
                  <button onClick={() => setIsBatchModalOpen(true)} className="px-6 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-brand-gold transition-all">批量修改元數據</button>
                  <button onClick={() => { if(window.confirm('刪除選中作品？')) setSelectedIds(new Set()); }} className="px-6 py-2 border border-red-900 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-red-900 hover:text-white transition-all">刪除選取</button>
              </div>
          </div>
      )}

      {/* Batch Edit Modal */}
      {isBatchModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsBatchModalOpen(false)}></div>
              <div className="relative bg-slate-900 border border-white/10 p-10 w-full max-w-xl rounded-sm shadow-2xl">
                  <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-10">批量修改元數據</h3>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[9px] text-slate-500 uppercase font-black">發行公司 (Label)</label>
                              <input 
                                className="w-full bg-black border border-white/10 p-4 text-xs text-white outline-none focus:border-brand-gold" 
                                placeholder="如: Willwi Music"
                                value={batchEditData.releaseCompany || ''}
                                onChange={e => setBatchEditData({...batchEditData, releaseCompany: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[9px] text-slate-500 uppercase font-black">發行類別</label>
                              <select className="w-full bg-black border border-white/10 p-4 text-xs text-white outline-none" onChange={e => setBatchEditData({...batchEditData, releaseCategory: e.target.value as ReleaseCategory})}>
                                  <option value="">保持不變</option>
                                  {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>
                  <div className="mt-12 flex gap-4">
                      <button onClick={() => setIsBatchModalOpen(false)} className="flex-1 py-4 text-slate-500 text-[10px] font-black uppercase">Cancel</button>
                      <button onClick={handleBatchUpdate} className="flex-1 py-4 bg-brand-gold text-black text-[10px] font-black uppercase hover:bg-white transition-all">Apply Changes to {selectedIds.size} Tracks</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
