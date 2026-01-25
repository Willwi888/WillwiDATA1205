
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

  // --- 設置處理 ---
  const handleSettingsChange = (key: string, value: string) => {
      setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
      await uploadSettingsToCloud(globalSettings);
      showToast("系統設置與 QR Code 已成功同步至雲端");
  };

  const handleQrUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              handleSettingsChange(key, reader.result as string);
              showToast("QR Code 已更新，請記得點擊儲存並同步");
          };
          reader.readAsDataURL(file);
      }
  };

  // --- 數據備份與匯入 ---
  const downloadBackup = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `willwi_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (Array.isArray(data)) {
                  if (window.confirm(`確定要匯入 ${data.length} 首歌曲並覆蓋雲端嗎？`)) {
                      await bulkAddSongs(data);
                      showToast("資料匯入成功");
                  }
              }
          } catch (e) { showToast("無效的 JSON 檔案", "error"); }
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
      
      {(isSyncing || localImporting || isParsing) && (
        <div className="fixed top-0 left-0 w-full z-[1000]">
           <div className="h-1.5 bg-white/5 w-full">
              <div className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_20px_#fbbf24]" style={{ width: `${syncProgress}%` }}></div>
           </div>
           <div className="bg-brand-gold text-black text-[10px] font-black px-6 py-2 uppercase tracking-[0.3em] inline-block shadow-2xl">
              CLOUD ENGINE: {syncProgress}% SYNCED
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">
            Total {songs.length} Tracks in Database
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setShowBulkImport(!showBulkImport)} 
            className={`h-14 px-8 border text-[11px] font-black uppercase tracking-widest transition-all ${showBulkImport ? 'bg-brand-gold text-black border-brand-gold' : 'border-brand-gold text-brand-gold hover:bg-brand-gold/10'}`}
          >
            {showBulkImport ? '返回清單' : '🚀 220 首歌批量導入'}
          </button>
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">手動新增</button>
          <button onClick={logoutAdmin} className="h-14 px-8 border border-white/10 text-white text-[11px] font-black uppercase hover:bg-rose-900 transition-all">登出管理員</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings', 'payment', 'system'].map(id => (
          <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {id === 'catalog' ? '作品庫存' : id === 'settings' ? '影音設置' : id === 'payment' ? '付款更新' : '系統功能'}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          {showBulkImport ? (
            <div className="bg-brand-gold/5 border border-brand-gold/20 p-10 space-y-8 animate-fade-in-up mb-12 rounded-sm shadow-2xl">
                <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">AI 批量文本導入 (220 首歌快速對接)</h3>
                <textarea 
                    className="w-full h-80 bg-black border border-brand-gold/20 p-8 text-white text-sm font-mono focus:border-brand-gold outline-none resize-none custom-scrollbar"
                    placeholder="請直接貼上 YouTube Music 頁面文字或發行清單..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                />
                <button onClick={async () => {
                    setIsParsing(true);
                    try {
                        const results = await parseWillwiTextCatalog(bulkText);
                        setParsedResults(results);
                        showToast(`成功解析 ${results.length} 首！`);
                    } catch(e) { showToast("解析出錯", "error"); }
                    finally { setIsParsing(false); }
                }} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">執行 AI 智能解析</button>
                {parsedResults.length > 0 && (
                    <button onClick={async () => {
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
                        await bulkAppendSongs(newSongs);
                        setParsedResults([]);
                        setShowBulkImport(false);
                    }} className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.4em]">確認並導入至雲端庫存</button>
                )}
            </div>
          ) : (
            <>
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
                        <img src={main.coverUrl} className="w-24 h-24 object-cover shadow-2xl shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-2xl font-black text-white uppercase tracking-wider">{main.title}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">{album.length} TRACKS • {main.releaseDate}</p>
                        </div>
                        <div className={`w-10 h-10 border border-white/10 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/40">
                          {album.map((track) => (
                            <div key={track.id} className="flex items-center gap-10 p-8 border-b border-white/5 last:border-0 hover:bg-brand-gold/5 transition-all">
                              <div className="flex-1">
                                <p className="text-base font-black text-white uppercase tracking-wider">{track.title}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-widest">{track.isrc || 'No ISRC'}</p>
                              </div>
                              <div className="flex items-center gap-8">
                                 <button onClick={() => navigate(`/add?edit=${track.id}`)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">編輯</button>
                                 <button onClick={() => deleteSong(track.id)} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-all">刪除</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-[#0f172a]/80 p-10 border border-white/5 space-y-10 rounded-sm">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">品牌影音設置</h3>
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">個人肖像網址 (PORTRAIT URL)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={e => handleSettingsChange('portraitUrl', e.target.value)} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">平台通行碼 (ACCESS CODE)</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-brand-gold font-black text-xl tracking-[0.5em] text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={e => handleSettingsChange('accessCode', e.target.value)} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">精選 YouTube 影片 URL</label>
                    <input className="w-full bg-black border border-white/10 p-5 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.exclusiveYoutubeUrl || ''} onChange={e => handleSettingsChange('exclusiveYoutubeUrl', e.target.value)} />
                </div>
            </div>
            <button onClick={handleSaveSettings} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all">儲存並同步至雲端</button>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-[#0f172a]/80 p-10 border border-white/5 space-y-10 rounded-sm">
            <h3 className="text-brand-gold font-black text-xs uppercase tracking-[0.4em]">金流付款 QR Code 更新</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { key: 'qr_production', label: '製作費/對時費 QR' },
                { key: 'qr_cinema', label: '影院高畫質 QR' },
                { key: 'qr_support', label: '音樂食糧/贊助 QR' },
                { key: 'qr_line', label: 'LINE 官方帳號 QR' },
                { key: 'qr_global_payment', label: '全域備用 QR' }
              ].map(item => (
                <div key={item.key} className="p-8 bg-black/40 border border-white/5 text-center space-y-6">
                    <h4 className="text-[10px] text-white font-black uppercase tracking-widest">{item.label}</h4>
                    <div className="aspect-square bg-slate-900 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden">
                        {(globalSettings as any)[item.key] ? (
                            <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-[9px] text-slate-700 uppercase font-black">未上傳</span>
                        )}
                    </div>
                    <label className="block w-full py-4 border border-brand-gold/30 text-brand-gold font-black text-[9px] uppercase tracking-widest hover:bg-brand-gold hover:text-black cursor-pointer transition-all">
                        更換圖片
                        <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                    </label>
                </div>
              ))}
            </div>
            <button onClick={handleSaveSettings} className="w-full py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-white transition-all shadow-2xl">確認更新所有 QR Code</button>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="bg-rose-950/10 border border-rose-900/30 p-10 space-y-10 rounded-sm">
            <h3 className="text-rose-500 font-black text-xs uppercase tracking-[0.4em]">系統備份與進階功能</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={downloadBackup} className="py-8 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all">導出 JSON 備份檔</button>
               <label className="py-8 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center cursor-pointer">
                  匯入 JSON 並同步
                  <input type="file" className="hidden" accept=".json" onChange={handleJsonImport} />
               </label>
            </div>
            <div className="pt-10 border-t border-white/5">
                <button onClick={refreshData} className="w-full py-8 bg-rose-900 text-white font-black text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                   🔄 強制從雲端重新抓取資料 (覆蓋本地)
                </button>
                <p className="text-rose-900/40 text-[9px] font-black uppercase mt-4 text-center tracking-widest">注意：此功能將清空您的瀏覽器緩存，並從 Supabase 重新讀取所有設置。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
