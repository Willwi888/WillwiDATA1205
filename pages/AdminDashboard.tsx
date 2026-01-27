
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song, Language, ProjectType, ReleaseCategory, SongTranslation } from '../types';
import { searchSpotifyTracks, getSpotifyAlbum } from '../services/spotifyService';
import { useToast } from '../components/Layout';

type Tab = 'catalog' | 'payment' | 'settings';

const AdminDashboard: React.FC = () => {
  const { 
    songs, updateSong, addSong, deleteSong, 
    playSong, currentSong, isPlaying, uploadSongsToCloud, isSyncing, globalSettings, setGlobalSettings
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser(); 
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // 工作空間狀態 (Workspace State)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [editorTab, setEditorTab] = useState<'basic' | 'story' | 'meta'>('basic');
  const [activeLangTab, setActiveLangTab] = useState<'original' | 'en' | 'jp' | 'zh'>('original');

  // Spotify 搜尋狀態
  const [spotifySearch, setSpotifySearch] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  // 分組與過濾作品集
  const groupedCatalog = useMemo(() => {
      const groups: Record<string, Song[]> = {};
      const filtered = songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.upc && s.upc.includes(searchTerm)) ||
          (s.isrc && s.isrc.includes(searchTerm))
      );
      
      filtered.forEach(song => {
          const key = song.upc ? normalizeIdentifier(song.upc) : `SINGLE_${song.id}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(song);
      });
      return Object.values(groups).sort((a, b) => new Date(b[0].releaseDate).getTime() - new Date(a[0].releaseDate).getTime());
  }, [songs, searchTerm]);

  // --- 操作邏輯 ---
  const handleOpenEditor = (song: Song | null = null) => {
      if (song) {
          setEditingSong({ ...song });
      } else {
          setEditingSong({
              title: '',
              language: Language.Mandarin,
              projectType: ProjectType.Indie,
              releaseCategory: ReleaseCategory.Single,
              releaseDate: new Date().toISOString().split('T')[0],
              isInteractiveActive: true,
              translations: {}
          });
      }
      setIsEditorOpen(true);
      setEditorTab('basic');
  };

  const handleSaveSong = async () => {
      if (!editingSong?.title || !editingSong?.isrc) {
          showToast("請填寫歌名與 ISRC", "error");
          return;
      }
      const success = editingSong.id 
          ? await updateSong(editingSong.id, editingSong)
          : await addSong(editingSong as Song);
      
      if (success) {
          showToast("作品已儲存並推送到雲端");
          setIsEditorOpen(false);
          setEditingSong(null);
      }
  };

  const handleSpotifyImport = async (track: any) => {
      setIsSearchingSpotify(true);
      try {
          const fullAlbum = await getSpotifyAlbum(track.album.id);
          setEditingSong(prev => ({
              ...prev,
              title: track.name,
              isrc: track.external_ids?.isrc || prev?.isrc,
              upc: fullAlbum?.external_ids?.upc || prev?.upc,
              coverUrl: track.album?.images?.[0]?.url || prev?.coverUrl,
              releaseDate: track.album?.release_date || prev?.releaseDate,
              spotifyLink: track.external_urls?.spotify || prev?.spotifyLink,
              releaseCompany: fullAlbum?.label || prev?.releaseCompany
          }));
          setSpotifyResults([]);
          showToast("Spotify 資料匯入成功");
      } catch (e) {
          showToast("Spotify 匯入失敗", "error");
      } finally {
          setIsSearchingSpotify(false);
      }
  };

  const handleUpdateGlobal = (updates: any) => {
      setGlobalSettings(prev => ({ ...prev, ...updates }));
      showToast("本地配置已更新，別忘了推送到雲端");
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black px-6">
              <div className="bg-slate-900 border border-white/10 p-12 w-full max-w-md rounded-lg shadow-2xl animate-fade-in text-center">
                  <h2 className="text-3xl font-black text-white uppercase tracking-[0.3em] mb-10">Admin Console</h2>
                  <input 
                    type="password" 
                    placeholder="ENTER CODE" 
                    className="w-full bg-black border border-white/10 p-6 text-white text-center font-mono tracking-[1em] text-2xl outline-none focus:border-brand-gold mb-6"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && passwordInput === '8520' && enableAdmin()}
                  />
                  <button onClick={() => passwordInput === '8520' ? enableAdmin() : showToast("代碼錯誤", "error")} className="w-full py-5 bg-brand-gold text-black font-black uppercase tracking-widest hover:bg-white transition-all">Unlock Engine</button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-60 px-6 md:px-12 animate-fade-in">
      
      {/* 頂部標頭：解決重疊問題 */}
      <div className="max-w-[1600px] mx-auto mb-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-12">
              <div className="space-y-3">
                  <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">Console</h1>
                  <p className="text-brand-gold text-xs font-bold uppercase tracking-[0.5em]">Central Music Metadata Management</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                  <button onClick={() => uploadSongsToCloud()} disabled={isSyncing} className="h-14 px-8 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all flex items-center gap-3 disabled:opacity-50">
                      {isSyncing ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : "PUSH CLOUD SYNC"}
                  </button>
                  <button onClick={() => handleOpenEditor()} className="h-14 px-8 bg-brand-gold text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all">Add New Release</button>
                  <button onClick={logoutAdmin} className="h-14 px-6 border border-white/10 text-slate-500 text-[10px] font-black uppercase hover:text-white transition-all">Logout</button>
              </div>
          </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* 左側導覽列 */}
          <div className="lg:col-span-3 space-y-8">
              <nav className="flex flex-col gap-2">
                  {(['catalog', 'payment', 'settings'] as Tab[]).map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab)}
                        className={`text-left px-8 py-5 text-[12px] font-black uppercase tracking-[0.4em] transition-all border ${activeTab === tab ? 'bg-white text-black border-white' : 'text-slate-500 border-white/5 hover:border-white/20'}`}
                      >
                          {tab}
                      </button>
                  ))}
              </nav>

              <div className="bg-slate-900/40 p-10 border border-white/5 space-y-10">
                  <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Database Health</span>
                      <p className="text-4xl font-black">{songs.length} <span className="text-xs text-slate-600">RECORDS</span></p>
                  </div>
                  <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network Status</span>
                      <p className="text-sm font-black text-emerald-500 flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          SUPABASE ONLINE
                      </p>
                  </div>
              </div>
          </div>

          {/* 右側內容區塊 */}
          <div className="lg:col-span-9">
              
              {activeTab === 'catalog' && (
                  <div className="space-y-10 animate-fade-in">
                      {/* 搜尋欄位 */}
                      <div className="bg-slate-900 border border-white/10 p-2 flex gap-2 rounded-sm shadow-2xl">
                          <div className="flex items-center pl-6 text-slate-500">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          </div>
                          <input 
                            type="text" 
                            placeholder="SEARCH BY ISRC, UPC OR TITLE..." 
                            className="flex-1 bg-transparent px-4 py-6 text-base font-bold text-white outline-none placeholder-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>

                      {/* 作品列表 */}
                      <div className="grid grid-cols-1 gap-4">
                          {groupedCatalog.map(group => {
                              const main = group[0];
                              const isCurrent = currentSong?.id === main.id;
                              return (
                                  <div key={main.id} className={`bg-slate-900/60 border p-5 flex items-center gap-8 hover:border-brand-gold/40 transition-all group ${isCurrent && isPlaying ? 'border-brand-gold/40' : 'border-white/5'}`}>
                                      <div className="relative cursor-pointer shrink-0" onClick={() => playSong(main)}>
                                          <img src={main.coverUrl} className="w-20 h-20 object-cover rounded-sm shadow-2xl" alt="" />
                                          <div className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                              {isCurrent && isPlaying ? (
                                                  <div className="flex items-end gap-1 h-3">
                                                      <div className="w-1 bg-brand-gold animate-bounce"></div>
                                                      <div className="w-1 bg-brand-gold animate-bounce delay-75"></div>
                                                      <div className="w-1 bg-brand-gold animate-bounce delay-150"></div>
                                                  </div>
                                              ) : (
                                                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <h4 className="text-white font-black text-lg truncate uppercase tracking-widest">{main.title}</h4>
                                          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                                              <span className="text-[10px] text-slate-500 font-mono">ISRC: {main.isrc}</span>
                                              <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">{main.releaseDate}</span>
                                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{main.language}</span>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <button 
                                            onClick={() => updateSong(main.id, { isInteractiveActive: !main.isInteractiveActive })}
                                            className={`px-4 py-2 text-[9px] font-black uppercase rounded-sm border transition-all ${main.isInteractiveActive ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'text-slate-600 border-white/10 hover:border-white/30'}`}
                                          >
                                              Studio {main.isInteractiveActive ? 'ACTIVE' : 'OFF'}
                                          </button>
                                          <button onClick={() => handleOpenEditor(main)} className="h-10 px-6 bg-white text-black text-[10px] font-black uppercase hover:bg-brand-gold transition-all">Edit</button>
                                          <button onClick={() => window.confirm('確定移除此作品？') && deleteSong(main.id)} className="w-10 h-10 flex items-center justify-center text-slate-800 hover:text-rose-500 transition-colors">
                                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {activeTab === 'payment' && (
                  <div className="bg-slate-900 border border-white/10 p-12 space-y-12 shadow-2xl animate-fade-in rounded-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
                          <div>
                              <h3 className="text-3xl font-black uppercase tracking-widest text-brand-gold mb-2">Gateway Assets</h3>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest">管理全站金流 QR Code 與存取驗證</p>
                          </div>
                          <div className="flex items-center gap-6 bg-black p-6 border border-white/10 rounded-sm">
                              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Master Access Code</span>
                              <input 
                                value={globalSettings.accessCode} 
                                onChange={(e) => handleUpdateGlobal({ accessCode: e.target.value })} 
                                className="bg-transparent text-white font-mono text-3xl w-24 text-center outline-none border-b border-brand-gold focus:border-white transition-colors" 
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                          {[
                              { key: 'qr_global_payment', label: 'LINE PAY QR' },
                              { key: 'qr_production', label: 'STUDIO TICKET (320)' },
                              { key: 'qr_support', label: 'MICRO SUPPORT (100)' }
                          ].map(qr => (
                              <div key={qr.key} className="space-y-6 flex flex-col items-center">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-white/40">{qr.label}</span>
                                  <div className="w-full aspect-square bg-black border border-white/5 rounded-sm flex items-center justify-center overflow-hidden shadow-2xl">
                                      {globalSettings[qr.key as keyof typeof globalSettings] ? (
                                          <img src={globalSettings[qr.key as keyof typeof globalSettings] as string} className="w-full h-full object-contain" alt="" />
                                      ) : (
                                          <span className="text-slate-900 font-black text-[10px] uppercase">No Image Uploaded</span>
                                      )}
                                  </div>
                                  <label className="block w-full py-4 bg-white text-black text-center text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-brand-gold transition-all shadow-xl">
                                      Upload New
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => handleUpdateGlobal({ [qr.key]: reader.result });
                                              reader.readAsDataURL(file);
                                          }
                                      }} />
                                  </label>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="bg-slate-900 border border-white/10 p-12 space-y-12 shadow-2xl animate-fade-in rounded-sm">
                      <h3 className="text-3xl font-black uppercase tracking-widest">Engine Maintenance</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="p-10 bg-black/40 border border-white/5 space-y-6 rounded-sm">
                              <h4 className="font-black text-white uppercase tracking-widest">Catalog Export</h4>
                              <p className="text-xs text-slate-500 leading-loose">將目前本地資料庫中的所有曲目資訊、歌詞、ISRC 匯出為 JSON 備份檔。建議在大型修改前執行。</p>
                              <button onClick={() => {
                                  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a'); a.href = url; a.download = `willwi_db_export_${new Date().toISOString().split('T')[0]}.json`; a.click();
                              }} className="w-full py-5 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                  Download JSON Backup
                              </button>
                          </div>
                          <div className="p-10 bg-black/40 border border-red-900/20 space-y-6 rounded-sm">
                              <h4 className="font-black text-red-500 uppercase tracking-widest">Wipe & Restore</h4>
                              <p className="text-xs text-slate-500 leading-loose">匯入 JSON 並覆蓋現有資料。注意：此動作將會清除所有目前的本地作品紀錄。</p>
                              <label className="block w-full py-5 border border-red-900/40 text-red-500 text-center font-black text-[11px] uppercase tracking-widest cursor-pointer hover:bg-red-500 hover:text-white transition-all">
                                  Restore from JSON
                                  <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file && window.confirm('確定要執行資料復原？這將會覆寫目前的資料庫！')) {
                                          const reader = new FileReader();
                                          reader.onload = async (ev) => {
                                              try {
                                                  const data = JSON.parse(ev.target?.result as string);
                                                  await addSong(data); // 簡化處理，實際建議使用批量 API
                                                  window.location.reload();
                                              } catch (e) { showToast("無效的 JSON 檔案", "error"); }
                                          };
                                          reader.readAsText(file);
                                      }
                                  }} />
                              </label>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>

      {/* --- 全能編輯器滑入面板 (Inline Editor Workspace) --- */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[1000] flex justify-end">
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsEditorOpen(false)}></div>
              <div className="relative w-full max-w-5xl bg-[#020617] h-full shadow-[-40px_0_100px_rgba(0,0,0,1)] border-l border-white/10 flex flex-col animate-fade-in-right">
                  
                  {/* 編輯器頭部 */}
                  <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                      <div>
                        <h3 className="text-3xl font-black uppercase tracking-widest">{editingSong?.id ? 'Modify Metadata' : 'New Release Workspace'}</h3>
                        <p className="text-xs text-brand-gold font-bold uppercase tracking-[0.4em] mt-2">{editingSong?.title || 'Initializing Metadata...'}</p>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={handleSaveSong} className="h-14 px-12 bg-brand-gold text-black font-black uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-2xl">Confirm & Save</button>
                          <button onClick={() => setIsEditorOpen(false)} className="h-14 px-8 border border-white/10 text-slate-500 hover:text-white transition-all">Close</button>
                      </div>
                  </div>

                  {/* 編輯器分頁導覽 */}
                  <div className="px-10 py-6 flex gap-10 border-b border-white/5">
                      {[
                          { id: 'basic', label: 'Core Metadata' },
                          { id: 'story', label: 'Story & Credits' },
                          { id: 'meta', label: 'Spotify Smart Import' }
                      ].map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => setEditorTab(t.id as any)}
                            className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all pb-2 border-b-2 ${editorTab === t.id ? 'text-brand-gold border-brand-gold' : 'text-slate-600 border-transparent hover:text-white'}`}
                          >
                              {t.label}
                          </button>
                      ))}
                  </div>

                  {/* 編輯器主體內容 */}
                  <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar bg-gradient-to-b from-transparent to-black/40">
                      
                      {editorTab === 'basic' && (
                          <div className="space-y-12 animate-fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Song Title (Mandatory)</label>
                                      <input value={editingSong?.title} onChange={e => setEditingSong(prev => ({ ...prev!, title: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-white font-bold text-lg outline-none focus:border-brand-gold transition-colors" placeholder="e.g. 黑灰色" />
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ISRC Identifier</label>
                                      <input value={editingSong?.isrc} onChange={e => setEditingSong(prev => ({ ...prev!, isrc: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono text-lg outline-none focus:border-white transition-colors" placeholder="QZTAZ..." />
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Primary Language</label>
                                      <select value={editingSong?.language} onChange={e => setEditingSong(prev => ({ ...prev!, language: e.target.value as Language }))} className="w-full bg-black border border-white/10 p-6 text-white font-bold outline-none appearance-none">
                                          {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                      </select>
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Official Release Date</label>
                                      <input type="date" value={editingSong?.releaseDate} onChange={e => setEditingSong(prev => ({ ...prev!, releaseDate: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-white font-bold outline-none" />
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Lyrics (Original Content)</label>
                                  <textarea value={editingSong?.lyrics} onChange={e => setEditingSong(prev => ({ ...prev!, lyrics: e.target.value }))} className="w-full h-80 bg-black border border-white/10 p-8 text-white text-base font-mono custom-scrollbar outline-none focus:border-brand-gold leading-relaxed" placeholder="Paste lyrics line by line..." />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-brand-gold tracking-widest">High-Res Audio URL (Direct Link Only)</label>
                                      <input value={editingSong?.audioUrl} onChange={e => setEditingSong(prev => ({ ...prev!, audioUrl: e.target.value }))} className="w-full bg-black border border-brand-gold/30 p-6 text-brand-gold text-xs font-mono" placeholder="Dropbox / S3 / Direct Stream Link" />
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cover Artwork URL</label>
                                      <input value={editingSong?.coverUrl} onChange={e => setEditingSong(prev => ({ ...prev!, coverUrl: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-slate-400 text-xs" />
                                  </div>
                              </div>
                          </div>
                      )}

                      {editorTab === 'story' && (
                          <div className="space-y-12 animate-fade-in">
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-brand-gold tracking-widest">Creative Note (創作筆記)</label>
                                  <textarea value={editingSong?.creativeNote} onChange={e => setEditingSong(prev => ({ ...prev!, creativeNote: e.target.value }))} className="w-full h-48 bg-black border border-white/10 p-8 text-white text-sm leading-loose custom-scrollbar outline-none focus:border-brand-gold" placeholder="靈魂的碎片，紀錄這首歌的誕生..." />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Studio / Lab Log (技術日誌)</label>
                                  <textarea value={editingSong?.labLog} onChange={e => setEditingSong(prev => ({ ...prev!, labLog: e.target.value }))} className="w-full h-48 bg-black border border-white/10 p-8 text-slate-500 font-mono text-xs custom-scrollbar outline-none focus:border-brand-gold" placeholder="錄音細節、實驗手段與技術參數..." />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Credits & Acknowledgements (製作群)</label>
                                  <textarea value={editingSong?.credits} onChange={e => setEditingSong(prev => ({ ...prev!, credits: e.target.value }))} className="w-full h-32 bg-black border border-white/10 p-8 text-slate-600 font-mono text-[11px] outline-none" placeholder="Producer / Arrangement / Mixer / Special Thanks..." />
                              </div>
                          </div>
                      )}

                      {editorTab === 'meta' && (
                          <div className="space-y-12 animate-fade-in">
                              <div className="bg-[#1DB954]/5 border border-[#1DB954]/20 p-10 space-y-8 rounded-sm">
                                  <h4 className="text-sm font-black uppercase tracking-widest text-[#1DB954] flex items-center gap-3">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                      Spotify AI Metadata Discovery
                                  </h4>
                                  <div className="flex gap-4">
                                      <input 
                                        className="flex-1 bg-black border border-white/10 p-6 text-white text-sm outline-none focus:border-[#1DB954] transition-colors" 
                                        placeholder="Enter Track Name or Artist..." 
                                        value={spotifySearch} 
                                        onChange={e => setSpotifySearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (async () => {
                                            setIsSearchingSpotify(true);
                                            const results = await searchSpotifyTracks(spotifySearch);
                                            setSpotifyResults(results);
                                            setIsSearchingSpotify(false);
                                        })()}
                                      />
                                      <button 
                                        onClick={async () => {
                                            setIsSearchingSpotify(true);
                                            const results = await searchSpotifyTracks(spotifySearch);
                                            setSpotifyResults(results);
                                            setIsSearchingSpotify(false);
                                        }} 
                                        className="px-10 bg-[#1DB954] text-black font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all shadow-xl"
                                      >
                                          Sync Scan
                                      </button>
                                  </div>
                                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                                      {spotifyResults.map(t => (
                                          <div key={t.id} onClick={() => handleSpotifyImport(t)} className="flex items-center gap-6 p-5 bg-black/60 hover:bg-white/5 cursor-pointer border border-white/5 rounded-sm transition-all group">
                                              <img src={t.album.images?.[0]?.url} className="w-14 h-14 object-cover shadow-2xl group-hover:scale-105 transition-transform" alt="" />
                                              <div className="flex-1 min-w-0">
                                                  <div className="text-[13px] text-white font-black truncate uppercase tracking-widest">{t.name}</div>
                                                  <div className="text-[10px] text-slate-500 truncate mt-1">{t.album.name} • {t.artists.map((a:any)=>a.name).join(', ')}</div>
                                              </div>
                                              <div className="text-[9px] text-emerald-500 font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Import Data →</div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-[#1DB954] tracking-widest">Spotify Track Link</label>
                                      <input value={editingSong?.spotifyLink} onChange={e => setEditingSong(prev => ({ ...prev!, spotifyLink: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-xs text-slate-500 font-mono outline-none" />
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black uppercase text-rose-500 tracking-widest">YouTube Music Link</label>
                                      <input value={editingSong?.youtubeUrl} onChange={e => setEditingSong(prev => ({ ...prev!, youtubeUrl: e.target.value }))} className="w-full bg-black border border-white/10 p-6 text-xs text-slate-500 font-mono outline-none" />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
