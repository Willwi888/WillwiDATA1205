
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier, ASSETS, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Language, ProjectType, Song, ReleaseCategory } from '../types';
import { parseWillwiTextCatalog } from '../services/geminiService';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

type AdminTab = 'catalog' | 'settings' | 'payment' | 'system';
type ImportMode = 'none' | 'ai' | 'spotify';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, isSyncing, syncProgress, 
    bulkAppendSongs, refreshData, updateSong
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  // 管理員試聽狀態
  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 導入模式與狀態
  const [importMode, setImportMode] = useState<ImportMode>('none');
  
  // AI Import States
  const [bulkText, setBulkText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResults, setParsedResults] = useState<Partial<Song>[]>([]);

  // Spotify Import States
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [selectedSpotifyIds, setSelectedSpotifyIds] = useState<Set<string>>(new Set());
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  // 作品列表分組
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    const filtered = songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm))) ||
      (s.upc && normalizeIdentifier(s.upc).includes(normalizeIdentifier(searchTerm)))
    );
    filtered.forEach(song => {
      const groupKey = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${normalizeIdentifier(song.id)}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });
    return Object.values(groups).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm]);

  const toggleAlbum = (id: string) => {
    const next = new Set(expandedAlbums);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedAlbums(next);
  };

  const handleAdminPlay = (track: Song) => {
      if (adminPlayingId === track.id) {
          audioRef.current?.pause();
          setAdminPlayingId(null);
      } else {
          setAdminPlayingId(track.id);
          const url = resolveDirectLink(track.audioUrl || '');
          if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.play().catch(() => {
                  showToast("試聽載入失敗，請確認音訊連結", "error");
                  setAdminPlayingId(null);
              });
          }
      }
  };

  const handleSettingsChange = (key: string, value: string) => {
      setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
      await uploadSettingsToCloud(globalSettings);
      showToast("✅ 所有設定已同步至雲端");
  };

  const handleQrUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              handleSettingsChange(key, reader.result as string);
              showToast("QR Code 已預覽，請記得點擊下方儲存按鈕");
          };
          reader.readAsDataURL(file);
      }
  };

  // Spotify 搜尋邏輯
  const handleSpotifySearch = async () => {
      if (!spotifyQuery.trim()) return;
      setIsSearchingSpotify(true);
      try {
          const results = await searchSpotifyTracks(spotifyQuery);
          setSpotifyResults(results);
          if (results.length === 0) showToast("找不到匹配的作品", "error");
      } catch (e) {
          showToast("Spotify 搜尋出錯", "error");
      } finally {
          setIsSearchingSpotify(false);
      }
  };

  const toggleSpotifySelection = (id: string) => {
      const next = new Set(selectedSpotifyIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedSpotifyIds(next);
  };

  const importSelectedSpotify = async () => {
      const tracksToImport = spotifyResults.filter(t => selectedSpotifyIds.has(t.id));
      if (tracksToImport.length === 0) return;

      const newSongs: Song[] = tracksToImport.map(t => ({
          id: normalizeIdentifier(t.external_ids?.isrc || t.id),
          title: t.name,
          releaseDate: t.album?.release_date || new Date().toISOString().split('T')[0],
          spotifyLink: t.external_urls?.spotify,
          isrc: t.external_ids?.isrc || '',
          upc: t.album?.external_ids?.upc || '',
          coverUrl: t.album?.images?.[0]?.url || ASSETS.defaultCover,
          releaseCompany: t.album?.label || 'WILLWI MUSIC',
          language: Language.Mandarin,
          projectType: ProjectType.Indie,
          releaseCategory: ReleaseCategory.Single,
          isInteractiveActive: true,
          isEditorPick: false,
          origin: 'local'
      }));

      await bulkAppendSongs(newSongs);
      setImportMode('none');
      setSpotifyResults([]);
      setSelectedSpotifyIds(new Set());
      showToast(`已成功導入 ${newSongs.length} 首作品`);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-16 max-w-md w-full text-center space-y-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.4em]">Manager</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setPasswordInput(''); }} className="space-y-8">
            <input type="password" placeholder="••••" className="w-full bg-black border-b border-white/20 px-4 py-6 text-white text-center tracking-[1em] font-mono text-3xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-widest text-xs">Unlock Console</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-48 animate-fade-in pb-40">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} className="hidden" />

      {isSyncing && (
        <div className="fixed top-0 left-0 w-full z-[1000]">
           <div className="h-1.5 bg-white/5 w-full">
              <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_20px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">
             Connected: {songs.length} Tracks In Cloud
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => setImportMode(importMode === 'ai' ? 'none' : 'ai')} className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${importMode === 'ai' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20 text-white hover:border-brand-gold'}`}>
            AI 批量導入
          </button>
          <button onClick={() => setImportMode(importMode === 'spotify' ? 'none' : 'spotify')} className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${importMode === 'spotify' ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20 text-white hover:border-brand-gold'}`}>
            Spotify 搜尋導入
          </button>
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動新增作品</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-rose-900 transition-all">登出</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {[
          { id: 'catalog', label: '作品清單' },
          { id: 'settings', label: '影音設置' },
          { id: 'payment', label: '付款更新' },
          { id: 'system', label: '系統功能' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12">
          {importMode === 'ai' && (
            <div className="bg-brand-gold/5 border border-brand-gold/20 p-10 space-y-8 animate-fade-in-up">
                <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">AI 批量解析導入</h3>
                <textarea className="w-full h-80 bg-black border border-white/10 p-8 text-white text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar" placeholder="在此貼上 YouTube Music 或文字清單..." value={bulkText} onChange={e => setBulkText(e.target.value)} />
                <button onClick={async () => {
                    if (!bulkText.trim()) return;
                    setIsParsing(true);
                    try {
                        const res = await parseWillwiTextCatalog(bulkText);
                        setParsedResults(res);
                        showToast(`已找到 ${res.length} 首作品，請確認`);
                    } catch(e) { showToast("解析失敗", "error"); }
                    finally { setIsParsing(false); }
                }} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em]">{isParsing ? 'AI 解析中...' : '執行 AI 文字解析'}</button>
                {parsedResults.length > 0 && (
                    <button onClick={async () => {
                        const newSongs: Song[] = parsedResults.map(item => ({
                            id: normalizeIdentifier(item.title + (item.releaseDate || '')),
                            title: item.title || 'Untitled',
                            releaseDate: item.releaseDate || new Date().toISOString().split('T')[0],
                            youtubeUrl: item.youtubeUrl || '',
                            upc: item.upc || '',
                            coverUrl: ASSETS.defaultCover,
                            language: Language.Mandarin, projectType: ProjectType.Indie,
                            isInteractiveActive: true, isEditorPick: false, origin: 'local'
                        }));
                        await bulkAppendSongs(newSongs);
                        setParsedResults([]);
                        setImportMode('none');
                        showToast("已批量同步至雲端庫存");
                    }} className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.4em]">同步至雲端資料庫</button>
                )}
            </div>
          )}

          {importMode === 'spotify' && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-10 space-y-8 animate-fade-in-up">
                <h3 className="text-emerald-500 font-black text-xs uppercase tracking-[0.4em]">Spotify 批量搜尋導入</h3>
                <div className="flex gap-4">
                    <input className="flex-1 bg-black border border-white/10 p-5 text-white text-sm outline-none focus:border-emerald-500" placeholder="搜尋專輯或歌曲名稱..." value={spotifyQuery} onChange={e => setSpotifyQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()} />
                    <button onClick={handleSpotifySearch} className="px-10 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all">搜尋</button>
                </div>
                
                {spotifyResults.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">已選擇 {selectedSpotifyIds.size} 首</span>
                            <button onClick={() => setSelectedSpotifyIds(new Set(spotifyResults.map(t => t.id)))} className="text-[9px] text-brand-gold font-black uppercase">選擇全部</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {spotifyResults.map(track => (
                                <div key={track.id} onClick={() => toggleSpotifySelection(track.id)} className={`flex items-center gap-6 p-4 border cursor-pointer transition-all ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500/20 border-emerald-500' : 'bg-black border-white/5 hover:border-white/20'}`}>
                                    <img src={track.album.images?.[0]?.url} className="w-16 h-16 object-cover rounded-sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold truncate uppercase tracking-widest">{track.name}</p>
                                        <p className="text-[9px] text-slate-500 font-mono mt-1">{track.album.name} • {track.album.release_date}</p>
                                    </div>
                                    <div className={`w-6 h-6 border flex items-center justify-center rounded-sm ${selectedSpotifyIds.has(track.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                                        {selectedSpotifyIds.has(track.id) && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={importSelectedSpotify} className="w-full py-6 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">確認導入選取的作品</button>
                    </div>
                )}
            </div>
          )}

          <div className="space-y-8">
              <input type="text" placeholder="搜尋標題 / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="space-y-8">
                {groupedAlbums.map(album => {
                  const main = album[0];
                  const isExpanded = expandedAlbums.has(main.id);
                  return (
                    <div key={main.id} className="border border-white/5 bg-white/[0.01] rounded-sm">
                      <div onClick={() => toggleAlbum(main.id)} className="flex items-center gap-10 p-8 cursor-pointer group">
                        <img src={main.coverUrl} className="w-24 h-24 object-cover shadow-2xl" />
                        <div className="flex-1">
                          <h4 className="text-2xl font-black text-white uppercase tracking-wider">{main.title}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">{album.length} TRACKS • {main.releaseDate}</p>
                        </div>
                        <div className={`w-10 h-10 border border-white/10 flex items-center justify-center transition-all ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/40">
                          {album.map(track => (
                            <div key={track.id} className="flex items-center gap-10 p-8 border-b border-white/5 last:border-0 hover:bg-brand-gold/5 transition-all">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAdminPlay(track); }} 
                                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === track.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white/40 hover:border-white'}`}
                              >
                                {adminPlayingId === track.id ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                              </button>
                              <div className="flex-1">
                                <p className="text-base font-black text-white uppercase tracking-wider">{track.title}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-1">{track.isrc || '無 ISRC'}</p>
                              </div>
                              <div className="flex items-center gap-8">
                                 <button onClick={(e) => { e.stopPropagation(); navigate(`/add?edit=${track.id}`); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-white">編輯</button>
                                 <button onClick={(e) => { e.stopPropagation(); if (window.confirm("確定要刪除嗎？")) deleteSong(track.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500">刪除</button>
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
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-[#0f172a]/80 p-10 border border-white/5 space-y-10 rounded-sm shadow-2xl">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">影音設置中心 (System Config)</h3>
            <div className="space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase">個人肖像網址 (Willwi Portrait)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={e => handleSettingsChange('portraitUrl', e.target.value)} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase">解鎖通行碼 (Access Code)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-brand-gold font-black text-2xl tracking-[0.5em] text-center outline-none" value={globalSettings.accessCode} onChange={e => handleSettingsChange('accessCode', e.target.value)} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase">首頁精選影片網址 (YouTube URL)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none" value={globalSettings.exclusiveYoutubeUrl || ''} onChange={e => handleSettingsChange('exclusiveYoutubeUrl', e.target.value)} />
                </div>
            </div>
            <button onClick={handleSaveSettings} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">
               儲存所有設置至雲端
            </button>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-[#0f172a]/80 p-10 border border-white/5 space-y-10 rounded-sm shadow-2xl">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">付款 QR Code 更新與維護</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { key: 'qr_production', label: '製作費 QR (Studio)' },
                { key: 'qr_cinema', label: '影院高畫質 QR (Cinema)' },
                { key: 'qr_support', label: '音樂食糧 QR (Support)' },
                { key: 'qr_line', label: 'LINE 官方 QR (Contact)' },
                { key: 'qr_global_payment', label: '全域備用 QR (Global)' }
              ].map(item => (
                <div key={item.key} className="p-8 bg-black/40 border border-white/5 text-center space-y-6">
                    <h4 className="text-[10px] text-white font-black uppercase tracking-widest">{item.label}</h4>
                    <div className="aspect-square bg-slate-900 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden">
                        {(globalSettings as any)[item.key] ? (
                            <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-[9px] text-slate-700 uppercase font-black">Empty Slot</span>
                        )}
                    </div>
                    <label className="block w-full py-4 border border-brand-gold/30 text-brand-gold font-black text-[9px] uppercase tracking-widest hover:bg-brand-gold hover:text-black cursor-pointer transition-all">
                        更新圖片
                        <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                    </label>
                </div>
              ))}
            </div>
            <button onClick={handleSaveSettings} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">
               確認更新所有 QR Code
            </button>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-rose-950/10 border border-rose-900/30 p-10 space-y-10 rounded-sm">
            <h3 className="text-rose-500 font-black text-xs uppercase tracking-[0.4em]">系統備份與數據安全</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={() => {
                   const data = { songs, settings: globalSettings };
                   const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
                   const dl = document.createElement('a');
                   dl.setAttribute("href", dataStr);
                   dl.setAttribute("download", `willwi_full_backup.json`);
                   dl.click();
               }} className="py-8 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black">導出 JSON 完整備份</button>
               <button onClick={refreshData} className="py-8 bg-rose-900 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black">
                  🔄 強制刷新 (同步雲端資料)
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
