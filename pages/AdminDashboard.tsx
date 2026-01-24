
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { normalizeIdentifier } from '../context/DataContext';
import { dbService } from '../services/db';
import { useToast } from '../components/Layout';
import { Song } from '../types';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';

type AdminTab = 'catalog' | 'spotify' | 'settings' | 'payment' | 'data';

const AdminDashboard: React.FC = () => {
  const { songs, deleteSong, refreshData, uploadSongsToCloud, bulkAddSongs, globalSettings, setGlobalSettings, uploadSettingsToCloud } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSaving, setLocalSaving] = useState(false);

  // Spotify Search State
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm)))
    );
  }, [songs, searchTerm]);

  const checkAssetHealth = (song: Song) => {
      const issues = [];
      if (!song.isrc) issues.push("MISSING ISRC");
      if (!song.lyrics) issues.push("NO LYRICS");
      if (!song.audioUrl) issues.push("NO AUDIO");
      if (!song.translations || Object.keys(song.translations).length === 0) issues.push("NO TRANSLATIONS");
      return issues;
  };

  const updateSettings = (key: string, value: string) => {
      setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
      setLocalSaving(true);
      const success = await uploadSettingsToCloud(globalSettings);
      setLocalSaving(false);
      if (success) showToast("SETTINGS SYNCED TO CLOUD");
      else showToast("SYNC FAILED", 'error');
  };

  const handleSpotifySearch = async () => {
      if (!spotifyQuery.trim()) return;
      setIsSearchingSpotify(true);
      try {
          const results = await searchSpotifyTracks(spotifyQuery);
          setSpotifyResults(results);
          if (results.length === 0) showToast("NO RESULTS FOUND", "error");
      } catch (err) {
          showToast("SEARCH FAILED", "error");
      } finally {
          setIsSearchingSpotify(false);
      }
  };

  const handleQrUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            updateSettings(key, base64);
            showToast("QR IMAGE UPDATED (SAVE TO SYNC)");
        };
        reader.readAsDataURL(file);
    }
  };

  const downloadBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast("BACKUP GENERATED");
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (Array.isArray(data)) {
                  if (confirm(`確認要導入 ${data.length} 筆資料嗎？目前的本地數據將被完全覆蓋。`)) {
                      const success = await bulkAddSongs(data);
                      if (success) {
                          showToast("DATABASE RESTORED SUCCESSFULLY");
                          setActiveTab('catalog');
                      } else {
                          showToast("RESTORE FAILED", "error");
                      }
                  }
              } else {
                  showToast("INVALID FORMAT: ARRAY EXPECTED", "error");
              }
          } catch (err) {
              showToast("JSON PARSE ERROR", "error");
          } finally {
              e.target.value = ''; 
          }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black px-4">
               <div className="bg-slate-900/50 border border-white/5 backdrop-blur-3xl rounded-sm p-14 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-10 uppercase tracking-[0.4em]">Manager Vault</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); showToast("WELCOME BACK"); } else setLoginError('密碼錯誤'); }} className="space-y-8">
                       <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[0.8em] font-mono text-2xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase">{loginError}</p>}
                       <button className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-sm uppercase tracking-widest text-xs">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1900px] mx-auto px-6 md:px-20 py-48 animate-fade-in pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-10">
          <div>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none">Management</h1>
            <p className="text-white text-[12px] font-black uppercase tracking-[0.5em] mt-6">Willwi Music Archive Station</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl">New Entry</button>
            <button onClick={logoutAdmin} className="h-14 px-12 border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Logout</button>
          </div>
      </div>

      <div className="flex border-b border-white/10 mb-12 gap-10 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {[
              { id: 'catalog', label: '作品管理' },
              { id: 'spotify', label: 'SPOTIFY 檢索' },
              { id: 'settings', label: '全站設定' },
              { id: 'payment', label: '金流 QR 更新' },
              { id: 'data', label: '資料備份' }
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-400 hover:text-white'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-10">
                <input type="text" placeholder="SEARCH CATALOG..." className="flex-1 bg-white/[0.03] border border-white/20 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={refreshData} className="px-10 bg-white/5 border border-white/20 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10">Pull Latest</button>
            </div>

            <div className="bg-white/[0.02] border border-white/10 overflow-hidden rounded-sm">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-brand-gold font-black uppercase tracking-widest border-b border-white/10 bg-black/40">
                        <tr>
                            <th className="px-8 py-6">作品資訊 (FULL COLOR)</th>
                            <th className="px-8 py-6">版本標籤</th>
                            <th className="px-8 py-6">資產狀態</th>
                            <th className="px-8 py-6 text-right">管理操作 (ALWAYS VISIBLE)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSongs.map(song => {
                            const healthIssues = checkAssetHealth(song);
                            return (
                                <tr key={song.id} className="border-b border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-6">
                                            {/* 管理後台封面始終保持全彩，無遮罩，增加對比 */}
                                            <img src={song.coverUrl} className="w-16 h-16 object-cover rounded-sm shadow-xl grayscale-0 opacity-100" />
                                            <div>
                                                <div className="font-black text-white text-xl uppercase tracking-wider">{song.title}</div>
                                                <div className="text-[12px] text-white font-mono mt-2 font-bold bg-white/10 inline-block px-2 border border-white/20">{song.isrc || 'NO ISRC'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest">{song.language}</span>
                                            {song.isInteractiveActive && (
                                                <span className="px-3 py-1 bg-brand-gold text-black text-[10px] font-black uppercase tracking-widest">LAB ACTIVE</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {healthIssues.length === 0 ? (
                                                <span className="text-emerald-400 text-[10px] font-black uppercase font-bold">✓ ASSETS HEALTHY</span>
                                            ) : (
                                                healthIssues.map(issue => (
                                                    <span key={issue} className="text-white bg-rose-600 px-2 py-1 text-[9px] font-black uppercase">! {issue}</span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {/* 按鈕始終顯示，不依賴 Hover */}
                                        <div className="flex justify-end gap-3 opacity-100">
                                            <button onClick={() => navigate(`/add?edit=${song.id}`)} className="h-10 px-6 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-md">編輯資料</button>
                                            <button onClick={() => { if(confirm('確定刪除？')) deleteSong(song.id); }} className="h-10 px-6 border-2 border-rose-500 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">刪除</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'spotify' && (
          <div className="space-y-12 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 mb-16">
                  <input 
                    type="text" 
                    placeholder="SEARCH SPOTIFY..." 
                    className="flex-1 bg-white/[0.03] border border-white/20 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" 
                    value={spotifyQuery} 
                    onChange={e => setSpotifyQuery(e.target.value)}
                  />
                  <button onClick={handleSpotifySearch} className="px-16 bg-brand-gold text-black text-[11px] font-black uppercase tracking-widest">DISCOVER</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {spotifyResults.map(track => (
                      <div key={track.id} className="bg-slate-900/60 border border-white/10 p-8 rounded-sm">
                          <img src={track.album.images[0]?.url} className="w-full aspect-square object-cover mb-6 shadow-2xl grayscale-0 opacity-100" alt="" />
                          <h4 className="text-2xl font-black text-white uppercase truncate">{track.name}</h4>
                          <p className="text-brand-gold text-[10px] font-black uppercase tracking-widest mt-2">{track.external_ids.isrc}</p>
                          <button onClick={() => navigate(`/add`, { state: { spotifyImport: track } })} className="w-full py-4 mt-8 bg-white text-black text-[11px] font-black uppercase tracking-widest">IMPORT</button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-fade-in">
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">網站動態背景 (Portrait URL)</h3>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">支援 Google Drive / Dropbox / Direct MP4</p>
                  <input className="w-full bg-white/[0.03] border border-white/20 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => updateSettings('portraitUrl', e.target.value)} />
              </div>
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">解鎖通行碼 (Access Code)</h3>
                  <input className="w-40 bg-white/[0.03] border border-white/20 p-6 text-white text-3xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => updateSettings('accessCode', e.target.value)} />
              </div>
              <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl">儲存並同步雲端</button>
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="animate-fade-in space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                  {[
                      { key: 'qr_global_payment', label: '主要收款 (GLOBAL)' },
                      { key: 'qr_production', label: '製作體驗 (STUDIO)' },
                      { key: 'qr_cinema', label: '影院模式 (CINEMA)' },
                      { key: 'qr_support', label: '創作贊助 (SUPPORT)' },
                      { key: 'qr_line', label: 'LINE 官方 (COMM)' }
                  ].map(item => (
                      <div key={item.key} className="bg-white/[0.02] border border-white/10 p-6 rounded-sm text-center">
                          <h4 className="text-[11px] font-black text-white uppercase mb-6 tracking-widest">{item.label}</h4>
                          <div className="w-full aspect-square bg-white flex items-center justify-center relative group overflow-hidden">
                              <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain grayscale-0 opacity-100" alt="" />
                              <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  更新 QR
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                              </label>
                          </div>
                      </div>
                  ))}
              </div>
              <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl">同步所有 QR 至雲端</button>
          </div>
      )}

      {activeTab === 'data' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/10 p-10 space-y-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest">導出本地數據 (JSON)</h3>
                  <button onClick={downloadBackup} className="w-full py-6 bg-white text-black font-black text-[11px] uppercase tracking-widest">下載備份檔</button>
              </div>
              <div className="bg-white/[0.02] border-2 border-brand-gold p-10 space-y-6">
                  <h3 className="text-2xl font-black text-brand-gold uppercase tracking-widest">導入本地數據 (JSON)</h3>
                  <label className="w-full block cursor-pointer py-6 bg-brand-gold text-black font-black text-center uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-lg">
                    導入 JSON 檔案
                    <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                  </label>
              </div>
          </div>
      )}

    </div>
  );
}; export default AdminDashboard;
