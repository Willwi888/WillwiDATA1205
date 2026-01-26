
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

  // QR Code Upload Logic
  const handleQrUpload = (key: 'qr_support' | 'qr_production' | 'qr_cinema' | 'qr_global_payment') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSettings = { ...globalSettings, [key]: base64 };
        setGlobalSettings(newSettings);
        showToast("QR Code 已暫存，請點擊下方的儲存按鈕同步至雲端");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
      try {
          await uploadSettingsToCloud(globalSettings);
          showToast("環境設置已成功同步至雲端伺服器");
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
      showToast("Spotify 搜尋連線超時", "error");
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
      showToast(`✅ 已匯入 ${formattedSongs.length} 首作品至本地庫`);
      setSpotifyResults([]);
      setSelectedSpotifyIds(new Set());
      setSpotifyQuery('');
      setActiveTab('catalog');
    } else {
      showToast("匯入過程發生衝突，請檢查 ISRC 是否重複", "error");
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return showToast("JSON 內容不能為空", "error");
    try {
      const data = JSON.parse(jsonInput);
      if (Array.isArray(data)) {
        if (window.confirm(`【危險操作確認】\n即將覆寫現有數據。確定執行物理覆寫嗎？`)) {
          await bulkAddSongs(data);
          showToast("✅ 資料庫重建完成");
          setJsonInput('');
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        showToast("錯誤：格式必須為 Array", "error");
      }
    } catch (e) {
      showToast("JSON 語法錯誤", "error");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-16 max-w-md w-full text-center space-y-12">
          <div className="space-y-4">
             <h2 className="text-4xl font-black text-white uppercase tracking-[0.3em]">Console</h2>
             <p className="text-slate-600 text-[10px] uppercase tracking-[0.5em] font-black">Authorized Personnel Only</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="ENTER ACCESS CODE" className="w-full bg-black border-b border-white/20 px-4 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
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
    <div className="max-w-screen-2xl mx-auto px-10 py-48 animate-fade-in pb-40">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      <div className="flex justify-between items-end mb-24">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Management</h1>
          <p className={`text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-6 flex items-center gap-4 ${isSyncing ? 'animate-pulse' : ''}`}>
             {isSyncing ? '🔄 Syncing with Supabase...' : `Database Health: ${songs.length} Tracks Synchronized`}
          </p>
        </div>
        <div className="flex gap-6">
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動錄入單曲</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-rose-900 transition-all">安全退出</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-16 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('catalog')} className={`pb-8 text-[11px] font-black uppercase whitespace-nowrap tracking-[0.4em] transition-all ${activeTab === 'catalog' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>作品列表總庫</button>
        <button onClick={() => setActiveTab('discovery')} className={`pb-8 text-[11px] font-black uppercase whitespace-nowrap tracking-[0.4em] transition-all ${activeTab === 'discovery' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>SPOTIFY 採集與匯入</button>
        <button onClick={() => setActiveTab('json')} className={`pb-8 text-[11px] font-black uppercase whitespace-nowrap tracking-[0.4em] transition-all ${activeTab === 'json' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>數據中心 (JSON)</button>
        <button onClick={() => setActiveTab('settings')} className={`pb-8 text-[11px] font-black uppercase whitespace-nowrap tracking-[0.4em] transition-all ${activeTab === 'settings' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>環境設置</button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          <div className="relative">
            <input type="text" placeholder="SEARCH TITLE / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 py-8 text-3xl outline-none focus:border-brand-gold text-white font-black uppercase tracking-widest placeholder:text-white/5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="absolute right-0 bottom-8 text-[10px] font-black text-slate-700 uppercase tracking-widest">Total: {filteredSongs.length}</div>
          </div>
          
          <div className="bg-[#0f172a]/50 border border-white/5 rounded-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] border-b border-white/5">
                      <tr>
                          <th className="p-8 w-24">Play</th>
                          <th className="p-8">Work Information</th>
                          <th className="p-8 hidden md:table-cell">ISRC / Release</th>
                          <th className="p-8 text-center">Interactive</th>
                          <th className="p-8 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredSongs.map(song => (
                          <tr key={song.id} className="group hover:bg-white/[0.02] transition-colors">
                              <td className="p-8">
                                  <button 
                                    onClick={() => handleAdminPlay(song)}
                                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white/30 hover:border-brand-gold hover:text-brand-gold'}`}
                                  >
                                    {adminPlayingId === song.id ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                  </button>
                              </td>
                              <td className="p-8">
                                  <div className="flex items-center gap-6">
                                      <img src={song.coverUrl} className="w-14 h-14 object-cover rounded-sm shadow-xl" />
                                      <div>
                                          <h4 className="text-white font-black uppercase tracking-wider text-base">{song.title}</h4>
                                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">{song.projectType || 'Indie'}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="p-8 hidden md:table-cell">
                                  <div className="space-y-1">
                                      <p className="text-[10px] text-slate-400 font-mono tracking-widest">{song.isrc || 'NO ISRC'}</p>
                                      <p className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">{song.releaseDate}</p>
                                  </div>
                              </td>
                              <td className="p-8 text-center">
                                  <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[10px] font-black uppercase py-2 px-6 rounded-sm border transition-all ${song.isInteractiveActive ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' : 'text-slate-700 border-white/5 bg-transparent'}`}>
                                     {song.isInteractiveActive ? '開放中' : '關閉中'}
                                  </button>
                              </td>
                              <td className="p-8 text-right space-x-6">
                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white">Edit</button>
                                  <button onClick={() => { if (window.confirm(`確定要移除「${song.title}」嗎？`)) deleteSong(song.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500">Delete</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>
      )}

      {activeTab === 'discovery' && (
        <div className="space-y-16 animate-fade-in">
          <div className="flex gap-6 h-20">
            <input 
              type="text" 
              placeholder="輸入作品標題以搜尋 Spotify 並批次匯入..." 
              className="flex-1 bg-black border border-white/10 px-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest placeholder:text-white/5" 
              value={spotifyQuery} 
              onChange={e => setSpotifyQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()}
            />
            <button 
              onClick={handleSpotifySearch}
              disabled={isSearchingSpotify}
              className="px-16 bg-brand-gold text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all disabled:opacity-50"
            >
              {isSearchingSpotify ? 'Searching...' : 'Search'}
            </button>
          </div>

          {spotifyResults.length > 0 && (
            <div className="space-y-10 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-8">
                <div className="flex items-center gap-10">
                   <button onClick={toggleAllSpotify} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">
                      {selectedSpotifyIds.size === spotifyResults.length ? 'DESELECT ALL' : 'SELECT ALL'}
                   </button>
                </div>
                <button 
                  onClick={handleBulkImportSpotify}
                  disabled={selectedSpotifyIds.size === 0}
                  className="px-12 h-14 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 shadow-2xl"
                >
                  批量匯入至作品庫 ({selectedSpotifyIds.size})
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {spotifyResults.map(track => (
                  <div 
                    key={track.id} 
                    onClick={() => toggleSpotifySelection(track.id)}
                    className={`flex items-center gap-8 p-8 border transition-all cursor-pointer rounded-sm group ${selectedSpotifyIds.has(track.id) ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}
                  >
                    <div className={`w-8 h-8 border-2 rounded-full flex items-center justify-center transition-all ${selectedSpotifyIds.has(track.id) ? 'border-brand-gold bg-brand-gold' : 'border-white/20'}`}>
                      {selectedSpotifyIds.has(track.id) && <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
                    </div>
                    <img src={track.album?.images?.[0]?.url} className="w-20 h-20 object-cover rounded-sm shadow-xl grayscale group-hover:grayscale-0 transition-all" />
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-white uppercase tracking-wider mb-2">{track.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="max-w-6xl space-y-16 animate-fade-in">
           <div className="bg-[#0f172a] p-16 border border-white/5 space-y-10 rounded-sm shadow-2xl">
            <textarea 
              className="w-full h-[600px] bg-black border border-white/10 p-12 text-emerald-500 text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar shadow-inner leading-relaxed" 
              value={jsonInput} 
              onChange={e => setJsonInput(e.target.value)} 
            />
            <div className="flex gap-8">
                <button onClick={handleJsonImport} className="flex-1 h-20 bg-brand-gold text-black font-black uppercase text-sm tracking-[0.5em] hover:bg-white transition-all shadow-2xl">
                   執行物理覆寫
                </button>
                <button onClick={async () => {
                   const all = await dbService.getAllSongs();
                   setJsonInput(JSON.stringify(all, null, 2));
                }} className="px-16 h-20 border border-white/10 text-white font-black uppercase text-[11px] tracking-widest hover:bg-white/5 transition-all">
                   讀取資料庫
                </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-6xl space-y-24 animate-fade-in">
          
          {/* 金流 QR Code 設置區域 */}
          <div className="space-y-16">
            <div className="border-l-4 border-brand-gold pl-8 py-2">
              <h3 className="text-white font-black text-3xl uppercase tracking-[0.2em] mb-2">金流 QR Code 與驗證設置</h3>
              <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold">在此管理不同方案的收款圖片與錄製室解鎖通行碼。</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { id: 'qr_support', label: '熱能贊助 ($100)', key: 'support', color: 'slate' },
                { id: 'qr_production', label: '手作對時 ($320)', key: 'production', color: 'brand-gold' },
                { id: 'qr_cinema', label: '大師影視 ($2800)', key: 'cinema', color: 'brand-accent' },
                { id: 'qr_global_payment', label: '通用支付 (Global)', key: 'global', color: 'white' },
              ].map((qr) => (
                <div key={qr.id} className="bg-[#0f172a] border border-white/5 p-8 rounded-sm text-center flex flex-col items-center hover:border-white/20 transition-all">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${qr.key === 'production' ? 'text-brand-gold' : 'text-slate-400'}`}>{qr.label}</h4>
                  <div className="w-full aspect-square bg-black/60 border border-white/10 rounded-sm mb-8 flex items-center justify-center overflow-hidden p-4">
                    {(globalSettings as any)[qr.id] ? (
                      <img src={(globalSettings as any)[qr.id]} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <div className="text-center space-y-2">
                          <svg className="w-8 h-8 text-white/5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="text-[9px] text-slate-800 font-black tracking-widest uppercase">NOT CONFIGURED</span>
                      </div>
                    )}
                  </div>
                  <label className="w-full py-4 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer border border-white/10">
                    SELECT QR IMAGE
                    <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(qr.id as any)} />
                  </label>
                </div>
              ))}
            </div>

            <div className="bg-[#0f172a] p-16 border border-white/5 rounded-sm flex flex-col md:flex-row items-center gap-16">
               <div className="flex-1 space-y-4">
                  <h4 className="text-white font-black text-xl uppercase tracking-widest">系統通行碼 (Access Code)</h4>
                  <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold leading-loose max-w-xl">
                      當使用者完成轉帳後，系統會要求輸入此代碼以完成解鎖。<br/>
                      建議定期更換以維持安全性。目前的解鎖碼將同步至所有客戶端。
                  </p>
               </div>
               <div className="flex flex-col items-center gap-4">
                   <input 
                      type="text" 
                      className="bg-black border border-brand-gold/50 px-10 py-6 text-brand-gold font-mono text-5xl text-center w-full md:w-80 outline-none focus:border-brand-gold shadow-[0_0_40px_rgba(251,191,36,0.1)]"
                      value={globalSettings.accessCode}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, accessCode: e.target.value })}
                   />
                   <span className="text-[9px] text-slate-700 font-black tracking-[0.4em] uppercase">Security Level: High</span>
               </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              className="w-full py-10 bg-brand-gold text-black font-black text-sm uppercase tracking-[0.6em] hover:bg-white transition-all shadow-[0_0_80px_rgba(251,191,36,0.15)] rounded-sm"
            >
               儲存並同步環境設置 (SAVE & SYNC SETTINGS)
            </button>
          </div>

          <div className="bg-[#0f172a]/30 p-20 border border-white/5 space-y-16 rounded-sm text-center">
              <div className="space-y-4">
                  <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.6em]">系統資料與雲端主庫同步</h3>
                  <p className="text-slate-600 text-[10px] uppercase tracking-widest max-w-2xl mx-auto font-bold leading-relaxed">
                      若發現資料與無痕模式或其他裝置不一致，請執行強制刷新。<br/>
                      系統將從雲端伺服器 (Supabase) 重新拉取最新的作品集與配置數據。
                  </p>
              </div>
              <div className="flex justify-center">
                 <button onClick={refreshData} className="px-20 h-20 border border-white/20 text-white font-black text-[11px] uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all">強制刷新雲端數據 (FORCE REFRESH)</button>
              </div>
          </div>

        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
