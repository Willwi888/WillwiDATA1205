
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { getWillwiReleases, getReleaseGroupDetails, getRecordingByISRC, MBReleaseGroup } from '../services/musicbrainzService';
import { discoverYoutubePlaylist } from '../services/geminiService';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, updateSong, globalSettings,
    uploadSongsToCloud, bulkAppendSongs, bulkAddSongs, isSyncing, syncSuccess
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation' | 'settings'>('catalog');
  const [curationSource, setCurationSource] = useState<'mb' | 'youtube'>('mb');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  
  const [passwordInput, setPasswordInput] = useState('');
  const [mbReleases, setMbReleases] = useState<MBReleaseGroup[]>([]);

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
        const key = s.upc || 'Independent';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || (s.isrc && s.isrc.includes(searchTerm)))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  /**
   * 全球主資料自動對位同步 (Master Sync)
   * 以 MusicBrainz 為標準更新所有本地作品資訊
   */
  const handleMasterSync = async () => {
    if (!window.confirm("即將啟動「全球主資料同步」：系統將根據 ISRC 自動對位 MusicBrainz 資料庫，統一所有作品的發行日期、分類與公司資訊。確定執行？")) return;
    setIsProcessing(true);
    showToast("正在啟動全自動對位程序...");
    
    let updatedCount = 0;
    const newSongsList = [...songs];

    for (let i = 0; i < newSongsList.length; i++) {
        const s = newSongsList[i];
        if (!s.isrc) continue;

        const mbRecording = await getRecordingByISRC(s.isrc);
        if (mbRecording) {
            const release = mbRecording.releases?.[0];
            if (release) {
                newSongsList[i] = {
                    ...s,
                    title: mbRecording.title || s.title,
                    releaseDate: release.date || s.releaseDate,
                    releaseCompany: release['label-info']?.[0]?.label?.name || s.releaseCompany,
                    releaseCategory: release['status'] === 'Official' ? ReleaseCategory.Album : s.releaseCategory
                };
                updatedCount++;
            }
        }
    }

    await bulkAddSongs(newSongsList);
    showToast(`同步完成！已根據音樂腦更新 ${updatedCount} 首作品資訊`, "success");
    setIsProcessing(false);
  };

  const handleYtImport = async () => {
    if (!ytUrl) return showToast("請輸入 YouTube 連結", "error");
    setIsProcessing(true);
    showToast("AI 正在解析 YouTube 分享內容...");
    try {
        const results = await discoverYoutubePlaylist(ytUrl);
        if (results.length > 0) {
            const newSongs: Song[] = results.map((r, idx) => ({
                id: `YT_${Date.now()}_${idx}`,
                title: r.title || 'Unknown',
                coverUrl: globalSettings.defaultCoverUrl,
                language: Language.Mandarin,
                projectType: ProjectType.Indie,
                releaseDate: new Date().toISOString().split('T')[0],
                isInteractiveActive: true,
                isEditorPick: false,
                origin: 'local',
                youtubeUrl: r.youtubeUrl
            }));
            await bulkAppendSongs(newSongs);
            showToast(`已從 YouTube 同步 ${newSongs.length} 首作品`);
            setYtUrl('');
        }
    } catch (e) { showToast("解析失敗", "error"); }
    finally { setIsProcessing(false); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-900 border border-white/10 p-12 max-w-md w-full shadow-2xl rounded-sm">
          <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-sm mb-10 text-center">Manager Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); }} className="space-y-6">
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
            <button onClick={handleMasterSync} disabled={isProcessing} className="px-8 py-4 bg-brand-gold text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl">
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

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">總作品數</span>
                  <div className="text-4xl font-black text-white">{insights.total}</div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">資料完成度</span>
                  <div className="text-4xl font-black text-brand-gold">{insights.completeness}%</div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">累計支持金額</span>
                  <div className="text-4xl font-black text-emerald-500">NT$ {insights.income.toLocaleString()}</div>
              </div>
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-10">
              <input type="text" placeholder="搜尋作品名稱或 ISRC..." className="w-full bg-slate-900 border border-white/5 p-6 text-white text-xs outline-none focus:border-brand-gold font-bold tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {groupedByUPC.map(([upc, items]) => (
                  <div key={upc} className="bg-slate-900/20 border border-white/5 p-8">
                      <h3 className="text-white font-black uppercase tracking-widest text-lg mb-8 border-b border-white/5 pb-4">
                        {upc} <span className="text-[10px] text-slate-500 ml-4">({items.length} TRACKS)</span>
                      </h3>
                      <div className="space-y-4">
                          {items.map(song => (
                              <div key={song.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                                  <div className="flex items-center gap-6">
                                      <img src={song.coverUrl} className="w-10 h-10 object-cover rounded shadow-lg" alt="" />
                                      <div>
                                          <span className="text-slate-300 font-bold text-sm uppercase group-hover:text-white transition-colors">{song.title}</span>
                                          <p className="text-[9px] text-slate-600 font-mono mt-1">ISRC: {song.isrc || 'N/A'} • {song.releaseDate}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-4">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] text-brand-gold font-black uppercase px-4">EDIT</button>
                                      <button onClick={() => { if(window.confirm('確定刪除？')) deleteSong(song.id); }} className="text-[9px] text-rose-500 font-black uppercase px-4">DEL</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'curation' && (
          <div className="space-y-12">
              <div className="flex gap-4">
                  <button onClick={() => setCurationSource('mb')} className={`px-8 py-3 text-[10px] font-black uppercase ${curationSource === 'mb' ? 'bg-brand-gold text-black' : 'text-slate-500 border border-white/5'}`}>MusicBrainz</button>
                  <button onClick={() => setCurationSource('youtube')} className={`px-8 py-3 text-[10px] font-black uppercase ${curationSource === 'youtube' ? 'bg-red-600 text-white' : 'text-slate-500 border border-white/5'}`}>YouTube 分享同步</button>
              </div>

              {curationSource === 'youtube' && (
                  <div className="bg-red-600/5 p-12 border border-red-600/20 rounded-sm text-center">
                      <h3 className="text-red-600 font-black uppercase tracking-widest text-sm mb-6">YouTube Share Sync</h3>
                      <input className="w-full bg-black border border-white/10 p-6 text-white text-center text-xs outline-none focus:border-red-600 font-mono mb-6" placeholder="貼上 YouTube 分享連結 (youtu.be/...)" value={ytUrl} onChange={e => setYtUrl(e.target.value)} />
                      <button onClick={handleYtImport} disabled={isProcessing} className="w-full py-6 bg-red-600 text-white font-black uppercase text-xs tracking-widest">
                          {isProcessing ? "同步中..." : "開始 AI 嗅探與同步"}
                      </button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
