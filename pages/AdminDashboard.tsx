import React, { useRef, useState, useEffect } from 'react';
import { useData, INITIAL_DATA } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, Language } from '../types';

const cleanGoogleRedirect = (url: string) => {
    try {
        if (url.includes('google.com/url')) {
            const urlObj = new URL(url);
            const q = urlObj.searchParams.get('q');
            if (q) return decodeURIComponent(q);
        }
        return url;
    } catch (e) { return url; }
};

const convertDriveLink = (url: string) => {
    try {
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

const AdminDashboard: React.FC = () => {
  const { songs } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [homeConfig, setHomeConfig] = useState({ title: '', subtitle: '', coverUrl: '', audioUrl: '', youtubeUrl: '' });
  const [globalBg, setGlobalBg] = useState('');
  const [metrics, setMetrics] = useState({ totalUsers: 0, revenueDonation: 0, revenueService: 0, totalRevenue: 0, activeSessions: 0 });

  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_home_player_config');
      if (savedConfig) setHomeConfig(JSON.parse(savedConfig));
      const savedBg = localStorage.getItem('willwi_global_bg');
      if (savedBg) setGlobalBg(savedBg);
      setMetrics({ totalUsers: 124, revenueDonation: 500, revenueService: 240, totalRevenue: 740, activeSessions: 1 });
  }, []);

  const saveHomeConfig = () => { localStorage.setItem('willwi_home_player_config', JSON.stringify(homeConfig)); alert("Saved!"); };
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

  const handleImportClick = (mode: 'overwrite' | 'merge') => {
      setImportMode(mode);
      if (window.confirm(mode === 'overwrite' ? "Confirm Overwrite?" : "Confirm Merge?")) fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          const validSongs = JSON.parse(event.target?.result as string);
          if (importMode === 'overwrite') await dbService.clearAllSongs();
          await dbService.bulkAdd(validSongs);
          window.location.reload();
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
            <p className="text-slate-400 text-sm mt-1">Willwi's Legacy Archive</p>
          </div>
          <button onClick={logoutAdmin} className="text-[10px] font-bold text-red-500 border border-red-900/50 px-4 py-2 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Sign Out Manager</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 border border-brand-accent/50 rounded-xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-brand-accent mb-6 uppercase tracking-widest">Visuals Manager</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs text-slate-400 mb-2 uppercase">Global Background</label>
                        <input className="w-full bg-black border border-slate-700 rounded p-3 text-white text-xs" value={globalBg} onChange={(e) => setGlobalBg(e.target.value)} />
                        <div className="mt-2 flex gap-2"><button onClick={saveGlobalBg} className="px-4 py-2 bg-slate-700 text-white text-[10px] font-bold uppercase">Apply</button><button onClick={resetGlobalBg} className="px-4 py-2 border border-slate-700 text-slate-500 text-[10px] uppercase">Reset</button></div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
                 <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Database Backup</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button onClick={handleExport} className="py-4 bg-brand-accent text-slate-900 font-black text-xs uppercase tracking-widest">Download JSON Backup</button>
                     <div className="flex gap-2">
                         <button onClick={() => handleImportClick('merge')} className="flex-1 py-4 border border-green-800 text-green-500 font-bold text-xs uppercase tracking-widest">Merge</button>
                         <button onClick={() => handleImportClick('overwrite')} className="flex-1 py-4 border border-red-800 text-red-500 font-bold text-xs uppercase tracking-widest">Overwrite</button>
                     </div>
                 </div>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Metrics</h2>
            <div className="space-y-6">
                <div className="p-6 bg-black rounded border border-white/5 text-center"><div className="text-4xl font-black text-white">{metrics.totalUsers}</div><div className="text-[10px] text-slate-500 uppercase mt-2">Active Users</div></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;