
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { getRecordingByISRC, getReleaseBarcode } from '../services/musicbrainzService';
import { discoverYoutubePlaylist, discoverYoutubeReleases } from '../services/geminiService';
import { getSpotifyAlbum, getSpotifyAlbumTracks, SpotifyAlbum, SpotifyTrack } from '../services/spotifyService';
import { Song, Language, ProjectType, ReleaseCategory } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings,
    uploadSongsToCloud, bulkAppendSongs, bulkAddSongs, syncSuccess
  } = useData();
  const { isAdmin, logoutAdmin, getAllTransactions, enableAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation'>('catalog');
  const [curationSource, setCurationSource] = useState<'mb' | 'youtube' | 'spotify' | 'yt_releases'>('mb');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  
  const [ytUrl, setYtUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyAlbumPreview, setSpotifyAlbumPreview] = useState<SpotifyAlbum | null>(null);
  const [spotifyTracksPreview, setSpotifyTracksPreview] = useState<SpotifyTrack[]>([]);
  const [ytReleasesPreview, setYtReleasesPreview] = useState<Partial<Song>[]>([]);
  const [passwordInput, setPasswordInput] = useState('');

  const insights = useMemo(() => {
    const txs = getAllTransactions();
    const income = txs.reduce((acc, t) => acc + t.amount, 0);
    return {
        total: songs.length,
        completeness: songs.length > 0 ? Math.round((songs.filter(s => s.lyrics && s.audioUrl).length / songs.length) * 100) : 0,
        income
    };
  }, [songs, getAllTransactions]);

  const groupedByUPC = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || `TEMP_${s.releaseDate}_${s.releaseCompany}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || (s.isrc && s.isrc.includes(searchTerm)))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  const handleFetchYtReleases = async () => {
      if (!ytUrl) return showToast("請輸入 YouTube 網址", "error");
      
      setIsProcessing(true);
      showToast("AI 正在掃描... 請稍候 (約需 10-20 秒)");
      
      // 加入超時保護，防止 API 無回應時 UI 永久卡死
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI 解析超時，請重試或確認網址")), 25000)
      );

      try {
          const results = await Promise.race([
              discoverYoutubeReleases(ytUrl),
              timeoutPromise
          ]) as Partial<Song>[];

          if (results && results.length > 0) {
              setYtReleasesPreview(results);
              showToast(`掃描成功：發現 ${results.length} 個項目`);
          } else {
              showToast("未偵測到有效內容，請更換網址嘗試", "info");
          }
      } catch (e: any) { 
          console.error(e);
          showToast(e.message || "解析失敗", "error"); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  const handleConfirmYtReleasesImport = async () => {
      if (ytReleasesPreview.length === 0) return;
      setIsProcessing(true);
      try {
          const newSongs: Song[] = ytReleasesPreview.map((r, idx) => ({
              id: `YT_REL_${Date.now()}_${idx}`,
              title: r.title || 'Untitled',
              coverUrl: globalSettings.defaultCoverUrl,
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseDate: new Date().toISOString().split('T')[0],
              releaseCategory: (r.releaseCategory?.toLowerCase().includes('album') || r.description?.includes('首歌')) ? ReleaseCategory.Album : ReleaseCategory.Single,
              youtubeUrl: r.youtubeUrl,
              description: r.description,
              isInteractiveActive: true,
              isEditorPick: false,
              origin: 'local'
          }));
          await bulkAppendSongs(newSongs);
          showToast(`成功匯入 ${newSongs.length} 筆資料`);
          setYtReleasesPreview([]);
          setYtUrl('');
      } catch (e) { showToast("匯入失敗", "error"); }
      finally { setIsProcessing(false); }
  };

  const handleMasterSync = async () => {
    const isrcSongs = songs.filter(s => s.isrc);
    if (isrcSongs.length === 0) return showToast("目前沒有具備 ISRC 的作品可供同步", "info");
    if (!window.confirm(`執行主資料對位？\n系統將自動補完 ISRC 對應的 UPC 與封面資訊。`)) return;
    
    setIsProcessing(true);
    setSyncProgress({ current: 0, total: isrcSongs.length });
    
    let updatedCount = 0;
    const newSongsList = [...songs];

    for (let i = 0; i < newSongsList.length; i++) {
        const s = newSongsList[i];
        if (!s.isrc) continue;
        try {
            await new Promise(resolve => setTimeout(resolve, 1100));
            setSyncProgress(prev => ({ ...prev, current: prev.current + 1 }));
            const mbRecording = await getRecordingByISRC(s.isrc);
            if (mbRecording) {
                const release = mbRecording.releases?.find((r: any) => r.status === 'Official') || mbRecording.releases?.[0];
                let barcode = s.upc || '';
                if (!barcode && release?.id) {
                    await new Promise(resolve => setTimeout(resolve, 1100));
                    barcode = await getReleaseBarcode(release.id);
                }
                newSongsList[i] = { ...s, title: mbRecording.title || s.title, upc: barcode || s.upc, releaseDate: release?.date || s.releaseDate, mbid: mbRecording.id };
                updatedCount++;
            }
        } catch (err) {}
    }
    await bulkAddSongs(newSongsList);
    showToast(`同步完成，更新 ${updatedCount} 筆`);
    setIsProcessing(false);
  };

  const handleFetchSpotifyAlbum = async () => {
    if (!spotifyUrl) return showToast("請輸入 Spotify 連結", "error");
    let albumId = spotifyUrl.trim();
    if (albumId.includes('spotify.com/album/')) {
        const match = albumId.match(/album\/([a-zA-Z0-9]+)/);
        if (match) albumId = match[1];
    }
    setIsProcessing(true);
    try {
        const album = await getSpotifyAlbum(albumId);
        const tracks = await getSpotifyAlbumTracks(albumId);
        if (album) {
            setSpotifyAlbumPreview(album);
            setSpotifyTracksPreview(tracks);
            showToast(`抓取成功：${album.name}`);
        }
    } catch (e) { showToast("抓取失敗", "error"); }
    finally { setIsProcessing(false); }
  };

  /**
   * Fix: Implement handleConfirmSpotifyImport to resolve the compilation error
   * This converts the previewed Spotify tracks into the app's Song format.
   */
  const handleConfirmSpotifyImport = async () => {
      if (!spotifyAlbumPreview || spotifyTracksPreview.length === 0) return;
      setIsProcessing(true);
      try {
          const newSongs: Song[] = spotifyTracksPreview.map((t) => ({
              id: t.id,
              title: t.name,
              coverUrl: spotifyAlbumPreview.images?.[0]?.url || globalSettings.defaultCoverUrl,
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseDate: spotifyAlbumPreview.release_date || new Date().toISOString().split('T')[0],
              releaseCategory: (spotifyAlbumPreview.album_type === 'album') ? ReleaseCategory.Album : (spotifyAlbumPreview.album_type === 'single' ? ReleaseCategory.Single : ReleaseCategory.Album),
              spotifyLink: t.external_urls.spotify,
              isrc: t.external_ids?.isrc || '',
              upc: spotifyAlbumPreview.external_ids?.upc || spotifyAlbumPreview.external_ids?.ean || '',
              releaseCompany: spotifyAlbumPreview.label || '',
              isInteractiveActive: true,
              isEditorPick: false,
              origin: 'local'
          }));
          await bulkAppendSongs(newSongs);
          showToast(`成功從 Spotify 匯入 ${newSongs.length} 筆資料`);
          setSpotifyAlbumPreview(null);
          setSpotifyTracksPreview([]);
          setSpotifyUrl('');
      } catch (e) { 
          showToast("匯入失敗", "error"); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-900 border border-white/10 p-12 max-w-md w-full shadow-2xl rounded-sm text-center">
          <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-sm mb-10">Manager Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); showToast("權限已解鎖", "success"); } else { showToast("密碼錯誤", "error"); } }} className="space-y-6">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-5 text-white text-center tracking-[1em] outline-none focus:border-brand-gold text-3xl font-mono" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
          <div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter">指揮中心</h1>
            <div className="flex items-center gap-4 mt-2">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Cloud: {syncSuccess ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleMasterSync} disabled={isProcessing} className={`px-8 py-4 ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-brand-gold text-black'} text-[10px] font-black uppercase tracking-widest transition-all shadow-xl`}>
                {isProcessing ? "同步中..." : "🔄 全球主資料對位"}
            </button>
            <button onClick={() => uploadSongsToCloud()} className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest">備份雲端</button>
            <button onClick={logoutAdmin} className="px-8 py-4 border border-white/10 text-slate-500 text-[10px] font-black uppercase">登出</button>
          </div>
      </div>

      <div className="flex gap-12 border-b border-white/5 mb-12">
          {(['catalog', 'insights', 'curation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
                  {tab === 'catalog' ? '作品目錄' : tab === 'insights' ? '數據洞察' : '策展工具'}
              </button>
          ))}
      </div>

      {activeTab === 'curation' && (
          <div className="space-y-12">
              <div className="flex flex-wrap gap-4">
                  <button onClick={() => setCurationSource('mb')} className={`px-8 py-3 text-[10px] font-black uppercase ${curationSource === 'mb' ? 'bg-brand-gold text-black' : 'text-slate-500 border border-white/5'}`}>MusicBrainz</button>
                  <button onClick={() => setCurationSource('spotify')} className={`px-8 py-3 text-[10px] font-black uppercase ${curationSource === 'spotify' ? 'bg-[#1DB954] text-black' : 'text-slate-500 border border-white/5'}`}>Spotify Album</button>
                  <button onClick={() => setCurationSource('yt_releases')} className={`px-8 py-3 text-[10px] font-black uppercase ${curationSource === 'yt_releases' ? 'bg-red-600 text-white' : 'text-slate-500 border border-white/5'}`}>YouTube 批量匯入 (79+)</button>
              </div>

              {curationSource === 'yt_releases' && (
                  <div className="bg-red-600/5 p-12 border border-red-600/20 rounded-sm">
                      <h3 className="text-red-600 font-black uppercase tracking-widest text-sm mb-6 text-center">YouTube Music 深度同步</h3>
                      <p className="text-[10px] text-slate-500 text-center mb-8 uppercase tracking-widest">貼上「發行內容」分頁或「專輯播放清單」連結，AI 將自動解析內容。</p>
                      <div className="flex gap-4 mb-10">
                          <input className="flex-1 bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-red-600 font-mono" placeholder="https://music.youtube.com/..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} />
                          <button onClick={handleFetchYtReleases} disabled={isProcessing} className="px-10 bg-red-600 text-white font-black uppercase text-xs tracking-widest min-w-[150px]">
                            {isProcessing ? "掃描中..." : "開始掃描"}
                          </button>
                      </div>

                      {ytReleasesPreview.length > 0 && (
                          <div className="bg-slate-900 border border-white/5 p-10 animate-fade-in">
                              <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                                  <div>
                                      <h4 className="text-xl font-black text-white uppercase tracking-widest">解析結果</h4>
                                      <p className="text-[10px] text-slate-500 mt-2">共偵測到 {ytReleasesPreview.length} 個項目</p>
                                  </div>
                                  <button onClick={handleConfirmYtReleasesImport} disabled={isProcessing} className="px-12 py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-widest">確認大量匯入</button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {ytReleasesPreview.map((item, idx) => (
                                      <div key={idx} className="p-4 bg-black/40 border border-white/5 flex items-center gap-4">
                                          <div className="w-10 h-10 bg-slate-800 flex items-center justify-center text-[10px] text-slate-600">{idx+1}</div>
                                          <div className="flex-1 min-w-0">
                                              <div className="text-white font-bold text-xs truncate uppercase">{item.title}</div>
                                              <div className="text-[9px] text-slate-500 uppercase">{item.description}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {curationSource === 'spotify' && (
                  <div className="bg-[#1DB954]/5 p-12 border border-[#1DB954]/20 rounded-sm">
                      <h3 className="text-[#1DB954] font-black uppercase tracking-widest text-sm mb-6 text-center">Spotify Album Import</h3>
                      <div className="flex gap-4 mb-10">
                          <input className="flex-1 bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-[#1DB954] font-mono" placeholder="Spotify 專輯連結" value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} />
                          <button onClick={handleFetchSpotifyAlbum} disabled={isProcessing} className="px-10 bg-[#1DB954] text-black font-black uppercase text-xs tracking-widest">{isProcessing ? "處理中..." : "抓取內容"}</button>
                      </div>
                      {spotifyAlbumPreview && (
                          <div className="bg-slate-900 border border-white/5 p-10">
                              <div className="flex flex-col md:flex-row gap-10 items-start mb-10 border-b border-white/5 pb-10">
                                  <img src={spotifyAlbumPreview.images?.[0]?.url} className="w-48 h-48 object-cover rounded" alt="" />
                                  <div className="flex-1">
                                      <h2 className="text-4xl font-black text-white uppercase mb-4">{spotifyAlbumPreview.name}</h2>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div><span className="text-[10px] text-slate-500 uppercase block">UPC</span><span className="text-brand-gold font-mono text-xs">{spotifyAlbumPreview.external_ids?.upc || 'N/A'}</span></div>
                                          <div><span className="text-[10px] text-slate-500 uppercase block">Date</span><span className="text-white font-mono text-xs">{spotifyAlbumPreview.release_date}</span></div>
                                      </div>
                                  </div>
                                  <button onClick={handleConfirmSpotifyImport} disabled={isProcessing} className="px-12 py-8 bg-brand-gold text-black font-black uppercase text-sm tracking-widest">匯入資料庫</button>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-10">
              <input type="text" placeholder="搜尋..." className="w-full bg-slate-900 border border-white/5 p-6 text-white text-xs font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {groupedByUPC.map(([upc, items]) => (
                  <div key={upc} className="bg-slate-900/20 border border-white/5 p-8 mb-6">
                      <h3 className="text-white font-black uppercase tracking-widest text-lg mb-8 border-b border-white/5 pb-4">
                        {upc.startsWith('TEMP_') ? '未定義專輯' : upc} <span className="text-[10px] text-slate-500 ml-4">({items.length} TRACKS)</span>
                      </h3>
                      <div className="space-y-4">
                          {items.map(song => (
                              <div key={song.id} className="flex items-center justify-between py-3 border-b border-white/5 group">
                                  <div className="flex items-center gap-6">
                                      <img src={song.coverUrl || globalSettings.defaultCoverUrl} className="w-10 h-10 object-cover rounded" alt="" />
                                      <div>
                                          <span className="text-slate-300 font-bold text-sm uppercase group-hover:text-white">{song.title}</span>
                                          <p className="text-[9px] text-slate-600 font-mono mt-1">ISRC: {song.isrc || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-4">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] text-brand-gold font-black uppercase">EDIT</button>
                                      <button onClick={() => { if(window.confirm('確定刪除？')) deleteSong(song.id); }} className="text-[9px] text-rose-500 font-black uppercase">DEL</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
