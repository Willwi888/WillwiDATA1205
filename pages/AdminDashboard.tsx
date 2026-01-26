
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { useToast } from '../components/Layout';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs, bulkAppendSongs, refreshData } = useData();
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
      audioRef.current.play().catch(() => showToast("播放失敗，請檢查 Dropbox 連結是否正確", "error"));
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
        if (window.confirm(`【危險操作確認】\n即將覆寫現有 ${songs.length} 筆作品為新匯入的 ${data.length} 筆數據。\n確定執行物理覆寫嗎？`)) {
          await bulkAddSongs(data);
          showToast("✅ 資料庫重建完成，正在重新載入系統環境...");
          setJsonInput('');
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        showToast("錯誤：匯入格式必須為 Array", "error");
      }
    } catch (e) {
      showToast("JSON 語法解析錯誤，請使用專業編輯器檢查", "error");
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
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-6">Database Health: {songs.length} Tracks Synchronized</p>
        </div>
        <div className="flex gap-6">
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動錄入單曲</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-rose-900 transition-all">安全退出</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-16">
        <button onClick={() => setActiveTab('catalog')} className={`pb-8 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === 'catalog' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>作品列表總庫</button>
        <button onClick={() => setActiveTab('discovery')} className={`pb-8 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === 'discovery' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>Spotify 採集與匯入</button>
        <button onClick={() => setActiveTab('json')} className={`pb-8 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === 'json' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>數據中心 (JSON)</button>
        <button onClick={() => setActiveTab('settings')} className={`pb-8 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === 'settings' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>環境設置</button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-16 animate-fade-in">
          <div className="relative">
            <input type="text" placeholder="SEARCH TITLE / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 py-8 text-3xl outline-none focus:border-brand-gold text-white font-black uppercase tracking-widest placeholder:text-white/5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="absolute right-0 bottom-8 text-[10px] font-black text-slate-700 uppercase tracking-widest">Total: {filteredSongs.length}</div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
              {filteredSongs.map(song => (
                  <div key={song.id} className="flex items-center gap-12 p-10 border border-white/5 bg-white/[0.01] rounded-sm group hover:bg-white/[0.03] transition-all">
                      <button 
                        onClick={() => handleAdminPlay(song)}
                        className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/10 text-white/30 hover:border-brand-gold hover:text-brand-gold'}`}
                      >
                        {adminPlayingId === song.id ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>

                      <img src={song.coverUrl} className="w-24 h-24 object-cover shadow-2xl rounded-sm group-hover:scale-105 transition-transform" />
                      
                      <div className="flex-1">
                          <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{song.title}</h4>
                          <div className="flex items-center gap-10">
                             <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
                                {song.isrc || 'NO ISRC'} • {song.releaseDate} • {song.upc || 'NO UPC'}
                             </p>
                             {song.lyrics && (
                                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20 px-2 py-0.5">Lyrics Embedded</span>
                             )}
                          </div>
                      </div>

                      <div className="flex gap-8 items-center">
                          <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[10px] font-black uppercase py-3 px-6 rounded-sm border transition-all ${song.isInteractiveActive ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-700 border-white/5'}`}>
                             {song.isInteractiveActive ? '開放中' : '關閉中'}
                          </button>
                          <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white px-4">編輯</button>
                          <button onClick={() => { if (window.confirm(`【徹底刪除警告】\n確定要將「${song.title}」從資料庫移除嗎？`)) deleteSong(song.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-colors">刪除</button>
                      </div>
                  </div>
              ))}
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
                   <span className="text-white font-black text-xs uppercase tracking-widest opacity-60">Selection: {selectedSpotifyIds.size} Tracks</span>
                </div>
                <button 
                  onClick={handleBulkImportSpotify}
                  disabled={selectedSpotifyIds.size === 0}
                  className="px-12 h-14 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 shadow-2xl"
                >
                  批量匯入至作品庫
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
                      <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                        {track.external_ids?.isrc || 'NO ISRC'} • {track.album?.release_date}
                      </p>
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
            <div>
                <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.5em] mb-4">專家數據維護 (Raw JSON Access)</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed uppercase tracking-widest max-w-3xl">
                  在此區域，您可以直接對底層數據庫進行物理操作。您可以點擊「讀取 JSON」獲取當前完整 Catalog 結構，修改後點擊「執行覆寫」以強制更新。
                </p>
            </div>
            <textarea 
              className="w-full h-[600px] bg-black border border-white/10 p-12 text-emerald-500 text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar shadow-inner leading-relaxed" 
              placeholder='[ { "id": "...", "title": "...", "upc": "...", "lyrics": "..." }, ... ]'
              value={jsonInput} 
              onChange={e => setJsonInput(e.target.value)} 
            />
            <div className="flex gap-8">
                <button onClick={handleJsonImport} className="flex-1 h-20 bg-brand-gold text-black font-black uppercase text-sm tracking-[0.5em] hover:bg-white transition-all shadow-2xl">
                   執行物理覆寫 (FORCE UPDATE)
                </button>
                <button onClick={async () => {
                   const all = await dbService.getAllSongs();
                   setJsonInput(JSON.stringify(all, null, 2));
                   showToast("現有數據已導出至緩存區");
                }} className="px-16 h-20 border border-white/10 text-white font-black uppercase text-[11px] tracking-widest hover:bg-white/5 transition-all">
                   讀取資料庫
                </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-16 animate-fade-in">
          <div className="bg-[#0f172a] p-16 border border-white/5 space-y-12 rounded-sm">
              <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.5em]">系統環境與雲端同步</h3>
              <div className="space-y-8">
                 <button onClick={refreshData} className="w-full h-16 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">重新從雲端伺服器 (Supabase) 獲取最新 Catalog</button>
                 <p className="text-[10px] text-slate-700 text-center uppercase tracking-widest">此操作會與雲端主庫進行對比並合併數據</p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
