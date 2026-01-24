
import React, { useState, useMemo, useRef } from 'react';
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
  const { songs, deleteSong, refreshData, uploadSongsToCloud, bulkAddSongs, dbStatus, isSyncing, globalSettings, setGlobalSettings, uploadSettingsToCloud } = useData();
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
              e.target.value = ''; // Reset input
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
            <p className="text-slate-500 text-[12px] font-black uppercase tracking-[0.5em] mt-6">Multi-language Music Archive</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl">New Entry</button>
            <button onClick={logoutAdmin} className="h-14 px-12 border border-white/10 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">Logout</button>
          </div>
      </div>

      <div className="flex border-b border-white/10 mb-12 gap-10 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {[
              { id: 'catalog', label: '庫存與版本' },
              { id: 'spotify', label: 'SPOTIFY 檢索' },
              { id: 'settings', label: '介面與背景' },
              { id: 'payment', label: '金流與 QR' },
              { id: 'data', label: '備份與還原' }
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-10">
                <input type="text" placeholder="SEARCH CATALOG..." className="flex-1 bg-white/[0.03] border border-white/10 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={refreshData} className="px-10 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Pull Latest</button>
            </div>

            <div className="bg-white/[0.02] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 bg-black/40">
                        <tr>
                            <th className="px-8 py-6">音樂作品</th>
                            <th className="px-8 py-6">語言與翻譯</th>
                            <th className="px-8 py-6">資產狀態</th>
                            <th className="px-8 py-6 text-right">控制</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSongs.map(song => {
                            const healthIssues = checkAssetHealth(song);
                            return (
                                <tr key={song.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-6">
                                            <img src={song.coverUrl} className="w-16 h-16 object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all" />
                                            <div>
                                                <div className="font-black text-white text-lg uppercase tracking-wider">{song.title}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-1">{song.isrc || 'NO ISRC'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-white/10 text-[9px] font-black text-slate-400 uppercase">{song.language}</span>
                                            {song.translations && Object.keys(song.translations).map(l => (
                                                <span key={l} className="px-2 py-1 bg-brand-gold/10 text-[9px] font-black text-brand-gold uppercase">{l}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {healthIssues.length === 0 ? (
                                                <span className="text-emerald-500 text-[9px] font-black uppercase">✓ HEALTHY</span>
                                            ) : (
                                                healthIssues.map(issue => (
                                                    <span key={issue} className="text-rose-500 text-[9px] font-black uppercase tracking-tighter">! {issue}</span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right space-x-6">
                                        <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-black uppercase text-brand-gold">EDIT</button>
                                        <button onClick={() => { if(confirm('DELETE TRACK?')) deleteSong(song.id); }} className="text-[10px] font-black uppercase text-rose-500">REMOVE</button>
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
                    placeholder="SEARCH SPOTIFY FOR TRACKS/ISRC..." 
                    className="flex-1 bg-white/[0.03] border border-white/10 px-8 py-6 rounded-sm text-sm outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" 
                    value={spotifyQuery} 
                    onChange={e => setSpotifyQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSpotifySearch()}
                  />
                  <button 
                    onClick={handleSpotifySearch} 
                    disabled={isSearchingSpotify}
                    className="px-16 bg-brand-gold text-slate-950 text-[11px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50"
                  >
                      {isSearchingSpotify ? 'SEARCHING...' : 'DISCOVER'}
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {spotifyResults.map(track => (
                      <div key={track.id} className="bg-white/[0.03] border border-white/10 p-8 rounded-sm group hover:border-brand-gold transition-all flex flex-col justify-between">
                          <div>
                            <div className="aspect-square w-full bg-slate-800 rounded-sm mb-6 overflow-hidden relative">
                                <img src={track.album.images[0]?.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" className="absolute top-4 right-4 w-10 h-10 bg-black/80 rounded-full flex items-center justify-center border border-white/20 hover:bg-emerald-500 transition-colors">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.5.4-.8.2-2.7-1.6-6-2-10-1.1-.3.1-.6-.1-.7-.4s.1-.6.4-.7c4.4-1 8.1-.5 11.1 1.3.3.2.4.5.2.8.2.2.1.2.2.2-.2-.2-.2-.2 0-.3zm1.4-3.3c-.3.4-.8.5-1.2.3-3.1-1.9-7.8-2.4-11.4-1.3-.5.1-1-.2-1.1-.7-.1-.5.2-1 .7-1.1 4.1-1.3 9.4-.6 13 1.6.4.2.5.8.3 1.2h-.3zm.1-3.4C15.2 8.3 8.8 8.1 5.1 9.2c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.3-1.3 11.4-1.1 15.8 1.5.5.3.7 1 .4 1.5-.2.5-.9.7-1.4.4-.2.1-.2.1-.2.1v-.2z"/></svg>
                                </a>
                            </div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{track.name}</h4>
                            <p className="text-brand-gold text-[10px] font-black uppercase tracking-widest mb-4 truncate">{track.artists.map(a => a.name).join(', ')}</p>
                            
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex justify-between">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Album</span>
                                    <span className="text-[9px] text-slate-300 font-bold uppercase truncate max-w-[150px]">{track.album.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Released</span>
                                    <span className="text-[9px] text-slate-300 font-bold uppercase">{track.album.release_date}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">ISRC</span>
                                    <span className="text-[9px] text-brand-gold font-mono uppercase">{track.external_ids.isrc || 'N/A'}</span>
                                </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => navigate(`/add`, { state: { spotifyImport: track } })}
                            className="w-full py-4 mt-8 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                          >
                              IMPORT TO ARCHIVE
                          </button>
                      </div>
                  ))}

                  {spotifyResults.length === 0 && !isSearchingSpotify && (
                      <div className="col-span-full py-32 text-center">
                          <p className="text-slate-600 text-xs font-black uppercase tracking-[0.8em]">Start typing to explore the global catalog</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-fade-in">
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">網站動態背景 (Portrait URL)</h3>
                  <input className="w-full bg-white/[0.03] border border-white/10 p-6 text-white text-xs font-mono outline-none focus:border-brand-gold transition-colors" value={globalSettings.portraitUrl} onChange={(e) => updateSettings('portraitUrl', e.target.value)} placeholder="Image or MP4 URL" />
              </div>
              <div className="space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">解鎖通行碼 (Access Code)</h3>
                  <input className="w-40 bg-white/[0.03] border border-white/10 p-6 text-white text-2xl font-black text-center outline-none focus:border-brand-gold" maxLength={4} value={globalSettings.accessCode} onChange={(e) => updateSettings('accessCode', e.target.value)} />
              </div>
              <button 
                onClick={handleSaveSettings} 
                disabled={localSaving}
                className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-white transition-all flex items-center gap-4"
              >
                  {localSaving ? "SAVING..." : "儲存全站設定"}
              </button>
          </div>
      )}

      {activeTab === 'payment' && (
          <div className="animate-fade-in space-y-12">
              <div className="bg-brand-gold/10 border border-brand-gold/30 p-10 rounded-sm mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black text-brand-gold uppercase tracking-widest">金流 QR 設置與更新</h3>
                    <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">點擊圖片區域即可更換。更新後請務必點擊右側「同步至雲端」按鈕。</p>
                  </div>
                  <button onClick={handleSaveSettings} className="px-10 py-4 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-white transition-all">同步至雲端 (PUSH SYNC)</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                  {[
                      { key: 'qr_global_payment', label: '主要收款 (GLOBAL)' },
                      { key: 'qr_production', label: '製作體驗 (STUDIO)' },
                      { key: 'qr_cinema', label: '影院模式 (CINEMA)' },
                      { key: 'qr_support', label: '創作贊助 (SUPPORT)' },
                      { key: 'qr_line', label: 'LINE 官方 (COMM)' }
                  ].map(item => (
                      <div key={item.key} className="bg-white/[0.02] border border-white/5 p-6 rounded-sm text-center flex flex-col items-center">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">{item.label}</h4>
                          <div className="w-full aspect-square bg-slate-900 border border-white/10 flex items-center justify-center relative group overflow-hidden">
                              {(globalSettings as any)[item.key] ? (
                                  <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain group-hover:opacity-40 transition-opacity" alt="" />
                              ) : (
                                  <span className="text-slate-700 text-[10px] uppercase font-black">Empty Slot</span>
                              )}
                              <label className="absolute inset-0 flex items-center justify-center bg-brand-gold text-black font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  REPLACE IMAGE
                                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(item.key)} />
                              </label>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'data' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/5 p-10 space-y-6 flex flex-col justify-between hover:border-white/20 transition-all">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase mb-4 tracking-widest">導出本地數據 (JSON)</h3>
                    <p className="text-slate-500 text-xs leading-loose uppercase tracking-widest opacity-60">將目前瀏覽器儲存的所有作品、歌詞與連結備份為單一 JSON 檔案。</p>
                  </div>
                  <button onClick={downloadBackup} className="w-full py-6 bg-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">下載備份檔</button>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-10 space-y-6 flex flex-col justify-between border-l-brand-gold/20 hover:border-brand-gold/40 transition-all">
                  <div>
                    <h3 className="text-xl font-black text-brand-gold uppercase mb-4 tracking-widest">導入本地數據 (JSON)</h3>
                    <p className="text-slate-500 text-xs leading-loose uppercase tracking-widest opacity-60">選擇先前備份的 JSON 檔案以還原資料。此操作會覆蓋目前的本地數據。</p>
                  </div>
                  <label className="w-full cursor-pointer py-6 border border-brand-gold/20 text-brand-gold font-black text-xs text-center uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all">
                    導入 JSON 檔案
                    <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                  </label>
              </div>
          </div>
      )}

    </div>
  );
}; export default AdminDashboard;
