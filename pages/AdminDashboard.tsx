import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier, ASSETS, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Language, ProjectType, Song, ReleaseCategory } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, uploadSongsToCloud, isSyncing, syncProgress, 
    bulkAddSongs, refreshData, updateSong
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isImportingJson, setIsImportingJson] = useState(false);

  // 管理員試聽播放器狀態
  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAdminPlay = (song: Song) => {
    if (!audioRef.current) return;

    if (adminPlayingId === song.id) {
      audioRef.current.pause();
      setAdminPlayingId(null);
    } else {
      const url = resolveDirectLink(song.audioUrl || song.dropboxUrl || '');
      if (!url) {
        showToast("此作品尚未配置音訊網址", "error");
        return;
      }
      setAdminPlayingId(song.id);
      audioRef.current.src = url;
      audioRef.current.load();
      audioRef.current.play().catch(e => {
        console.error("Playback failed", e);
        showToast("音訊載入失敗，請確認 Dropbox 是否為原始連結", "error");
        setAdminPlayingId(null);
      });
    }
  };

  const handleForcePushCloud = async () => {
      if (window.confirm("確定要將目前所有資料強制覆蓋雲端嗎？")) {
          const success = await uploadSongsToCloud(songs);
          if (success) showToast("🚀 雲端資料已強制更新成功！");
          else showToast("❌ 推送失敗，請檢查網絡", "error");
      }
  };

  const handleJsonImport = async () => {
      if (!jsonInput.trim()) return;
      try {
          setIsImportingJson(true);
          const data = JSON.parse(jsonInput);
          if (Array.isArray(data)) {
              if (window.confirm(`即將匯入 ${data.length} 筆作品，這將覆蓋本地。確定嗎？`)) {
                  await bulkAddSongs(data);
                  showToast("✅ 資料已成功導入本地，點擊「強制推送」即可同步至雲端");
                  setJsonInput('');
                  setActiveTab('catalog');
              }
          } else {
              showToast("JSON 格式不正確，應為陣列", "error");
          }
      } catch (e) {
          showToast("JSON 解析錯誤，請檢查內容", "error");
      } finally {
          setIsImportingJson(false);
      }
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

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.isrc && s.isrc.includes(searchTerm)) ||
    (s.upc && s.upc.includes(searchTerm))
  );

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-48 animate-fade-in pb-40">
      {/* 隱藏播放器實體 */}
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />

      {isSyncing && (
        <div className="fixed top-0 left-0 w-full z-[1000]">
           <div className="h-1.5 bg-white/5 w-full">
              <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_20px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
           </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-24">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">Database: {songs.length} Tracks Ready</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動新增</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-rose-900 transition-all">登出</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings', 'payment', 'system'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'catalog' ? '作品清單' : tab === 'settings' ? '影音設置' : tab === 'payment' ? '付款更新' : '系統功能'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12">
          <input type="text" placeholder="搜尋標題 / ISRC / UPC..." className="w-full bg-transparent border-b border-white/10 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <div className="grid grid-cols-1 gap-4">
              {filteredSongs.map(song => (
                  <div key={song.id} className="flex items-center gap-10 p-8 border border-white/5 bg-white/[0.01] rounded-sm group hover:bg-brand-gold/5 transition-all">
                      {/* 試聽控制按鈕 */}
                      <button 
                        onClick={() => handleAdminPlay(song)}
                        className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20 text-white/40 hover:border-brand-gold hover:text-brand-gold'}`}
                      >
                        {adminPlayingId === song.id ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>

                      <img src={song.coverUrl} className="w-20 h-20 object-cover shadow-2xl rounded-sm" />
                      
                      <div className="flex-1">
                          <h4 className="text-xl font-black text-white uppercase tracking-wider group-hover:text-brand-gold transition-colors">{song.title}</h4>
                          <div className="flex items-center gap-8 mt-2">
                             <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                {song.isrc || 'No ISRC'} • {song.releaseDate}
                             </p>
                             
                             {/* YouTube 頻道串聯狀態 */}
                             {song.youtubeUrl ? (
                                <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#FF0000] hover:brightness-125 transition-all group/yt">
                                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                   <span className="text-[9px] font-black uppercase tracking-widest group-hover/yt:underline">Channel Linked</span>
                                </a>
                             ) : (
                                <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest border border-slate-800 px-2 py-0.5">No Channel Link</span>
                             )}
                          </div>
                      </div>

                      <div className="flex gap-8">
                          <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[10px] font-black uppercase transition-all ${song.isInteractiveActive ? 'text-emerald-500' : 'text-slate-600'}`}>
                             {song.isInteractiveActive ? '實驗已開啟' : '實驗關閉'}
                          </button>
                          <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors">編輯</button>
                          <button onClick={() => { if (window.confirm("確定刪除？")) deleteSong(song.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-colors">刪除</button>
                      </div>
                  </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
           <div className="bg-[#0f172a]/80 p-10 border border-white/5 space-y-10 rounded-sm">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">影音設置中心 (System Config)</h3>
            <div className="space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase">解鎖通行碼 (Access Code)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-brand-gold font-black text-2xl tracking-[0.5em] text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={e => setGlobalSettings(prev => ({...prev, accessCode: e.target.value}))} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase">官方 YouTube 主頻道網址</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-white text-sm outline-none focus:border-brand-gold" placeholder="https://youtube.com/@Willwi888" value={globalSettings.exclusiveYoutubeUrl || ''} onChange={e => setGlobalSettings(prev => ({...prev, exclusiveYoutubeUrl: e.target.value}))} />
                </div>
            </div>
            <button onClick={() => uploadSettingsToCloud(globalSettings).then(() => showToast("設置已同步雲端"))} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">
               儲存所有設置至雲端
            </button>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-rose-950/10 border border-rose-900/30 p-10 space-y-10 rounded-sm">
            <h3 className="text-rose-500 font-black text-xs uppercase tracking-[0.4em]">資料完整性與同步</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={handleForcePushCloud} className="py-8 bg-brand-gold text-black font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-xl">
                  🚀 強制推送至雲端 (全量覆蓋)
               </button>
               <button onClick={refreshData} className="py-8 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black">
                  🔄 從雲端刷新本地
               </button>
            </div>
          </div>

          <div className="bg-[#0f172a] p-10 border border-white/5 space-y-8 rounded-sm">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">直接貼上 JSON 批次匯入</h3>
            <textarea 
              className="w-full h-80 bg-black border border-white/10 p-8 text-white text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar" 
              placeholder="貼上您準備好的歌曲 JSON 陣列..." 
              value={jsonInput} 
              onChange={e => setJsonInput(e.target.value)} 
            />
            <button 
              onClick={handleJsonImport} 
              disabled={isImportingJson}
              className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-brand-gold transition-all"
            >
              {isImportingJson ? '處理中...' : '執行 JSON 批次匯入'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
