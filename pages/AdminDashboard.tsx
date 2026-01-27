
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
    globalSettings, setGlobalSettings, uploadSettingsToCloud, uploadSongsToCloud,
    isSyncing, syncSuccess, syncProgress, lastError
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

  const handleImportAlbum = async (album: any) => {
    if (!window.confirm(`確定要匯入整張專輯 "${album.name}" 嗎？\n這將使用同一個 UPC 將所有曲目歸類為同一專輯。`)) return;
    
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
            id: normalizeIdentifier(t.id), 
            title: t.name,
            coverUrl: cover || globalSettings.defaultCoverUrl,
            language: Language.Mandarin,
            projectType: ProjectType.Indie,
            releaseCategory: category,
            releaseCompany: label,
            releaseDate: releaseDate,
            isEditorPick: false,
            isInteractiveActive: true,
            isrc: '', 
            upc: upc, 
            spotifyLink: t.external_urls?.spotify || '',
            origin: 'local'
        }));

        const success = await bulkAppendSongs(newSongs);
        if (success) {
            alert(`成功匯入 ${newSongs.length} 首曲目！`);
        } else {
            alert(`本地匯入完成，但雲端同步失敗。請檢查診斷訊息。`);
        }
        setSearchMode('local');
        setSearchTerm(album.name);
    } catch (e) {
        alert("匯入發生錯誤。");
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
      if (!window.confirm(`確定要刪除選取的 ${selectedIds.size} 首歌曲嗎？`)) return;
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
      alert("全站 UI 設定已同步至雲端。");
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `WILLWI_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
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
                if (window.confirm(`即將匯入 ${data.length} 筆資料。`)) {
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
            <button 
                onClick={() => uploadSongsToCloud()} 
                disabled={isSyncing}
                className={`h-10 px-6 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-brand-gold transition-all flex items-center gap-2 ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isSyncing ? `Syncing (${syncProgress}%)` : 'Push Cloud Sync'}
            </button>
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all flex items-center gap-2">
                New Song
            </button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800 hover:text-white transition-all">Exit</button>
          </div>
      </div>

      {/* Sync Diagnostic Alert: 重點修復部分 */}
      {!syncSuccess && lastError && (
          <div className="mb-10 p-8 bg-rose-950/40 border border-rose-500/50 rounded-lg animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center font-black">!</div>
                  <div>
                      <h4 className="text-rose-500 font-black text-xs uppercase tracking-widest">Cloud Sync Diagnostic (同步診斷)</h4>
                      <p className="text-slate-400 text-[9px] uppercase tracking-widest">請根據下方報錯訊息調整 Supabase 資料表欄位</p>
                  </div>
              </div>
              <div className="bg-black/60 p-4 rounded font-mono text-[10px] text-rose-300 leading-relaxed overflow-x-auto">
                  {lastError}
              </div>
              <p className="text-slate-500 text-[9px] mt-4 leading-relaxed">
                  💡 常見原因：資料庫欄位名稱（如 cover_url）拼錯，或是 RLS 權限未開啟。<br/>
                  💡 解決方法：確保 Supabase 表格中包含所有 snake_case 欄位，並關閉 RLS 進行測試。
              </p>
          </div>
      )}

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
              <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-2">Access Config</div>
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

              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl min-h-[400px]">
                  {searchMode === 'local' ? (
                    <table className="w-full text-left border-collapse table-auto">
                        <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredSongs.length} /></th>
                                <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>作品資訊 (點擊詳情)</th>
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
                        {/* Spotify 結果渲染區... */}
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* 單曲區塊... */}
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* Settings, Visuals Tabs... */}
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
                          <button onClick={saveVisuals} className="px-10 py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all">Save & Push Cloud</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
