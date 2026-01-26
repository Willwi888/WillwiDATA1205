
import React, { useRef, useState, useEffect } from 'react';
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
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'json' | 'discovery' | 'settings'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  
  // Spotify Search State
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());

  // 管理員試聽狀態
  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleQrUpload = (key: 'qr_support' | 'qr_production' | 'qr_cinema' | 'qr_global_payment') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...globalSettings, [key]: base64 };
        setGlobalSettings(newSettings);
        showToast("QR Code 已暫存，請點擊儲存同步至雲端");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
      try {
          await uploadSettingsToCloud(globalSettings);
          showToast("環境設置已同步至雲端");
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
      showToast("Spotify 搜尋逾時", "error");
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const toggleAllSpotify = () => {
    if (selectedSpotifyIds.size === spotifyResults.length) {
      setSelectedSpotifyIds(new Set());
    } else {
      setSelectedSpotifyIds(new Set(spotifyResults.map(t => t.id)));
    }
  };

  const toggleSpotifySelection = (id: string) => {
    const next = new Set(selectedSpotifyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpotifyIds(next);
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
      origin: 'local'
    }));

    const success = await bulkAppendSongs(formattedSongs);
    if (success) {
      showToast(`✅ 已匯入 ${formattedSongs.length} 首作品`);
      setSpotifyResults([]);
      setSelectedSpotifyIds(new Set());
      setSpotifyQuery('');
      setActiveTab('catalog');
    } else {
      showToast("匯入衝突，請檢查 ISRC", "error");
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return showToast("JSON 不能為空", "error");
    try {
      const data = JSON.parse(jsonInput);
      if (Array.isArray(data)) {
        if (window.confirm(`【危險操作】\n確定覆寫現有數據？`)) {
          await bulkAddSongs(data);
          showToast("✅ 資料庫重建完成");
          setJsonInput('');
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        showToast("格式須為 Array", "error");
      }
    } catch (e) {
      showToast("JSON 語法錯誤", "error");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-8">
        <div className="p-16 max-w-md w-full text-center space-y-12 bg-white/[0.02] border border-white/5 rounded-sm">
          <div className="space-y-4">
             <h2 className="text-4xl font-black text-white uppercase tracking-[0.3em]">Console</h2>
             <p className="text-slate-600 text-[10px] uppercase tracking-[0.5em] font-black">Authorized Personnel Only</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border-b border-white/20 px-4 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.4em] text-xs hover:bg-white transition-all">Identify Manager</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.isrc && s.isrc.includes(searchTerm)) ||
    (s.upc && s.upc.includes(searchTerm))
  );

  return (
    <div className="max-w-[1700px] mx-auto px-10 pt-48 pb-60 animate-fade-in">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-12">
        <div>
          <h1 className="text-[6rem] md:text-[8rem] font-black text-white uppercase tracking-tighter leading-none mb-6">MANAGEMENT</h1>
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-brand-gold animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}></div>
             <p className="text-[10px] text-white font-black uppercase tracking-[0.4em]">
                DATABASE HEALTH: {songs.length} TRACKS SYNCHRONIZED
             </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/add')} className="h-16 px-12 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-2xl">手動錄入單曲</button>
          <button onClick={logoutAdmin} className="h-16 px-8 border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-900/20 hover:text-white transition-all">安全退出</button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/5 mb-20 gap-16 overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { id: 'catalog', label: '作品列表總庫' },
          { id: 'discovery', label: 'SPOTIFY 採集與匯入' },
          { id: 'json', label: '數據中心 (JSON)' },
          { id: 'settings', label: '環境設置' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`pb-8 text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === tab.id ? 'text-brand-gold' : 'text-slate-500 hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.3)]"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          {/* Search Header */}
          <div className="flex justify-between items-end border-b border-white/5 pb-8">
            <div className="flex-1 max-w-4xl">
              <input 
                type="text" 
                placeholder="SEARCH TITLE / ISRC / UPC..." 
                className="w-full bg-transparent py-4 text-3xl outline-none text-white font-black uppercase tracking-widest placeholder:text-white/5" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest pb-4">TOTAL RESULT: {filteredSongs.length}</div>
          </div>
          
          {/* Professional Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-white/[0.02] text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] border-y border-white/5">
                        <th className="p-10 w-24">AUDITION</th>
                        <th className="p-10">WORK INFORMATION</th>
                        <th className="p-10">RELEASE METADATA</th>
                        <th className="p-10 text-center">STUDIO ACCESS</th>
                        <th className="p-10 text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} className="group hover:bg-white/[0.01] transition-all duration-300">
                            <td className="p-10">
                                <button 
                                  onClick={() => handleAdminPlay(song)}
                                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-white/10 text-white/20 hover:border-white hover:text-white hover:scale-110'}`}
                                >
                                  {adminPlayingId === song.id ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                  ) : (
                                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  )}
                                </button>
                            </td>
                            <td className="p-10">
                                <div className="flex items-center gap-8">
                                    <div className="w-16 h-16 bg-slate-900 border border-white/10 overflow-hidden shadow-2xl shrink-0">
                                      <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[4s]" alt="" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black uppercase tracking-wider text-lg mb-1 group-hover:text-brand-gold transition-colors">{song.title}</h4>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{song.projectType || '獨立發行'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-10">
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">{song.isrc || 'NO ISRC'}</p>
                                    <p className="text-[9px] text-slate-600 font-black tracking-widest uppercase">{song.releaseDate}</p>
                                    {song.lyrics && <span className="text-[7px] border border-emerald-500/30 text-emerald-500/60 px-2 py-0.5 rounded-sm font-black uppercase tracking-widest">LYRICS EMBEDDED</span>}
                                </div>
                            </td>
                            <td className="p-10 text-center">
                                <button 
                                  onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} 
                                  className={`text-[9px] font-black uppercase py-2.5 px-6 rounded-sm border transition-all ${song.isInteractiveActive ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400 hover:text-black' : 'text-slate-700 border-white/5 bg-transparent'}`}
                                >
                                   {song.isInteractiveActive ? '開放中' : '關閉中'}
                                </button>
                            </td>
                            <td className="p-10 text-right">
                                <div className="flex justify-end items-center gap-10">
                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">EDIT</button>
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

      {/* Discovery Tab (Spotify) */}
      {activeTab === 'discovery' && (
        <div className="space-y-16 animate-fade-in max-w-5xl">
          <div className="flex flex-col md:flex-row gap-6">
            <input 
              type="text" 
              placeholder="輸入作品標題以搜尋 Spotify 並批次匯入..." 
              className="flex-1 bg-black border border-white/10 px-8 py-6 text-2xl outline-none focus:border-brand-gold text-white font-black uppercase tracking-widest" 
              value={spotifyQuery} 
              onChange={e => setSpotifyQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()}
            />
            <button 
              onClick={handleSpotifySearch}
              disabled={isSearchingSpotify}
              className="px-12 bg-brand-gold text-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50"
            >
              {isSearchingSpotify ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </div>

          {spotifyResults.length > 0 && (
            <div className="space-y-12">
              <div className="flex justify-between items-center border-b border-white/5 pb-8">
                <button onClick={toggleAllSpotify} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">
                  {selectedSpotifyIds.size === spotifyResults.length ? 'DESELECT ALL' : `SELECT ALL (${spotifyResults.length})`}
                </button>
                <button 
                  onClick={handleBulkImportSpotify}
                  disabled={selectedSpotifyIds.size === 0}
                  className="px-12 h-16 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all disabled:opacity-30 shadow-2xl"
                >
                  批次匯入作品庫 ({selectedSpotifyIds.size})
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spotifyResults.map(track => (
                  <div 
                    key={track.id} 
                    onClick={() => toggleSpotifySelection(track.id)}
                    className={`flex items-center gap-6 p-6 border transition-all cursor-pointer group ${selectedSpotifyIds.has(track.id) ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}
                  >
                    <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-all ${selectedSpotifyIds.has(track.id) ? 'border-brand-gold bg-brand-gold' : 'border-white/20'}`}>
                      {selectedSpotifyIds.has(track.id) && <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
                    </div>
                    <img src={track.album?.images?.[1]?.url} className="w-14 h-14 object-cover shadow-xl" />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider truncate mb-1">{track.name}</h4>
                      <p className="text-[9px] text-slate-500 truncate">{track.artists[0].name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* JSON Tab */}
      {activeTab === 'json' && (
        <div className="max-w-6xl space-y-16 animate-fade-in">
           <div className="bg-[#0f172a]/50 p-16 border border-white/5 space-y-12 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-black text-sm uppercase tracking-widest">MASTER COLLECTION DATA</h3>
                <span className="text-emerald-500 text-[9px] font-mono tracking-widest">JSON MANIFEST</span>
            </div>
            <textarea 
              className="w-full h-[600px] bg-black border border-white/10 p-10 text-emerald-500 text-xs font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar shadow-inner leading-relaxed" 
              value={jsonInput} 
              onChange={e => setJsonInput(e.target.value)} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button onClick={handleJsonImport} className="h-20 bg-rose-900/80 text-white font-black uppercase text-xs tracking-[0.4em] hover:bg-rose-700 transition-all shadow-xl">
                   🚨 執行物理覆寫 (DANGER)
                </button>
                <button onClick={async () => {
                   const all = await dbService.getAllSongs();
                   setJsonInput(JSON.stringify(all, null, 2));
                   showToast("資料已載入編輯器");
                }} className="h-20 border border-white/10 text-white/40 font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-black transition-all">
                   讀取雲端主庫
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-6xl space-y-24 animate-fade-in">
          <div className="space-y-16">
            <div className="border-l-4 border-brand-gold pl-8 py-2">
              <h3 className="text-white font-black text-3xl uppercase tracking-widest mb-1">環境設置與資產管理</h3>
              <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold">管理收款與錄製室驗證機制</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { id: 'qr_support', label: '熱能贊助 ($100)', key: 'support' },
                { id: 'qr_production', label: '手作對時 ($320)', key: 'production' },
                { id: 'qr_cinema', label: '大師影視 ($2800)', key: 'cinema' },
                { id: 'qr_global_payment', label: '通用支付 (GLOBAL)', key: 'global' },
              ].map((qr) => (
                <div key={qr.id} className="bg-[#0f172a] border border-white/5 p-8 rounded-sm text-center flex flex-col items-center group hover:border-white/20 transition-all">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 group-hover:text-brand-gold transition-colors">{qr.label}</h4>
                  <div className="w-full aspect-square bg-black/60 border border-white/10 rounded-sm mb-8 flex items-center justify-center overflow-hidden p-4 relative">
                    {(globalSettings as any)[qr.id] ? (
                      <img src={(globalSettings as any)[qr.id]} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <div className="text-center opacity-20">
                          <svg className="w-10 h-10 text-white mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="text-[9px] font-black uppercase tracking-widest">NOT SET</span>
                      </div>
                    )}
                  </div>
                  <label className="w-full py-4 bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer border border-white/10">
                    上傳 QR
                    <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(qr.id as any)} />
                  </label>
                </div>
              ))}
            </div>

            <div className="bg-[#0f172a] p-16 border border-white/5 rounded-sm flex flex-col md:flex-row items-center gap-20">
               <div className="flex-1 space-y-4">
                  <h4 className="text-white font-black text-xl uppercase tracking-widest">解鎖通行碼 (ACCESS CODE)</h4>
                  <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold leading-loose">
                      當使用者完成手動轉帳後，需輸入此代碼以解鎖進階功能。<br/>
                      此設定將同步至雲端主庫，確保所有客戶端驗證一致。
                  </p>
               </div>
               <div className="flex flex-col items-center gap-4">
                   <input 
                      type="text" 
                      className="bg-black border border-brand-gold/40 px-10 py-6 text-brand-gold font-mono text-5xl text-center w-full md:w-80 outline-none focus:border-brand-gold shadow-[0_0_40px_rgba(251,191,36,0.1)]"
                      value={globalSettings.accessCode}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, accessCode: e.target.value })}
                   />
                   <span className="text-[9px] text-slate-700 font-black tracking-widest uppercase">SECURITY LEVEL: ACTIVE</span>
               </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              className="w-full py-10 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.6em] hover:bg-white transition-all shadow-2xl"
            >
               儲存變更並同步雲端數據 (SAVE & SYNC)
            </button>
          </div>

          <div className="bg-[#0f172a]/20 p-20 border border-white/5 space-y-12 rounded-sm text-center">
              <div className="space-y-4">
                  <h3 className="text-slate-600 font-black text-[11px] uppercase tracking-[0.5em]">MAINTENANCE</h3>
                  <p className="text-slate-700 text-[10px] uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
                      若資料顯示不一致，請點擊下方按鈕強制從伺服器重新載入。<br/>
                      這會清空本地快取並重新同步所有作品與設定。
                  </p>
              </div>
              <div className="flex justify-center">
                 <button onClick={refreshData} className="px-16 h-16 border border-white/10 text-white/30 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white transition-all">強制刷新雲端數據 (FORCE REFRESH)</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}; 

export default AdminDashboard;
