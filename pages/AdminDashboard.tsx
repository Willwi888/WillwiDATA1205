import React, { useRef, useState, useEffect } from 'react';
import { useData, INITIAL_DATA } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, Language } from '../types';

const AdminDashboard: React.FC = () => {
  const { songs } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [homeConfig, setHomeConfig] = useState({ title: '', youtubeUrl: '' });
  const [globalBg, setGlobalBg] = useState('');
  const [metrics, setMetrics] = useState({ totalUsers: 124 });

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_home_player_config');
      if (savedConfig) setHomeConfig(JSON.parse(savedConfig));
      const savedBg = localStorage.getItem('willwi_global_bg');
      if (savedBg) setGlobalBg(savedBg);
  }, []);

  const saveHomeConfig = () => { 
    localStorage.setItem('willwi_home_player_config', JSON.stringify(homeConfig)); 
    alert("首頁影片設定已更新！(Home Config Updated)"); 
  };
  
  const saveGlobalBg = () => { localStorage.setItem('willwi_global_bg', globalBg); window.location.reload(); };
  const resetGlobalBg = () => { localStorage.removeItem('willwi_global_bg'); setGlobalBg(''); window.location.reload(); };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '8888' || passwordInput === 'eloveg2026') { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Admin Code'); }
  };

  const handleExport = async () => {
    const dataStr = JSON.stringify(songs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `willwi_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
            const validSongs = JSON.parse(event.target?.result as string);
            await dbService.clearAllSongs();
            await dbService.bulkAdd(validSongs);
            alert("資料庫已成功恢復！");
            window.location.reload();
          } catch (e) {
            alert("匯入失敗，請檢查檔案格式。");
          } finally {
            setIsProcessing(false);
          }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
                   <form onSubmit={handleAdminLogin} className="space-y-4 mt-6">
                       <input type="password" placeholder="Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors">Unlock Dashboard</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Manager Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Willwi's Legacy Archive Control</p>
          </div>
          <button onClick={logoutAdmin} className="text-[10px] font-bold text-red-500 border border-red-900/50 px-4 py-2 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Sign Out Manager</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            
            {/* NEW: Home Config Section */}
            <div className="bg-slate-900 border border-brand-gold/30 rounded-xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-brand-gold mb-6 uppercase tracking-widest flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                   Home Featured Video
                </h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 uppercase font-mono">YouTube URL</label>
                        <input 
                            className="w-full bg-black border border-slate-700 rounded p-3 text-white text-xs font-mono" 
                            value={homeConfig.youtubeUrl} 
                            onChange={(e) => setHomeConfig({...homeConfig, youtubeUrl: e.target.value})} 
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <p className="text-[10px] text-slate-500 mt-2">支援一般連結或短網址 (Supports normal or short URLs)</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 uppercase">Featured Label / Title</label>
                        <input 
                            className="w-full bg-black border border-slate-700 rounded p-3 text-white text-xs" 
                            value={homeConfig.title} 
                            onChange={(e) => setHomeConfig({...homeConfig, title: e.target.value})} 
                            placeholder="e.g. 最新創作 / 再愛一次"
                        />
                    </div>
                    <button onClick={saveHomeConfig} className="w-full py-4 bg-brand-gold text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all">
                        Update Home Content
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-brand-accent/30 rounded-xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-brand-accent mb-6 uppercase tracking-widest">Global Visuals</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 uppercase">Background Image URL</label>
                        <input className="w-full bg-black border border-slate-700 rounded p-3 text-white text-xs" value={globalBg} onChange={(e) => setGlobalBg(e.target.value)} />
                        <div className="mt-2 flex gap-2">
                            <button onClick={saveGlobalBg} className="px-4 py-2 bg-slate-700 text-white text-[10px] font-bold uppercase hover:bg-brand-accent hover:text-black">Apply</button>
                            <button onClick={resetGlobalBg} className="px-4 py-2 border border-slate-700 text-slate-500 text-[10px] uppercase">Reset to Default</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
                 <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Database Management</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button onClick={handleExport} className="py-4 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all">Download JSON Backup</button>
                     <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-red-900/20 border border-red-800 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                         Restore / Overwrite
                     </button>
                 </div>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 {isProcessing && <p className="text-center mt-4 text-xs text-brand-accent animate-pulse">Processing Database...</p>}
            </div>
        </div>

        <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl h-fit">
                <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Archive Metrics</h2>
                <div className="space-y-6">
                    <div className="p-6 bg-black rounded border border-white/5 text-center">
                        <div className="text-4xl font-black text-white">{songs.length}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-2">Indexed Tracks</div>
                    </div>
                    <div className="p-6 bg-black rounded border border-white/5 text-center">
                        <div className="text-4xl font-black text-brand-gold">{metrics.totalUsers}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-2">System Accesses</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;