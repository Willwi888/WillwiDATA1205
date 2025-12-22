import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType } from '../types';

type Tab = 'catalog' | 'settings';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State - Default to Catalog for intuitive access
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Stats
  const [stats, setStats] = useState({
      totalUsers: 0,
      incomeProduction: 0,
      incomeDonation: 0
  });

  // Catalog Filter
  const [catalogFilter, setCatalogFilter] = useState('');

  // Global Brand Configuration
  const [platformConfig, setPlatformConfig] = useState({
    defaultCompany: 'Willwi Music',
    defaultProject: ProjectType.Indie,
    youtubeFeaturedUrl: '',
    homeTitle: ''
  });

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_platform_config');
      if (savedConfig) setPlatformConfig(JSON.parse(savedConfig));
      
      if (isAdmin) {
          const users = getAllUsers();
          const txs = getAllTransactions();
          const prodIncome = txs.filter(t => t.type === 'production').reduce((acc, t) => acc + t.amount, 0);
          const donaIncome = txs.filter(t => t.type === 'donation').reduce((acc, t) => acc + t.amount, 0);
          setStats({
              totalUsers: users.length,
              incomeProduction: prodIncome,
              incomeDonation: donaIncome
          });
      }
  }, [isAdmin, getAllUsers, getAllTransactions]);

  const handleToggleInteractive = async (song: Song) => {
      if (!song.audioUrl && !song.isInteractiveActive) {
          alert("無法啟用：此作品尚未設定音源 (Missing Audio)。請先編輯並加入 MP3 連結。");
          return;
      }
      const newValue = !song.isInteractiveActive;
      await updateSong(song.id, { isInteractiveActive: newValue });
  };

  const savePlatformConfig = () => { 
    localStorage.setItem('willwi_platform_config', JSON.stringify(platformConfig)); 
    localStorage.setItem('willwi_home_player_config', JSON.stringify({
        title: platformConfig.homeTitle,
        youtubeUrl: platformConfig.youtubeFeaturedUrl
    }));
    alert("全局品牌設定已更新 (Global Config Saved)。"); 
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(allSongs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_FULL_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          try {
            const jsonStr = event.target?.result as string;
            if (!jsonStr) throw new Error("Empty file content");

            const data = JSON.parse(jsonStr);
            
            if (Array.isArray(data)) {
                if (window.confirm(`【危險操作】\n\n即將匯入 ${data.length} 筆作品資料。\n這將會「清空並覆寫」目前的資料庫。\n\n確定要執行嗎？`)) {
                    await dbService.clearAllSongs();
                    await dbService.bulkAdd(data);
                    alert("資料庫還原成功！頁面將重新載入。");
                    window.location.reload();
                }
            } else {
                alert("無法識別的 JSON 格式。");
            }
          } catch (e) { 
            console.error(e);
            alert("讀取或是解析檔案失敗 (JSON Parse Error)。"); 
          }
          finally { 
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-accent transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(251,191,36,0.2)]">Unlock System</button>
                   </form>
               </div>
          </div>
      );
  }

  const filteredSongs = songs.filter(s => 
      s.title.toLowerCase().includes(catalogFilter.toLowerCase()) || 
      (s.isrc && s.isrc.includes(catalogFilter))
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in pb-40">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Database Manager</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-6 py-3 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg shadow-brand-accent/20">
                + New Song
            </button>
            <button onClick={logoutAdmin} className="px-6 py-3 border border-red-900/40 text-red-500 text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-900/20 transition-all">
                Log Out
            </button>
          </div>
      </div>

      {/* TABS (Simplified) */}
      <div className="flex border-b border-white/10 mb-8 gap-8">
          <button onClick={() => setActiveTab('catalog')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'catalog' ? 'border-brand-gold text-white' : 'border-transparent text-slate-500 hover:text-white'}`}>
              Catalog & Stats
          </button>
          <button onClick={() => setActiveTab('settings')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'settings' ? 'border-brand-gold text-white' : 'border-transparent text-slate-500 hover:text-white'}`}>
              System Settings
          </button>
      </div>

      {/* 1. CATALOG MANAGER (DEFAULT) */}
      {activeTab === 'catalog' && (
          <div className="animate-fade-in space-y-8">
              {/* MINI STATS BAR - Merged here for better visibility */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-white/10 p-4 rounded">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Users</p>
                      <p className="text-xl font-black text-white">{stats.totalUsers}</p>
                  </div>
                  <div className="bg-slate-900 border border-white/10 p-4 rounded">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Production Rev</p>
                      <p className="text-xl font-black text-brand-accent">NT$ {stats.incomeProduction.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900 border border-white/10 p-4 rounded">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Donation Rev</p>
                      <p className="text-xl font-black text-orange-400">NT$ {stats.incomeDonation.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900 border border-white/10 p-4 rounded">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Catalog Size</p>
                      <p className="text-xl font-black text-white">{songs.length} Tracks</p>
                  </div>
              </div>

              {/* SEARCH & TABLE */}
              <div className="space-y-4">
                  <input 
                      type="text" 
                      placeholder="Search Catalog..." 
                      className="w-full bg-slate-900 border border-white/10 px-6 py-4 text-white text-xs outline-none focus:border-white/30 font-mono uppercase rounded" 
                      value={catalogFilter} 
                      onChange={e => setCatalogFilter(e.target.value)} 
                  />

                  <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-black/50 border-b border-white/10">
                              <tr>
                                  <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Release Info</th>
                                  <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Interactive</th>
                                  <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Assets</th>
                                  <th className="p-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {filteredSongs.map(song => (
                                  <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                                      <td className="p-6">
                                          <div className="flex items-center gap-6">
                                              <div className="w-12 h-12 bg-slate-800 flex-shrink-0 relative overflow-hidden rounded shadow-lg border border-white/5 group-hover:border-white/20 transition-all">
                                                  <img src={song.coverUrl} className="w-full h-full object-cover" alt="" />
                                              </div>
                                              <div>
                                                  <div className="text-white font-black text-xs mb-1">{song.title}</div>
                                                  <div className="flex flex-col gap-0.5">
                                                      <span className="text-[9px] text-slate-500 font-mono tracking-wider">{song.isrc || 'NO ISRC'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </td>
                                      
                                      <td className="p-6 text-center">
                                          <button 
                                              onClick={() => handleToggleInteractive(song)}
                                              className={`inline-flex flex-col items-center justify-center w-24 py-1.5 rounded border transition-all ${song.isInteractiveActive ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-800/50 border-white/5'}`}
                                          >
                                              <span className={`text-[8px] font-black uppercase tracking-widest ${song.isInteractiveActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                  {song.isInteractiveActive ? 'Active' : 'Closed'}
                                              </span>
                                          </button>
                                      </td>

                                      <td className="p-6 text-center">
                                          <div className="flex justify-center gap-1">
                                              <span className={`w-2 h-2 rounded-full ${song.audioUrl ? 'bg-brand-accent' : 'bg-slate-700'}`} title="Audio"></span>
                                              <span className={`w-2 h-2 rounded-full ${song.lyrics ? 'bg-brand-gold' : 'bg-slate-700'}`} title="Lyrics"></span>
                                          </div>
                                      </td>

                                      <td className="p-6 text-right">
                                          <div className="flex justify-end gap-3">
                                              <button onClick={() => navigate(`/song/${song.id}`)} className="text-[9px] font-black uppercase tracking-widest text-white border border-white/10 px-3 py-2 hover:bg-white hover:text-black transition-all rounded">
                                                  Edit
                                              </button>
                                              <button onClick={() => { if(window.confirm(`Delete "${song.title}"?`)) deleteSong(song.id); }} className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-900/30 px-3 py-2 hover:bg-red-500 hover:text-white transition-all rounded">
                                                  Del
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* 2. SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto animate-fade-in space-y-10">
              
              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-sm font-black text-brand-gold uppercase tracking-[0.3em] mb-8">Global Configuration</h3>
                  <div className="space-y-6">
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Home Featured Video (YouTube ID)</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none" 
                               value={platformConfig.youtubeFeaturedUrl} 
                               onChange={e => setPlatformConfig({...platformConfig, youtubeFeaturedUrl: e.target.value})}
                               placeholder="e.g. dQw4w9WgXcQ"
                           />
                      </div>
                      <div className="space-y-2">
                           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Default Copyright Holder</label>
                           <input 
                               className="w-full bg-black border border-white/10 p-4 text-white text-xs font-mono focus:border-white/30 outline-none" 
                               value={platformConfig.defaultCompany} 
                               onChange={e => setPlatformConfig({...platformConfig, defaultCompany: e.target.value})}
                           />
                      </div>
                      <button onClick={savePlatformConfig} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all rounded">
                          Save Configuration
                      </button>
                  </div>
              </div>

              <div className="bg-slate-900 border border-white/10 p-10 rounded-xl">
                  <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] mb-8">Database Maintenance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-black/40 border border-white/5 rounded">
                          <h4 className="text-white text-xs font-bold mb-2">Backup</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Download a complete JSON snapshot of your current database.</p>
                          <button onClick={downloadFullBackup} className="w-full py-3 bg-slate-800 text-white font-black text-[9px] uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all rounded">
                              Download JSON
                          </button>
                      </div>
                      <div className="p-6 bg-black/40 border border-white/5 rounded">
                          <h4 className="text-white text-xs font-bold mb-2">Restore</h4>
                          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed">Overwrite current database with a backup file. <span className="text-red-500">Irreversible.</span></p>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-red-900/40 text-red-500 font-black text-[9px] uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all rounded">
                              Upload & Restore
                          </button>
                          <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
                      </div>
                  </div>
              </div>

          </div>
      )}

    </div>
  );
};

export default AdminDashboard;