
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { getWillwiReleases, getReleaseGroupDetails, getCoverArtUrl, MBReleaseGroup } from '../services/musicbrainzService';
import { searchSpotify, getSpotifyAlbumTracks, SpotifyAlbum } from '../services/spotifyService';
import { discoverYoutubePlaylist } from '../services/geminiService';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, updateSong, globalSettings, setGlobalSettings,
    uploadSettingsToCloud, uploadSongsToCloud, bulkAppendSongs, isSyncing, syncSuccess
  } = useData();
  const { isAdmin, logoutAdmin, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation' | 'settings'>('catalog');
  const [curationSource, setCurationSource] = useState<'mb' | 'spotify' | 'youtube'>('mb');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [curationSearch, setCurationSearch] = useState('');
  const [ytUrl, setYtUrl] = useState('');

  // Data States
  const [mbReleases, setMbReleases] = useState<MBReleaseGroup[]>([]);
  const [spotifyAlbums, setSpotifyAlbums] = useState<SpotifyAlbum[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  const insights = useMemo(() => {
    const txs = getAllTransactions();
    const income = txs.reduce((acc, t) => acc + t.amount, 0);
    const complete = songs.filter(s => s.lyrics && s.audioUrl).length;
    return {
        total: songs.length,
        completeness: songs.length > 0 ? Math.round((complete / songs.length) * 100) : 0,
        income,
        active: songs.filter(s => s.isInteractiveActive).length
    };
  }, [songs, getAllTransactions]);

  const groupedByUPC = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || 'NO_UPC';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  // Actions
  const handleFetchMB = async () => {
      setIsProcessing(true);
      showToast("正在連線至 MusicBrainz...");
      try {
          const res = await getWillwiReleases();
          setMbReleases(res);
          showToast(`已獲取 ${res.length} 個發行項目`);
      } catch (e) { showToast("抓取失敗", "error"); }
      finally { setIsProcessing(false); }
  };

  const handleImportMBRelease = async (rg: MBReleaseGroup) => {
    setImportingId(rg.id);
    showToast(`正在匯入 ${rg.title}...`);
    try {
        const details = await getReleaseGroupDetails(rg.id, rg['primary-type']);
        if (!details) {
            showToast("無法獲取發行詳情", "error");
            return;
        }
        const coverUrl = await getCoverArtUrl(rg.id) || globalSettings.defaultCoverUrl;
        const newSongs: Song[] = details.tracks.map(t => ({
            id: `MB_${t.id}`,
            title: t.title,
            coverUrl: coverUrl,
            language: Language.Mandarin,
            projectType: ProjectType.Indie,
            releaseCategory: details.category,
            releaseDate: details.releaseDate || new Date().toISOString().split('T')[0],
            releaseCompany: details.releaseCompany || 'WILLWI MUSIC',
            isEditorPick: false,
            isInteractiveActive: true,
            origin: 'local' as const,
            lyrics: '',
            audioUrl: '',
        }));
        await bulkAppendSongs(newSongs);
        showToast(`成功匯入 ${newSongs.length} 首曲目`, "success");
    } catch (e) { showToast("MusicBrainz 匯入失敗", "error"); }
    finally { setImportingId(null); }
  };

  const handleSearchSpotify = async () => {
      if (!curationSearch) return;
      setIsProcessing(true);
      try {
          const res = await searchSpotify(curationSearch, 'album');
          setSpotifyAlbums(res.albums);
          if (res.albums.length === 0) showToast("未找到專輯", "error");
      } catch (e) { showToast("Spotify 連線失敗", "error"); }
      finally { setIsProcessing(false); }
  };

  const handleYtPlaylistImport = async () => {
      if (!ytUrl || (!ytUrl.includes('playlist') && !ytUrl.includes('list='))) {
          showToast("請輸入正確的 YouTube 播放清單網址", "error");
          return;
      }
      setIsProcessing(true);
      showToast("AI 正在嗅探網頁內容（無需 API Key）...", "success");
      try {
          const results = await discoverYoutubePlaylist(ytUrl);
          if (results.length > 0) {
              const newSongs: Song[] = results.map((r, idx) => ({
                  id: `YT_${Date.now()}_${idx}`,
                  title: r.title || '未命名曲目',
                  coverUrl: globalSettings.defaultCoverUrl,
                  language: Language.Mandarin,
                  projectType: ProjectType.Indie,
                  releaseDate: new Date().toISOString().split('T')[0],
                  isEditorPick: false,
                  isInteractiveActive: true,
                  origin: 'local',
                  lyrics: '',
                  audioUrl: '',
                  youtubeUrl: r.youtubeUrl || ytUrl
              }));
              await bulkAppendSongs(newSongs);
              showToast(`成功！AI 已解析網頁並匯入 ${newSongs.length} 首作品`, "success");
              setYtUrl('');
          } else {
              showToast("AI 無法讀取該清單，請確認網址是否為公開或不公開", "error");
          }
      } catch (e) { showToast("AI 解析失敗", "error"); }
      finally { setIsProcessing(false); }
  };

  const handleImportSpotifyAlbum = async (album: SpotifyAlbum) => {
      setImportingId(album.id);
      showToast(`正在從 Spotify 批量下載曲目資訊...`);
      try {
          const tracks = await getSpotifyAlbumTracks(album.id);
          const newSongs: Song[] = tracks.map(t => ({
              id: `SP_${t.id}`,
              title: t.name,
              coverUrl: album.images?.[0]?.url || globalSettings.defaultCoverUrl,
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseCategory: album.album_type === 'single' ? ReleaseCategory.Single : ReleaseCategory.Album,
              releaseDate: album.release_date,
              releaseCompany: album.label || 'WILLWI MUSIC',
              isEditorPick: false,
              isInteractiveActive: true,
              origin: 'local',
              lyrics: '',
              audioUrl: '',
              upc: album.external_ids?.upc || album.id.slice(0, 10),
              spotifyLink: t.external_urls?.spotify
          }));
          await bulkAppendSongs(newSongs);
          showToast(`專輯 "${album.name}" 匯入成功`);
      } catch (e) { showToast("匯入失敗", "error"); }
      finally { setImportingId(null); }
  };

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center bg-black px-10"><div className="text-center"><h2 className="text-white font-black uppercase tracking-widest mb-8">Access Denied</h2><button onClick={() => navigate('/admin')} className="text-brand-gold border border-brand-gold px-8 py-3 font-black uppercase tracking-widest">Back to Login</button></div></div>;

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter">指揮中心</h1>
            <div className="flex items-center gap-4 mt-2">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Cloud Link: {syncSuccess ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => uploadSongsToCloud()} disabled={isSyncing} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all disabled:opacity-50">手動備份雲端</button>
            <button onClick={() => navigate('/add')} className="px-8 py-3 bg-brand-accent text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">建立新條目</button>
            <button onClick={logoutAdmin} className="px-8 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase hover:text-white transition-all">關閉控制台</button>
          </div>
      </div>

      <div className="flex gap-12 border-b border-white/5 mb-12 overflow-x-auto no-scrollbar">
          {(['catalog', 'insights', 'curation', 'settings'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all whitespace-nowrap ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
                  {tab === 'catalog' ? '作品目錄' : tab === 'insights' ? '數據洞察' : tab === 'curation' ? '策展中心' : '系統設定'}
              </button>
          ))}
      </div>

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">總作品數</span>
                  <div className="text-4xl font-black text-white">{insights.total}</div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">資料完成度</span>
                  <div className="text-4xl font-black text-white">{insights.completeness}%</div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">互動模式開啟</span>
                  <div className="text-4xl font-black text-emerald-500">{insights.active}</div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">累計支持金額</span>
                  <div className="text-4xl font-black text-brand-gold">NT$ {insights.income.toLocaleString()}</div>
              </div>
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-12 animate-fade-in">
              <input type="text" placeholder="搜尋作品名稱、UPC 或 ISRC..." className="w-full bg-slate-900 border border-white/5 p-6 text-white text-xs outline-none focus:border-brand-gold font-bold tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="space-y-10">
                  {groupedByUPC.map(([upc, items]) => (
                      <div key={upc} className="bg-slate-900/20 border border-white/5 p-8 group hover:border-white/10 transition-all">
                          <h3 className="text-white font-black uppercase tracking-widest text-lg mb-8 border-b border-white/5 pb-4 flex items-center justify-between">
                              <div>
                                {upc === 'NO_UPC' ? '獨立發行' : `UPC: ${upc}`}
                                <span className="text-[10px] text-slate-500 ml-4 font-mono">TRACKS: {items.length}</span>
                              </div>
                          </h3>
                          <div className="space-y-4">
                              {items.map(song => (
                                  <div key={song.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group/row">
                                      <div className="flex items-center gap-6">
                                          <img src={song.coverUrl} className="w-10 h-10 object-cover rounded shadow-lg group-hover/row:scale-110 transition-transform" alt="" />
                                          <div>
                                              <span className="text-slate-300 font-bold text-sm uppercase group-hover/row:text-white transition-colors">{song.title}</span>
                                              <p className="text-[9px] text-slate-600 font-mono mt-1">ISRC: {song.isrc || 'N/A'}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-4">
                                          <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-4 py-2 text-[9px] font-black uppercase border transition-all ${song.isInteractiveActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-slate-700 border-white/5'}`}>
                                              {song.isInteractiveActive ? 'ACTIVE' : 'LOCKED'}
                                          </button>
                                          <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] text-brand-gold font-black uppercase hover:text-white px-4">EDIT</button>
                                          <button onClick={() => window.confirm('確定刪除此作品？') && deleteSong(song.id)} className="text-[9px] text-rose-500 font-black uppercase hover:text-rose-400 px-4">DEL</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'curation' && (
          <div className="space-y-12 animate-fade-in">
              <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
                  {[
                      { id: 'mb', label: 'MusicBrainz (全球庫)' },
                      { id: 'spotify', label: 'Spotify (專輯批量)' },
                      { id: 'youtube', label: 'YouTube (清單 AI)' }
                  ].map(s => (
                      <button key={s.id} onClick={() => setCurationSource(s.id as any)} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${curationSource === s.id ? 'bg-brand-gold text-black shadow-xl shadow-brand-gold/10' : 'text-slate-500 border border-white/5 hover:text-white'}`}>
                          {s.label}
                      </button>
                  ))}
              </div>

              {curationSource === 'mb' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-center bg-brand-gold/5 p-10 border border-brand-gold/20 rounded-sm gap-8">
                          <div className="text-center md:text-left">
                              <h3 className="text-brand-gold font-black uppercase tracking-widest text-sm mb-2">MusicBrainz Curation</h3>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">從全球開放音樂資料庫獲取您的官方發行數據，快速建立基礎條目。</p>
                          </div>
                          <button onClick={handleFetchMB} disabled={isProcessing} className="px-12 py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest shadow-2xl disabled:opacity-50">
                            {isProcessing ? "CONNECTING..." : "FETCH RELEASES"}
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {mbReleases.map(rg => (
                              <div key={rg.id} className="bg-slate-900 border border-white/5 p-8 flex flex-col justify-between group hover:border-brand-gold/30 transition-all">
                                  <div className="mb-8">
                                      <span className="text-[8px] bg-white/5 text-slate-500 px-2 py-1 uppercase font-black mb-4 inline-block">{rg['primary-type']}</span>
                                      <h4 className="text-white font-black text-lg uppercase mb-2 group-hover:text-brand-gold transition-colors">{rg.title}</h4>
                                      <p className="text-[10px] text-slate-500 font-mono">{rg['first-release-date']}</p>
                                  </div>
                                  <button onClick={() => handleImportMBRelease(rg)} disabled={importingId === rg.id} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase hover:bg-brand-gold transition-all">
                                    {importingId === rg.id ? "SYNCING..." : "IMPORT & BACKFILL"}
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {curationSource === 'spotify' && (
                  <div className="space-y-8 animate-fade-in">
                      <div className="bg-[#1DB954]/5 p-10 border border-[#1DB954]/20 rounded-sm">
                          <h3 className="text-[#1DB954] font-black uppercase tracking-widest text-sm mb-6">Spotify Album Batch Importer</h3>
                          <div className="flex flex-col md:flex-row gap-4">
                              <input className="flex-1 bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-[#1DB954] font-bold" placeholder="搜尋專輯名稱或關鍵字..." value={curationSearch} onChange={e => setCurationSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchSpotify()} />
                              <button onClick={handleSearchSpotify} disabled={isProcessing} className="px-12 py-4 bg-[#1DB954] text-white font-black uppercase text-[10px] tracking-widest shadow-2xl">
                                {isProcessing ? "SEARCHING..." : "SEARCH"}
                              </button>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {spotifyAlbums.map(album => (
                              <div key={album.id} className="bg-slate-900 border border-white/5 p-6 group hover:border-[#1DB954]/40 transition-all">
                                  <div className="flex items-center gap-6 mb-8">
                                    <img src={album.images?.[0]?.url} className="w-24 h-24 object-cover rounded shadow-2xl" alt="" />
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-white font-black text-sm uppercase truncate mb-1">{album.name}</h4>
                                        <p className="text-[9px] text-slate-500 uppercase font-mono">{album.release_date} • {album.total_tracks} TRACKS</p>
                                    </div>
                                  </div>
                                  <button onClick={() => handleImportSpotifyAlbum(album)} disabled={importingId === album.id} className="w-full py-4 bg-[#1DB954] text-white font-black text-[10px] uppercase hover:bg-white hover:text-[#1DB954] transition-all">
                                    {importingId === album.id ? "SYNCING..." : "BATCH IMPORT ALBUM"}
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {curationSource === 'youtube' && (
                  <div className="max-w-4xl mx-auto space-y-10 animate-fade-in py-10">
                      <div className="bg-red-600/5 p-12 border border-red-600/20 rounded-sm text-center">
                          <h3 className="text-red-600 font-black uppercase tracking-[0.4em] text-sm mb-6">YouTube Playlist AI Snatched</h3>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-10 leading-loose">
                              貼上公開播放清單網址，AI 會自動掃描頁面上的曲目名稱並批量建立資料庫條目。<br/>無需 YouTube API Key，適合用於匯入現有的發行播放清單。
                          </p>
                          <div className="flex flex-col gap-6">
                              <input 
                                className="w-full bg-black border border-white/10 p-6 text-white text-center text-xs outline-none focus:border-red-600 font-mono" 
                                placeholder="https://www.youtube.com/playlist?list=..." 
                                value={ytUrl}
                                onChange={(e) => setYtUrl(e.target.value)}
                              />
                              <button onClick={handleYtPlaylistImport} disabled={isProcessing || !ytUrl} className="w-full py-6 bg-red-600 text-white font-black uppercase text-xs tracking-[0.4em] shadow-2xl disabled:opacity-30 hover:bg-white hover:text-red-600 transition-all">
                                  {isProcessing ? "AI SNIFFING IN PROGRESS..." : "START AI DISCOVERY"}
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-slate-900/60 p-12 border border-white/5 rounded-sm space-y-8">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs">Security & Passcode</h3>
                  <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Studio Global Passcode</label>
                      <input value={globalSettings.accessCode} onChange={e => setGlobalSettings(p => ({...p, accessCode: e.target.value}))} className="w-full bg-black border border-white/10 p-6 text-white font-mono text-3xl text-center outline-none focus:border-brand-gold transition-all" />
                  </div>
                  <button onClick={() => uploadSettingsToCloud(globalSettings)} className="w-full py-5 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-white transition-all">Update & Sync</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
