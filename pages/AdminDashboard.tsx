
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { useToast } from '../components/Layout';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { 
    songs, 
    updateSong, 
    deleteSong, 
    bulkAddSongs, 
    bulkAppendSongs, 
    refreshData,
    globalSettings,
    setGlobalSettings,
    uploadSettingsToCloud,
    isSyncing
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'json' | 'discovery' | 'settings' | 'backup'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [upcFilter, setUpcFilter] = useState(''); // New UPC Filter state
  const [jsonInput, setJsonInput] = useState('');
  
  // Selection State
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());

  // Spotify Search State
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSongs = songs.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && s.isrc.includes(searchTerm)) ||
      (s.upc && s.upc.includes(searchTerm));
    
    const matchesUpc = !upcFilter || (s.upc && s.upc.includes(upcFilter));
    
    return matchesSearch && matchesUpc;
  });

  const handleAdminPlay = (song: Song) => {
    if (!audioRef.current) return;
    if (adminPlayingId === song.id) {
      audioRef.current.pause();
      setAdminPlayingId(null);
    } else {
      const url = resolveDirectLink(song.audioUrl || song.dropboxUrl || '');
      if (!url) return showToast("此作品尚未配置有效音訊", "error");
      setAdminPlayingId(song.id);
      audioRef.current.src = url;
      audioRef.current.play().catch(() => showToast("播放失敗", "error"));
    }
  };

  const handleQrUpload = (key: 'qr_support' | 'qr_production' | 'qr_cinema' | 'qr_global_payment' | 'portraitUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...globalSettings, [key]: base64 };
        setGlobalSettings(newSettings);
        showToast("資產已暫存");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
      try {
          await uploadSettingsToCloud(globalSettings);
          showToast("全站設定已同步至雲端");
      } catch (e) {
          showToast("同步失敗", "error");
      }
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSearchingSpotify(true);
    try {
      const results = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(results);
      setSelectedSpotifyIds(new Set());
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const toggleCatalogSelection = (id: string) => {
    const next = new Set(selectedCatalogIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCatalogIds(next);
  };

  const toggleSpotifySelection = (id: string) => {
    const next = new Set(selectedSpotifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpotifyIds(next);
  };

  const toggleAllCatalog = () => {
    if (selectedCatalogIds.size === filteredSongs.length) {
      setSelectedCatalogIds(new Set());
    } else {
      setSelectedCatalogIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  const handleBulkToggleInteractive = async () => {
    if (selectedCatalogIds.size === 0) return;
    for (const song of filteredSongs.filter(s => selectedCatalogIds.has(s.id))) {
      await updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive });
    }
    showToast(`已更新 ${selectedCatalogIds.size} 首作品狀態`);
    setSelectedCatalogIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedCatalogIds.size === 0) return;
    if (window.confirm(`確定要刪除選取的 ${selectedCatalogIds.size} 首作品？`)) {
      for (const id of selectedCatalogIds) {
        await deleteSong(id);
      }
      showToast(`已刪除 ${selectedCatalogIds.size} 首作品`);
      setSelectedCatalogIds(new Set());
    }
  };

  const handleBulkImportSpotify = async () => {
    const toImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
    if (toImport.length === 0) return;
    const formattedSongs: Song[] = toImport.map(t => ({
      id: t.external_ids?.isrc || t.id,
      title: t.name,
      coverUrl: t.album?.images?.[0]?.url || '',
      language: Language.Mandarin,
      projectType: ProjectType.Indie,
      releaseCategory: t.album?.total_tracks > 1 ? ReleaseCategory.Album : ReleaseCategory.Single,
      releaseDate: t.album?.release_date || new Date().toISOString().split('T')[0],
      isEditorPick: false,
      isInteractiveActive: true,
      isrc: t.external_ids?.isrc || '',
      upc: t.album?.external_ids?.upc || '',
      spotifyLink: t.external_urls?.spotify || '',
      releaseCompany: t.album?.label || '',
      publisher: '',
      credits: `© ${new Date().getFullYear()} Willwi Music. All rights reserved.`,
      origin: 'local'
    }));
    await bulkAppendSongs(formattedSongs);
    showToast(`已匯入 ${formattedSongs.length} 首作品`);
    setSpotifyResults([]);
    setSelectedSpotifyIds(new Set());
    setActiveTab('catalog');
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return showToast("JSON 不能為空", "error");
    try {
      const data = JSON.parse(jsonInput);
      if (Array.isArray(data)) {
        if (window.confirm(`確定覆寫資料？`)) {
          await bulkAddSongs(data);
          showToast("資料庫重建完成");
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (e) { showToast("JSON 格式錯誤", "error"); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-8">
        <div className="p-16 max-w-md w-full text-center space-y-12 bg-white/[0.02] border border-white/5 rounded-sm">
          <h2 className="text-4xl font-black text-white uppercase tracking-[0.3em]">Console</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border-b border-white/20 px-4 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-xs hover:bg-white transition-all">Identify Manager</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-40 px-10 md:px-20">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-10">
        <div>
          <h1 className="text-8xl font-black text-white uppercase tracking-tighter leading-none mb-4">MANAGEMENT</h1>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
             <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">
                HEALTH: {songs.length} TRACKS SYNCHRONIZED
             </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/add')} className="h-12 px-8 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all">手動錄入單曲</button>
          <button onClick={logoutAdmin} className="h-12 px-6 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-900/20 transition-all">安全退出</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-16 gap-12 overflow-x-auto no-scrollbar">
        {[
          { id: 'catalog', label: '作品列表總庫' },
          { id: 'discovery', label: 'SPOTIFY 採集' },
          { id: 'json', label: '數據中心 (JSON)' },
          { id: 'settings', label: '環境設置' },
          { id: 'backup', label: '數據備份' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === tab.id ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-10 animate-fade-in">
          <div className="flex flex-col lg:flex-row justify-between items-end border-b border-white/5 pb-6 gap-6">
            <div className="flex-1 w-full max-w-2xl">
              <input 
                type="text" 
                placeholder="SEARCH TITLE / ISRC / UPC..." 
                className="w-full bg-transparent py-4 text-3xl outline-none text-white font-black uppercase tracking-widest placeholder:text-white/5" 
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); setSelectedCatalogIds(new Set()); }} 
              />
            </div>
            
            <div className="flex flex-wrap gap-4 items-center mb-1">
              {/* UPC Filter Option */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">UPC Filter:</span>
                <input 
                  type="text" 
                  placeholder="EXACT UPC..." 
                  className="bg-white/5 border border-white/10 px-4 py-2 text-xs text-white font-bold outline-none focus:border-brand-gold rounded-sm w-40"
                  value={upcFilter}
                  onChange={e => { setUpcFilter(e.target.value); setSelectedCatalogIds(new Set()); }}
                />
              </div>

              {selectedCatalogIds.size > 0 && (
                <div className="flex gap-4 animate-fade-in">
                  <button onClick={handleBulkToggleInteractive} className="h-10 px-6 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">切換互動狀態 ({selectedCatalogIds.size})</button>
                  <button onClick={handleBulkDelete} className="h-10 px-6 bg-rose-600/20 text-rose-400 border border-rose-600/50 text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">批次刪除 ({selectedCatalogIds.size})</button>
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/[0.02] text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] border-y border-white/5">
                        <th className="p-8 w-12 text-center">
                          <input type="checkbox" className="w-4 h-4 rounded-sm bg-black border border-white/20 checked:bg-brand-gold" onChange={toggleAllCatalog} checked={selectedCatalogIds.size > 0 && selectedCatalogIds.size === filteredSongs.length} />
                        </th>
                        <th className="p-8 w-24">AUDITION</th>
                        <th className="p-8">WORK INFORMATION</th>
                        <th className="p-8">RELEASE METADATA</th>
                        <th className="p-8 text-center">STUDIO ACCESS</th>
                        <th className="p-8 text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} className={`group hover:bg-white/[0.01] transition-all duration-300 ${selectedCatalogIds.has(song.id) ? 'bg-brand-gold/5' : ''}`}>
                            <td className="p-8 text-center">
                              <input type="checkbox" className="w-4 h-4 rounded-sm bg-black border border-white/20 checked:bg-brand-gold" checked={selectedCatalogIds.has(song.id)} onChange={() => toggleCatalogSelection(song.id)} />
                            </td>
                            <td className="p-8">
                                <button 
                                  onClick={() => handleAdminPlay(song)}
                                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-white/10 text-white/20 hover:border-white hover:text-white hover:scale-110'}`}
                                >
                                  {adminPlayingId === song.id ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                </button>
                            </td>
                            <td className="p-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-slate-900 border border-white/10 overflow-hidden shadow-2xl shrink-0">
                                      <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[4s]" alt="" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black uppercase tracking-wider text-base mb-1 group-hover:text-brand-gold transition-colors">{song.title}</h4>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{song.projectType || '獨立發行'}</p>
                                            {song.videoUrl && <span className="text-[7px] bg-brand-gold text-black px-2 py-0.5 font-black rounded-sm">MP4 上檔</span>}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">{song.isrc || 'NO ISRC'}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <p className="text-[9px] text-slate-600 font-black tracking-widest uppercase">{song.releaseDate}</p>
                                        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">UPC: {song.upc || 'N/A'}</p>
                                    </div>
                                    {song.lyrics && <span className="text-[7px] border border-emerald-500/30 text-emerald-500/60 px-2 py-0.5 rounded-sm font-black uppercase tracking-widest">LYRICS EMBEDDED</span>}
                                </div>
                            </td>
                            <td className="p-8 text-center">
                                <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[9px] font-black uppercase py-2 px-5 rounded-sm border transition-all ${song.isInteractiveActive ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400 hover:text-black' : 'text-slate-700 border-white/5 bg-transparent'}`}>
                                   {song.isInteractiveActive ? '開放中' : '關閉中'}
                                </button>
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex justify-end items-center gap-6">
                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors">EDIT</button>
                                  <button onClick={() => { if (window.confirm(`確定要移除「${song.title}」嗎？`)) deleteSong(song.id); }} className="text-[10px] font-black uppercase text-rose-900/60 hover:text-rose-500 transition-colors">DELETE</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab Overhaul */}
      {activeTab === 'settings' && (
        <div className="max-w-[1400px] mx-auto space-y-24 animate-fade-in">
          <div className="space-y-4">
            <h3 className="text-white font-black text-3xl uppercase tracking-widest">環境設置與資產管理</h3>
            <p className="text-slate-600 text-[11px] uppercase tracking-widest font-bold">管理各項專案的收款 QR 與錄製室解鎖機制</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'qr_support', label: '熱能贊助 ($100)' },
              { id: 'qr_production', label: '手作對時 ($320)' },
              { id: 'qr_cinema', label: '大師影視 ($2800)' },
              { id: 'qr_global_payment', label: '通用支付 (GLOBAL)' },
            ].map((qr) => (
              <div key={qr.id} className="bg-[#0f172a] border border-white/5 p-8 rounded-sm text-center flex flex-col items-center group hover:border-brand-gold/20 transition-all">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 group-hover:text-brand-gold transition-colors">{qr.label}</h4>
                <div className="w-full aspect-square bg-black/60 border border-white/10 rounded-sm mb-10 flex flex-col items-center justify-center p-4 relative group-hover:border-brand-gold/30 transition-all">
                  {(globalSettings as any)[qr.id] ? (
                    <img src={(globalSettings as any)[qr.id]} className="w-full h-full object-contain" alt="" />
                  ) : (
                    <div className="text-center opacity-20 flex flex-col items-center gap-4">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em]">NOT CONFIGURED</span>
                    </div>
                  )}
                </div>
                <label className="w-full py-4 bg-white/5 text-white/50 font-black text-[9px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all cursor-pointer border border-white/10">
                  上傳 QR CODE
                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(qr.id as any)} />
                </label>
              </div>
            ))}
          </div>

          <div className="bg-[#0f172a] p-16 border border-white/5 rounded-sm flex flex-col md:flex-row items-center gap-20">
             <div className="flex-1 space-y-6">
                <h4 className="text-white font-black text-2xl uppercase tracking-widest">系統解鎖通行碼 (ACCESS CODE)</h4>
                <p className="text-slate-600 text-[11px] uppercase tracking-widest font-bold leading-loose max-w-lg">
                    這是系統模擬高級解鎖功能的最後一道門檻。<br/>
                    目前的設定將即時同步至雲端主庫，確保所有客戶端都能讀取最新的驗證邏輯。
                </p>
             </div>
             <div className="flex flex-col items-center gap-4">
                 <div className="bg-black border border-white/20 p-8 min-w-[300px] flex flex-col items-center gap-4 group hover:border-brand-gold transition-all duration-700">
                    <input 
                        type="text" 
                        className="bg-transparent text-white font-mono text-7xl text-center w-full outline-none tracking-widest"
                        value={globalSettings.accessCode}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, accessCode: e.target.value })}
                    />
                    <div className="h-[1px] w-full bg-white/10"></div>
                    <span className="text-[9px] text-slate-700 font-black tracking-[0.4em] uppercase">SYSTEM ENCRYPTION: ACTIVE</span>
                 </div>
             </div>
          </div>

          <div className="pt-20 border-t border-white/5 space-y-12">
              <div className="text-center space-y-4">
                  <h3 className="text-slate-600 font-black text-[11px] uppercase tracking-[0.8em]">DATABASE MAINTENANCE</h3>
                  <p className="text-slate-800 text-[9px] uppercase tracking-widest max-w-xl mx-auto leading-relaxed font-bold">
                      若發現不同裝置間的資料不一致，請執行強制同步。<br/>
                      這會清空目前的本地快取並重新從 SUPABASE 提取最新狀態。
                  </p>
              </div>
              <div className="flex justify-center gap-6">
                 <button onClick={refreshData} className="px-16 h-14 border border-white/5 text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white hover:border-white/20 transition-all">強制刷新雲端數據 (FORCE REFRESH)</button>
                 <button onClick={handleSaveSettings} className="px-16 h-14 bg-brand-gold text-black font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-2xl">儲存並同步資產 (SAVE & SYNC)</button>
              </div>
          </div>
        </div>
      )}

      {/* Discovery Tab */}
      {activeTab === 'discovery' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
           <input type="text" placeholder="SPOTIFY TRACK TITLE..." className="w-full bg-black border border-white/10 px-8 py-6 text-3xl outline-none focus:border-brand-gold text-white font-black uppercase tracking-widest" value={spotifyQuery} onChange={e => setSpotifyQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()} />
           <button onClick={handleSpotifySearch} className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-[0.4em]">SEARCH SPOTIFY</button>
           {spotifyResults.length > 0 && (
             <div className="space-y-6">
                <button onClick={handleBulkImportSpotify} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest">BULK IMPORT SELECTED</button>
                <div className="grid grid-cols-2 gap-4">
                    {spotifyResults.map(t => (
                        <div key={t.id} onClick={() => toggleSpotifySelection(t.id)} className={`p-4 border flex items-center gap-4 cursor-pointer ${selectedSpotifyIds.has(t.id) ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5'}`}>
                            <img src={t.album.images?.[0]?.url} className="w-10 h-10 object-cover" />
                            <span className="text-[10px] font-bold text-white uppercase truncate">{t.name}</span>
                        </div>
                    ))}
                </div>
             </div>
           )}
        </div>
      )}

      {/* JSON Tab */}
      {activeTab === 'json' && (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
            <textarea className="w-full h-[500px] bg-[#0f172a] border border-white/5 p-10 text-emerald-500 text-xs font-mono outline-none resize-none custom-scrollbar" value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="PASTE JSON MANIFEST HERE..." />
            <div className="flex justify-end gap-6">
                <button onClick={handleJsonImport} className="px-12 py-5 bg-rose-900/40 text-rose-500 border border-rose-900/50 font-black uppercase text-[10px] tracking-widest">🚨 OVERWRITE MASTER DB</button>
            </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl mx-auto text-center space-y-12 py-20 animate-fade-in">
            <h3 className="text-white font-black text-2xl uppercase tracking-widest">DATABASE BACKUP</h3>
            <button onClick={() => {
                const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `WILLWI_DB_EXPORT.json`;
                a.click();
            }} className="px-20 py-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all">GENERATE MASTER EXPORT</button>
        </div>
      )}
    </div>
  );
}; 

export default AdminDashboard;
