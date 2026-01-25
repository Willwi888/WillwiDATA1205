
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { dbService } from '../services/db';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';

type AdminTab = 'catalog' | 'settings' | 'payment' | 'system';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, updateSong, isSyncing, syncProgress, 
    bulkAddSongs, bulkAppendSongs
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localImporting, setLocalImporting] = useState(false);

  // Spotify Bulk Search State
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm)))
    );
  }, [songs, searchTerm]);

  const handleSaveSettings = async () => {
    await uploadSettingsToCloud(globalSettings);
    showToast("全站設定已同步");
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast("資料備份已下載");
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSpotifySearching(true);
    try {
      const tracks = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(tracks);
      setSelectedSpotifyIds(new Set());
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSpotifySearching(false);
    }
  };

  const toggleSpotifySelection = (id: string) => {
    const next = new Set(selectedSpotifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpotifyIds(next);
  };

  const handleBulkImportSpotify = async () => {
    if (selectedSpotifyIds.size === 0) return;
    
    setLocalImporting(true);
    showToast(`正在導入 ${selectedSpotifyIds.size} 首作品...`);

    const tracksToImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
    const newSongs: Song[] = tracksToImport.map(t => ({
      id: normalizeIdentifier(t.external_ids?.isrc || t.id),
      title: t.name,
      coverUrl: t.album?.images?.[0]?.url || '',
      language: Language.Mandarin,
      projectType: ProjectType.Indie,
      releaseDate: t.album?.release_date || new Date().toISOString().split('T')[0],
      isrc: t.external_ids?.isrc || '',
      upc: t.album?.external_ids?.upc || '',
      spotifyLink: t.external_urls?.spotify || '',
      isInteractiveActive: true,
      isEditorPick: false,
      origin: 'local'
    }));

    const success = await bulkAppendSongs(newSongs);
    if (success) {
      showToast("批量導入成功！");
      setShowSpotifySearch(false);
      setSpotifyResults([]);
      setSpotifyQuery('');
    } else {
      showToast("導入失敗，請重試", "error");
    }
    setLocalImporting(false);
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
                if (window.confirm(`確定要還原備份嗎？此動作將覆寫現有數據。`)) {
                    setLocalImporting(true);
                    const success = await bulkAddSongs(data);
                    if (success) {
                        showToast("備份還原成功！");
                        setTimeout(() => window.location.reload(), 1000);
                    }
                }
            }
          } catch (e) { showToast("還原失敗", "error"); }
          finally { setLocalImporting(false); }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-16 max-w-md w-full text-center space-y-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.4em]">Manager</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="••••" className="w-full bg-black border-b border-white/20 px-4 py-6 text-white text-center tracking-[1em] font-mono text-3xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-widest text-xs">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-48 animate-fade-in pb-40">
      
      {(isSyncing || localImporting) && (
        <div className="fixed top-0 left-0 w-full h-1 z-[1000] bg-white/5">
           <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_15px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">
            {isSyncing ? `SYNCING... ${syncProgress}%` : 'Pure Data Management'}
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowSpotifySearch(!showSpotifySearch)} className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${showSpotifySearch ? 'bg-emerald-500 text-black border-emerald-500' : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}>
            {showSpotifySearch ? 'Close Spotify' : 'Import from Spotify'}
          </button>
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">New Entry</button>
          <button onClick={logoutAdmin} className="h-14 px-12 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Logout</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings', 'payment', 'system'].map(id => (
          <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {id === 'catalog' ? '庫存清單' : id === 'settings' ? '影音設置' : id === 'payment' ? '支付更新' : '系統管理'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          
          {showSpotifySearch && (
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-10 space-y-8 animate-fade-in-up">
              <div className="flex justify-between items-center">
                <h3 className="text-emerald-500 font-black text-xs uppercase tracking-[0.4em]">Spotify Bulk Importer</h3>
                <span className="text-[10px] text-emerald-500/50 font-bold uppercase tracking-widest">{selectedSpotifyIds.size} TRACKS SELECTED</span>
              </div>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="SEARCH SPOTIFY (SONG OR ALBUM)..." 
                  className="flex-1 bg-black border border-emerald-500/20 px-6 py-5 text-white outline-none focus:border-emerald-500" 
                  value={spotifyQuery} 
                  onChange={e => setSpotifyQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()}
                />
                <button onClick={handleSpotifySearch} disabled={isSpotifySearching} className="px-10 bg-emerald-500 text-black font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all">
                  {isSpotifySearching ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </div>

              {spotifyResults.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-4">
                  {spotifyResults.map(track => (
                    <div 
                      key={track.id} 
                      onClick={() => toggleSpotifySelection(track.id)}
                      className={`flex items-center gap-8 p-4 border transition-all cursor-pointer ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500/20 border-emerald-500' : 'bg-black/40 border-white/5 hover:border-emerald-500/50'}`}
                    >
                      <div className={`w-6 h-6 border flex items-center justify-center transition-all ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                        {selectedSpotifyIds.has(track.id) && <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                      </div>
                      <img src={track.album?.images?.[0]?.url} className="w-12 h-12 object-cover" alt="" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white uppercase truncate">{track.name}</h4>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">{track.artists.map((a:any)=>a.name).join(', ')} • {track.album.name}</p>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-500/50">{track.external_ids?.isrc || 'NO ISRC'}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSpotifyIds.size > 0 && (
                <button onClick={handleBulkImportSpotify} className="w-full py-6 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.5em] shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-white transition-all">
                  IMPORT {selectedSpotifyIds.size} SELECTED TRACKS
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <input type="text" placeholder="SEARCH CATALOG..." className="w-full bg-transparent border-b border-white/10 px-4 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="space-y-4">
            {filteredSongs.map((track) => (
              <div key={track.id} className="group flex items-center gap-10 p-8 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                {/* 核心修正：移除 grayscale 全彩顯示 */}
                <img src={track.coverUrl} className="w-20 h-20 object-cover shadow-2xl transition-all" alt="" />
                <div className="flex-1">
                  <h4 className="text-xl font-black text-white uppercase tracking-wider">{track.title}</h4>
                  <div className="flex gap-6 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{track.isrc}</span>
                    <span>{track.releaseDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <button 
                    onClick={() => updateSong(track.id, { isInteractiveActive: !track.isInteractiveActive })}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-sm border ${track.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-600 border-white/10'}`}
                  >
                    {track.isInteractiveActive ? 'Active' : 'Private'}
                  </button>
                  <button onClick={() => navigate(`/add?edit=${track.id}`)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) deleteSong(track.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-all">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">網站視覺背景</h3>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => setGlobalSettings(prev => ({ ...prev, portraitUrl: e.target.value }))} />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">環境背景音樂</h3>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.qr_global_payment} onChange={(e) => setGlobalSettings(prev => ({ ...prev, qr_global_payment: e.target.value }))} />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">獨家音樂 YT 串連 (Exclusive YouTube Link)</h3>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">這會顯示在首頁底部的獨家特輯 Banner 區塊。</p>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.exclusiveYoutubeUrl || ''} onChange={(e) => setGlobalSettings(prev => ({ ...prev, exclusiveYoutubeUrl: e.target.value }))} placeholder="Paste YouTube link here..." />
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Save & Sync</button>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="animate-fade-in space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {['qr_production', 'qr_cinema', 'qr_support', 'qr_line'].map(key => (
              <div key={key} className="p-6 bg-white/[0.01] border border-white/5 text-center space-y-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key.replace('qr_', '').toUpperCase()}</h4>
                <div className="aspect-square bg-white/5 flex items-center justify-center relative group overflow-hidden">
                  {(globalSettings as any)[key] && <img src={(globalSettings as any)[key]} className="w-full h-full object-contain" alt="" />}
                  <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[9px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setGlobalSettings(prev => ({ ...prev, [key]: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all">Sync All Assets</button>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-16 animate-fade-in">
          <div className="space-y-8 bg-white/[0.02] p-10 border border-white/5">
            <h3 className="text-sm font-black text-brand-gold uppercase tracking-widest">數據管理中心</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={downloadFullBackup} className="w-full py-5 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">導出 JSON 備份</button>
               <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 border border-rose-500/30 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">匯入 JSON 備份</button>
               <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
            </div>
          </div>
          <div className="space-y-8 bg-white/[0.02] p-10 border border-white/5">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">工作室解鎖碼</h3>
            <input className="w-40 bg-black border border-white/10 p-6 text-white text-4xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => setGlobalSettings(prev => ({ ...prev, accessCode: e.target.value }))} />
            <button onClick={handleSaveSettings} className="ml-8 px-12 py-5 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">更新</button>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
