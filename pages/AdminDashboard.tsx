
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier, ASSETS } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { dbService } from '../services/db';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks } from '../services/spotifyService';
import { discoverWillwiCatalog, parseWillwiTextCatalog } from '../services/geminiService';

type AdminTab = 'catalog' | 'settings' | 'payment' | 'system';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, uploadSongsToCloud, updateSong, isSyncing, syncProgress, 
    bulkAddSongs, bulkAppendSongs, setCurrentSong, setIsPlaying, isPlaying, currentSong, refreshData
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localImporting, setLocalImporting] = useState(false);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  // YouTube / Bulk State
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResults, setParsedResults] = useState<Partial<Song>[]>([]);

  const [isScanningYT, setIsScanningYT] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);

  // 專輯分組邏輯
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

  const handleAiParse = async () => {
      if (!bulkText.trim()) return showToast("請先貼上文字", "error");
      setIsParsing(true);
      showToast("AI 正在解析您的 220 首歌... 這需要一點時間");
      try {
          const results = await parseWillwiTextCatalog(bulkText);
          setParsedResults(results);
          showToast(`解析成功！共發現 ${results.length} 首歌曲`);
      } catch (e) {
          showToast("解析失敗，請縮短文字長度後重試", "error");
      } finally {
          setIsParsing(false);
      }
  };

  const handleBulkImportParsed = async () => {
      setLocalImporting(true);
      const newSongs: Song[] = parsedResults.map(item => ({
          id: normalizeIdentifier(item.title + (item.releaseDate || '')),
          title: item.title || 'Unknown',
          releaseDate: item.releaseDate || new Date().toISOString().split('T')[0],
          youtubeUrl: item.youtubeUrl || '',
          upc: item.upc || '',
          coverUrl: ASSETS.defaultCover,
          language: Language.Mandarin,
          projectType: ProjectType.Indie,
          isInteractiveActive: true,
          isEditorPick: false,
          origin: 'local'
      }));
      
      const success = await bulkAppendSongs(newSongs);
      if (success) {
          showToast(`🎉 成功同步！${newSongs.length} 首作品已進入雲端`);
          setParsedResults([]);
          setBulkText('');
          setShowBulkImport(false);
      }
      setLocalImporting(false);
  };

  const handleForceSyncAll = async () => {
      const success = await uploadSongsToCloud(songs);
      if (success) showToast("🎉 成功！所有資料（共 " + songs.length + " 首）已推送到雲端");
      else showToast("同步失敗，請檢查網路連線", "error");
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setIsSpotifySearching(true);
    try {
      const tracks = await searchSpotifyTracks(spotifyQuery);
      setSpotifyResults(tracks);
      if (tracks.length === 0) showToast("未找到任何曲目", "error");
    } catch (e) {
      showToast("Spotify 搜尋失敗", "error");
    } finally {
      setIsSpotifySearching(false);
    }
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
      
      {(isSyncing || localImporting || isScanningYT || isParsing) && (
        <div className="fixed top-0 left-0 w-full z-[1000]">
           <div className="h-1.5 bg-white/5 w-full">
              <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_20px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
           </div>
           <div className="bg-brand-gold text-black text-[10px] font-black px-6 py-2 uppercase tracking-[0.3em] inline-block shadow-2xl">
              DATABASE ENGINE PROCESSING: {syncProgress}%
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">
            Cloud Archive: {songs.length} Tracks Syncronized
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setShowBulkImport(!showBulkImport)} 
            className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${showBulkImport ? 'bg-brand-gold text-black border-brand-gold' : 'border-brand-gold text-brand-gold hover:bg-brand-gold/10'}`}
          >
            {showBulkImport ? '關閉批量導入' : '🚀 220 首歌批量導入'}
          </button>
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動新增</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-slate-900">註銷</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings', 'payment', 'system'].map(id => (
          <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {id === 'catalog' ? '庫存清單' : id === 'settings' ? '影音設置' : id === 'payment' ? '付款更新' : '系統管理'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          
          {/* 核心：批量解析區塊 */}
          {showBulkImport && (
            <div className="bg-brand-gold/5 border border-brand-gold/20 p-10 space-y-8 animate-fade-in-up mb-12 rounded-sm shadow-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">AI Bulk Smart Import</h3>
                        <p className="text-[10px] text-slate-500 uppercase mt-2 font-bold">請將您的 YouTube Music 清單或發行後台文字直接貼在下方</p>
                    </div>
                </div>

                <textarea 
                    className="w-full h-64 bg-black border border-brand-gold/20 p-8 text-white text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar"
                    placeholder="例如：
1. 某首歌 - 2024/12/05 - https://music.youtube.com/...
2. 另一首歌 - 2023/11/01
..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                />

                <div className="flex gap-4">
                    <button 
                        onClick={handleAiParse}
                        disabled={isParsing}
                        className="flex-1 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all disabled:opacity-50"
                    >
                        {isParsing ? 'AI 正在解析您的 220 首歌...' : '執行 AI 解析'}
                    </button>
                </div>

                {parsedResults.length > 0 && (
                    <div className="space-y-6 pt-10 border-t border-brand-gold/10">
                        <div className="flex justify-between items-center">
                            <span className="text-brand-gold font-black text-[10px] uppercase">已成功解析 {parsedResults.length} 首歌曲</span>
                            <button onClick={handleBulkImportParsed} className="px-10 py-4 bg-white text-black font-black uppercase text-[10px] hover:bg-brand-gold">確認導入並同步雲端</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-4">
                            {parsedResults.map((p, idx) => (
                                <div key={idx} className="bg-black/40 p-4 border border-white/5 text-[10px] text-slate-400 font-bold uppercase truncate">
                                    {p.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          <div className="relative">
            <input type="text" placeholder="搜尋標題 / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 px-0 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest placeholder:text-white/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="space-y-8">
            {groupedAlbums.map((album) => {
              const main = album[0];
              const isExpanded = expandedAlbums.has(main.id);
              return (
                <div key={main.id} className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all overflow-hidden rounded-sm">
                  <div onClick={() => toggleAlbum(main.id)} className="flex items-center gap-10 p-8 cursor-pointer group">
                    <div className="relative w-24 h-24 shadow-2xl shrink-0">
                      <img src={main.coverUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-black text-white uppercase tracking-wider">{main.title}</h4>
                      <div className="flex gap-8 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        <span className="text-brand-gold">{album.length} TRACKS</span>
                        <span>{main.releaseDate}</span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 border border-white/10 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                       <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/40 animate-fade-in-up">
                      {album.map((track) => (
                        <div key={track.id} className="flex items-center gap-10 p-8 border-b border-white/5 last:border-0 hover:bg-brand-gold/5 transition-all">
                          <div className="flex-1">
                            <p className="text-base font-black text-white uppercase tracking-wider">{track.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-widest">{track.isrc || 'No ISRC'}</p>
                          </div>
                          <div className="flex items-center gap-8">
                             {track.youtubeUrl && <span className="text-red-500 text-[10px] font-black uppercase">YT Link OK</span>}
                             <button onClick={() => navigate(`/add?edit=${track.id}`)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">EDIT</button>
                             <button onClick={() => deleteSong(track.id)} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-all">DEL</button>
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

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-16 animate-fade-in">
          <div className="space-y-8 bg-white/[0.02] p-10 border border-white/5">
            <h3 className="text-sm font-black text-brand-gold uppercase tracking-widest">數據管理中心</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={handleForceSyncAll} disabled={isSyncing} className="w-full py-8 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_20px_40px_rgba(251,191,36,0.2)]">
                  {isSyncing ? "同步中..." : "🚀 強制推送到雲端 (解決封面遺失)"}
               </button>
               <button onClick={refreshData} className="w-full py-8 border border-white/20 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                  🔄 從雲端重新抓取資料
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
