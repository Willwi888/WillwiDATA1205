
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { searchSpotify, getSpotifyAlbum, getSpotifyAlbumTracks } from '../services/spotifyService';

type Tab = 'catalog' | 'settings' | 'payment' | 'curation' | 'visuals';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { 
    songs, updateSong, deleteSong, bulkAppendSongs, 
    globalSettings, setGlobalSettings, uploadSettingsToCloud, uploadSongsToCloud 
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Filters & Sorting & Spotify
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'local' | 'spotify'>('local');
  const [spotifyTrackResults, setSpotifyTrackResults] = useState<any[]>([]);
  const [spotifyAlbumResults, setSpotifyAlbumResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [isImportingBulk, setIsImportingBulk] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing_assets'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'releaseDate', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
      totalUsers: 0,
      incomeProduction: 0,
      incomeDonation: 0,
      activeSongs: 0,
      missingDataSongs: 0
  });

  // Visuals Edit State
  const [visualsForm, setVisualsForm] = useState({
      portraitUrl: '',
      defaultCoverUrl: ''
  });

  useEffect(() => {
      if (isAdmin) {
          const users = getAllUsers();
          const txs = getAllTransactions();
          const prodIncome = txs.filter(t => t.type === 'production').reduce((acc, t) => acc + t.amount, 0);
          const donaIncome = txs.filter(t => t.type === 'donation').reduce((acc, t) => acc + t.amount, 0);
          
          const activeCount = songs.filter(s => s.isInteractiveActive).length;
          const missingCount = songs.filter(s => !s.lyrics || !s.audioUrl).length;

          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome,
              activeSongs: activeCount,
              missingDataSongs: missingCount
          });

          setVisualsForm({
              portraitUrl: globalSettings.portraitUrl,
              defaultCoverUrl: globalSettings.defaultCoverUrl
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions, songs, globalSettings]);

  useEffect(() => {
    if (searchMode === 'spotify') {
        if (searchTerm.length >= 2) {
            const timer = setTimeout(async () => {
                setIsSearchingSpotify(true);
                try {
                    const res = await searchSpotify(searchTerm);
                    setSpotifyTrackResults(res.tracks);
                    setSpotifyAlbumResults(res.albums);
                } catch(e) {
                    console.error(e);
                } finally {
                    setIsSearchingSpotify(false);
                }
            }, 600);
            return () => clearTimeout(timer);
        } else {
            setSpotifyTrackResults([]);
            setSpotifyAlbumResults([]);
        }
    }
  }, [searchMode, searchTerm]);

  // --- 批量匯入邏輯 ---
  const handleImportAlbum = async (album: any) => {
    if (!window.confirm(`確定要匯入整張專輯 "${album.name}" 嗎？\n這將自動建立所有曲目記錄。`)) return;
    
    setIsImportingBulk(true);
    try {
        const fullAlbum = await getSpotifyAlbum(album.id);
        const tracks = await getSpotifyAlbumTracks(album.id);
        
        if (!fullAlbum || tracks.length === 0) {
            alert("獲取專輯曲目失敗。");
            return;
        }

        const upc = fullAlbum.external_ids?.upc || fullAlbum.external_ids?.ean || '';
        const label = fullAlbum.label || 'Willwi Music';
        const cover = fullAlbum.images?.[0]?.url;
        const releaseDate = fullAlbum.release_date;
        const category = fullAlbum.album_type === 'album' ? ReleaseCategory.Album : 
                        (fullAlbum.album_type === 'single' ? ReleaseCategory.Single : ReleaseCategory.EP);

        const newSongs: Song[] = tracks.map((t: any) => ({
            id: normalizeIdentifier(t.id), // 使用 Spotify ID 作為臨時唯一辨識，ISRC 待手動補齊
            title: t.name,
            coverUrl: cover || globalSettings.defaultCoverUrl,
            language: Language.Mandarin,
            projectType: ProjectType.Indie,
            releaseCategory: category,
            releaseCompany: label,
            releaseDate: releaseDate,
            isEditorPick: false,
            isInteractiveActive: true,
            isrc: '', // 專輯清單 API 不提供 ISRC，需後續手動編輯
            upc: upc,
            spotifyLink: t.external_urls?.spotify || '',
            origin: 'local'
        }));

        await bulkAppendSongs(newSongs);
        alert(`成功匯入 ${newSongs.length} 首曲目！請記得點擊「PUSH CLOUD SYNC」同步至雲端。`);
        setSearchMode('local');
        setSearchTerm(album.name);
    } catch (e) {
        console.error("Bulk Import Error:", e);
        alert("匯入過程中發生錯誤。");
    } finally {
        setIsImportingBulk(false);
    }
  };

  const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredSongs.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredSongs.map(s => s.id)));
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(`警告：確定要刪除選取的 ${selectedIds.size} 首歌曲嗎？`)) return;
      for (const id of selectedIds) { await deleteSong(id); }
      setSelectedIds(new Set());
  };

  const saveVisuals = async () => {
      const newSettings = {
          ...globalSettings,
          portraitUrl: visualsForm.portraitUrl,
          defaultCoverUrl: visualsForm.defaultCoverUrl
      };
      setGlobalSettings(newSettings);
      await uploadSettingsToCloud(newSettings);
      alert("網站視覺設定已更新");
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `WILLWI_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
            const result = event.target?.result;
            if (typeof result !== 'string') return;
            const data = JSON.parse(result);
            if (Array.isArray(data)) {
                if (window.confirm(`即將匯入 ${data.length} 筆資料並覆蓋現有內容，確定嗎？`)) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    window.location.reload();
                }
            }
          } catch (e) { alert("匯入失敗。"); }
      };
      reader.readAsText(file);
  };

  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
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

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold">{loginError}</p>}
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
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Central Metadata Hub</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => uploadSongsToCloud()} className="h-10 px-6 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-brand-gold transition-all flex items-center gap-2">
                PUSH CLOUD SYNC
            </button>
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all flex items-center gap-2">
                New Song
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">Exit</button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl cursor-pointer hover:bg-slate-800" onClick={() => {setActiveTab('catalog'); setSearchMode('local');}}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Records</div>
              <div className="text-3xl font-black text-white">{songs.length}</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-emerald-500" onClick={() => setActiveTab('catalog')}>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Interactive Active</div>
              <div className="text-3xl font-black text-emerald-400">{stats.activeSongs}</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-brand-gold" onClick={() => setActiveTab('payment')}>
              <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-2">Payment Setup</div>
              <div className="text-3xl font-black text-white">QR</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-brand-accent" onClick={() => setActiveTab('settings')}>
              <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest mb-2">Backup Center</div>
              <div className="text-3xl font-black text-white">JSON</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-xl border-l-4 border-l-purple-500" onClick={() => setActiveTab('visuals')}>
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">System UI</div>
              <div className="text-3xl font-black text-white">EDIT</div>
          </div>
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-4">
              <div className="bg-slate-900/50 border border-white/10 p-2 rounded-lg flex flex-col md:flex-row gap-2">
                  <div className="flex bg-black/50 rounded-md p-1 border border-white/5">
                      <button onClick={() => setSearchMode('local')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all ${searchMode === 'local' ? 'bg-brand-gold text-black' : 'text-slate-500'}`}>Database</button>
                      <button onClick={() => setSearchMode('spotify')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-sm transition-all flex items-center gap-2 ${searchMode === 'spotify' ? 'bg-[#1DB954] text-black' : 'text-slate-500'}`}>Spotify Discovery</button>
                  </div>
                  <div className="flex-1 relative">
                      <input type="text" placeholder={searchMode === 'local' ? "搜尋作品、ISRC 或 UPC..." : "搜尋曲目、專輯或藝術家名稱..."} className="w-full bg-black/50 border border-transparent focus:border-brand-accent/50 rounded-md pl-10 pr-4 py-3 text-white text-xs font-bold outline-none uppercase" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <svg className={`w-4 h-4 absolute left-3 top-3 ${isSearchingSpotify || isImportingBulk ? 'text-brand-accent animate-spin' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </div>
                  {searchMode === 'local' && (
                    <select className="bg-black/50 text-slate-300 text-xs font-bold px-4 py-3 rounded-md outline-none border-l border-white/5" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                        <option value="all">所有歌曲</option>
                        <option value="active">已開放互動</option>
                        <option value="missing_assets">⚠️ 缺音檔/歌詞</option>
                    </select>
                  )}
                  {searchMode === 'local' && selectedIds.size > 0 && <button onClick={handleBulkDelete} className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-md">刪除選取 ({selectedIds.size})</button>}
              </div>

              {isImportingBulk && (
                  <div className="bg-brand-gold text-black p-4 rounded-lg flex items-center justify-center gap-4 animate-pulse">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-black uppercase tracking-widest">正在大量匯入曲目，請勿關閉視窗...</span>
                  </div>
              )}

              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl min-h-[400px]">
                  {searchMode === 'local' ? (
                    <table className="w-full text-left border-collapse table-auto">
                        <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredSongs.length} /></th>
                                <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>作品資訊</th>
                                <th className="p-4 hidden md:table-cell">UPC / ISRC</th>
                                <th className="p-4 text-center">互動模式</th>
                                <th className="p-4 text-right">管理</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredSongs.length > 0 ? filteredSongs.map(song => (
                                <tr key={song.id} className={`group transition-all ${selectedIds.has(song.id) ? 'bg-brand-gold/10' : 'hover:bg-white/[0.03]'}`}>
                                    <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); handleSelectOne(song.id); }}><input type="checkbox" checked={selectedIds.has(song.id)} readOnly /></td>
                                    <td className="p-4" onClick={() => navigate(`/song/${song.id}`)}><div className="flex items-center gap-4 cursor-pointer"><img src={song.coverUrl} className="w-10 h-10 object-cover rounded shadow-lg" alt="" /><div className="font-bold text-sm text-white group-hover:text-brand-gold transition-colors">{song.title}</div></div></td>
                                    <td className="p-4 hidden md:table-cell text-[10px] font-mono text-slate-400">
                                        <div className="opacity-60">UPC: {song.upc || '---'}</div>
                                        <div>ISRC: {song.isrc || '---'}</div>
                                    </td>
                                    <td className="p-4 text-center"><button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-4 py-1 text-[9px] font-black uppercase border rounded transition-all ${song.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-500 border-white/10'}`}>{song.isInteractiveActive ? 'ON' : 'OFF'}</button></td>
                                    <td className="p-4 text-right"><button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest px-4 py-2 border border-white/5 rounded hover:border-white transition-all">編輯</button></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">沒有找到符合條件的本地歌曲</td></tr>
                            )}
                        </tbody>
                    </table>
                  ) : (
                    <div className="p-8 space-y-12">
                        {/* Albums Section */}
                        {spotifyAlbumResults.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-brand-gold font-black text-[11px] uppercase tracking-[0.4em] border-l-4 border-brand-gold pl-4">Spotify Albums (整張匯入)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {spotifyAlbumResults.map(album => (
                                        <div key={album.id} className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col group hover:border-brand-gold transition-all duration-500">
                                            <div className="aspect-square w-full mb-4 relative overflow-hidden rounded">
                                                <img src={album.images?.[0]?.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]" alt="" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6 text-center">
                                                    <button onClick={() => handleImportAlbum(album)} disabled={isImportingBulk} className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-2xl">Import Full Album</button>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-bold text-white truncate uppercase tracking-widest">{album.name}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[9px] text-slate-500 font-mono">{album.release_date}</span>
                                                <span className="text-[9px] text-brand-gold font-black uppercase">{album.total_tracks} Tracks</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tracks Section */}
                        {spotifyTrackResults.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] border-l-4 border-slate-500 pl-4">Spotify Tracks (單曲匯入)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {spotifyTrackResults.map(track => (
                                        <div key={track.id} className="flex gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-lg group transition-all">
                                            <img src={track.album.images?.[0]?.url} className="w-16 h-16 object-cover rounded shadow-lg" alt="" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                <div>
                                                    <div className="text-xs font-bold text-white truncate group-hover:text-brand-gold transition-colors">{track.name}</div>
                                                    <div className="text-[9px] text-slate-500 truncate">{track.artists.map((a:any)=>a.name).join(', ')}</div>
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    <span className="text-[9px] text-slate-600 font-mono">{track.album.release_date}</span>
                                                    <button onClick={() => navigate('/add', { state: { spotifyTrack: track } })} className="px-3 py-1 bg-[#1DB954] text-black text-[9px] font-black uppercase rounded hover:bg-white transition-all">Import Single</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {spotifyTrackResults.length === 0 && spotifyAlbumResults.length === 0 && !isSearchingSpotify && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-800 space-y-6">
                                <svg className="w-16 h-16 opacity-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Enter Keywords to discover albums & tracks</span>
                            </div>
                        )}
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* Settings, Payment, Visuals tabs remain same but with PUSH CLOUD SYNC logic if needed */}
      {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-brand-accent/30 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-brand-accent uppercase tracking-[0.3em] mb-8">Data Center</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-black/40 border border-white/5 rounded-lg flex flex-col justify-between">
                          <div><h4 className="text-white text-base font-bold mb-3">Export JSON</h4></div>
                          <button onClick={downloadFullBackup} className="w-full py-4 bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded">立即下載備份</button>
                      </div>
                      <div className="p-8 bg-black/40 border border-red-900/30 rounded-lg flex flex-col justify-between">
                          <div><h4 className="text-red-400 text-base font-bold mb-3">Import JSON</h4></div>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-red-500 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded">選擇檔案並覆寫</button>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'visuals' && (
          <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <div className="bg-slate-900 border border-purple-500/30 p-10 rounded-xl">
                  <h3 className="text-xl font-black text-purple-500 uppercase tracking-[0.3em] mb-8">UI Visuals</h3>
                  <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <label className="text-xs font-black text-white uppercase tracking-widest">Home Portrait URL</label>
                              <input value={visualsForm.portraitUrl} onChange={(e) => setVisualsForm(p => ({ ...p, portraitUrl: e.target.value }))} className="w-full bg-black border border-white/10 p-3 text-xs text-slate-300 outline-none focus:border-purple-500" />
                          </div>
                          <div className="space-y-4">
                              <label className="text-xs font-black text-white uppercase tracking-widest">Default Cover URL</label>
                              <input value={visualsForm.defaultCoverUrl} onChange={(e) => setVisualsForm(p => ({ ...p, defaultCoverUrl: e.target.value }))} className="w-full bg-black border border-white/10 p-3 text-xs text-slate-300 outline-none focus:border-purple-500" />
                          </div>
                      </div>
                      <div className="pt-8 border-t border-white/10 flex justify-end">
                          <button onClick={saveVisuals} className="px-10 py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all">SAVE UI CONFIG</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
