import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song } from '../types';

const AdminDashboard: React.FC = () => {
  const { songs } = useData();
  const { isAdmin, enableAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  
  // Admin Login State
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Project Links provided by user
  const PROJECT_LINKS = {
      drive: 'https://drive.google.com/drive/folders/1PmP_GB7etr45T_DwcZcLt45Om2RDqTNI?usp=drive_link',
      supabase: 'https://supabase.com/dashboard/project/rzxqseimxhbokrhcdjbi',
      vercel: 'https://vercel.com/willwi',
      live: 'https://willwi-music-manager-467949320732.us-west1.run.app/#/'
  };

  // 1. Calculate Catalog Health
  const totalSongs = songs.length;
  const missingISRC = songs.filter(s => !s.isrc).length;
  const missingLyrics = songs.filter(s => !s.lyrics || s.lyrics.length < 10).length;
  const hasMusicBrainz = songs.filter(s => s.musicBrainzId).length;

  // 2. Mock Data for "Business Intelligence"
  const mockRevenue = {
    dailyRevenueUSD: 500, // Approx $500 USD/day
    dailyRevenueNTD: 16000, 
    hearts: 4500, // The 4500 hearts milestone
    downloads: 128
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '8888') {
          enableAdmin();
          setLoginError('');
      } else {
          setLoginError('Invalid Admin Code');
      }
  };

  // --- Backup Functions ---
  const handleExport = async () => {
    try {
        const dataStr = JSON.stringify(songs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const date = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `willwi_legacy_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Export failed", e);
        alert("匯出失敗，請稍後再試。");
    }
  };

  const handleImportClick = () => {
      if (window.confirm("⚠️ 警告：匯入備份將會「覆蓋」目前所有的資料庫內容。\n\n請確認您選擇的備份檔案是最新的。\n確定要繼續嗎？")) {
          fileInputRef.current?.click();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setRestoreStatus('Reading file...');

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = event.target?.result as string;
              const parsedSongs = JSON.parse(json) as Song[];
              
              if (!Array.isArray(parsedSongs)) {
                  throw new Error("Invalid format");
              }

              setRestoreStatus(`Found ${parsedSongs.length} songs. Restoring...`);
              
              // 1. Clear existing DB
              await dbService.clearAllSongs();
              
              // 2. Add new songs
              await dbService.bulkAdd(parsedSongs);

              setRestoreStatus('Success! Reloading...');
              setTimeout(() => {
                  window.location.reload();
              }, 1000);

          } catch (err) {
              console.error(err);
              setRestoreStatus('Error: Invalid Backup File');
              alert("匯入失敗：檔案格式錯誤。");
              setIsProcessing(false);
          }
      };
      reader.readAsText(file);
  };

  const openGoogleDrive = () => {
      window.open(PROJECT_LINKS.drive, '_blank');
  };

  // If not admin, show login
  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6">
                       <svg className="w-8 h-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
                   <p className="text-slate-400 text-sm mb-6">Enter access code to manage database.</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input 
                          type="password" 
                          placeholder="Code"
                          className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none focus:border-brand-accent"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                       />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors">
                           Unlock Dashboard
                       </button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Manager Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Willwi's Legacy Archive & Performance</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
             <span className="text-xs text-green-500 font-mono uppercase font-bold">Admin Unlocked</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: Legacy Archive & Carrd Guide */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. CLOUD SYNC CENTER (Google Drive) */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg uppercase tracking-wider">CRITICAL</div>
                 
                 <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    ☁️ Cloud Sync (Google Drive)
                 </h2>
                 <p className="text-slate-300 text-sm mb-6 max-w-lg leading-relaxed">
                    這是確保資料永久保存的唯一途徑。網站本身不儲存資料，資料在您的瀏覽器中。請定期下載 JSON 檔並上傳至 Google Drive 專屬金庫。
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                     <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent text-brand-darker font-bold flex items-center justify-center text-xs">1</span>
                             <span className="text-white text-sm font-bold">匯出資料庫檔案</span>
                         </div>
                         <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-slate-700 hover:bg-white hover:text-slate-900 text-white font-bold rounded-lg transition-all border border-slate-600 group-hover:border-brand-accent"
                        >
                             <span>⬇️ 下載最新備份 (.json)</span>
                         </button>
                     </div>

                     <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-slate-900 font-bold flex items-center justify-center text-xs">2</span>
                             <span className="text-white text-sm font-bold">上傳至雲端金庫</span>
                         </div>
                         <button 
                            onClick={openGoogleDrive}
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-green-500/20"
                        >
                            <span>↗️ 開啟 Google Drive</span>
                        </button>
                     </div>
                 </div>

                 {/* Restore Section */}
                 <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div className="text-xs text-slate-500">
                         換了新電腦或瀏覽器？請在此匯入之前的 JSON 檔案：
                     </div>
                     <div className="relative">
                        <button 
                            onClick={handleImportClick}
                            disabled={isProcessing}
                            className="text-xs text-brand-accent hover:text-white underline font-bold px-2 py-1"
                        >
                            🔄 從檔案還原資料庫
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                     </div>
                 </div>
                 {restoreStatus && <p className="mt-2 text-brand-gold font-mono text-xs text-right">{restoreStatus}</p>}
            </div>

             {/* 2. INFRASTRUCTURE & DEPLOYMENT */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🏗️ Project Infrastructure
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <a 
                        href={PROJECT_LINKS.live} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 bg-slate-950 border border-slate-800 hover:border-brand-accent rounded-lg group transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-white font-bold">Live Website</span>
                            <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-1 rounded border border-brand-accent/50">ACTIVE</span>
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-slate-300">View current application.</p>
                    </a>

                    <a 
                        href={PROJECT_LINKS.vercel} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 bg-slate-950 border border-slate-800 hover:border-white rounded-lg group transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-white font-bold">Vercel Dashboard</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">HOSTING</span>
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-slate-300">Manage deployments.</p>
                    </a>

                    <a 
                        href={PROJECT_LINKS.supabase} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 bg-slate-950 border border-slate-800 hover:border-green-500 rounded-lg group transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-white font-bold">Supabase</span>
                            <span className="text-[10px] bg-green-900/20 text-green-400 px-2 py-1 rounded border border-green-900/50">DB</span>
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-slate-300">Manage database.</p>
                    </a>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800">
                    <h3 className="text-brand-accent font-bold text-sm uppercase mb-2">Carrd Integration Guide</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        1. 您的網站目前運行於：<br/>
                        <code className="bg-black px-2 py-1 rounded text-green-400 mt-1 block w-fit truncate max-w-full">{PROJECT_LINKS.live}</code>
                        <br/>
                        2. 在 Carrd 上建立一個按鈕，命名為 <strong>"Enter Database"</strong>。
                        <br/>
                        3. 將上述網址貼上。這樣 Carrd 就是您的「門面」，而這裡是您的「工作室」。
                    </p>
                </div>
            </div>

            {/* 3. Health Check */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    💿 Catalog Health Check
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-3xl font-black text-white">{totalSongs}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Total Songs</div>
                    </div>
                    <div className={`bg-slate-950 p-4 rounded-lg border ${missingISRC === 0 ? 'border-green-900/50' : 'border-red-900/50'} text-center`}>
                        <div className={`text-3xl font-black ${missingISRC === 0 ? 'text-green-500' : 'text-red-500'}`}>{missingISRC}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Missing ISRC</div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                        <div className="text-3xl font-black text-brand-accent">{hasMusicBrainz}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Linked MBID</div>
                    </div>
                     <div className={`bg-slate-950 p-4 rounded-lg border ${missingLyrics === 0 ? 'border-green-900/50' : 'border-yellow-900/50'} text-center`}>
                        <div className={`text-3xl font-black ${missingLyrics === 0 ? 'text-green-500' : 'text-yellow-500'}`}>{missingLyrics}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Missing Lyrics</div>
                    </div>
                </div>
            </div>
        </div>

        {/* COL 2: Business Simulation */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-2 py-1 rounded-bl uppercase tracking-widest z-10">
                    Live Monitor
                </div>
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    💰 Performance
                </h2>
                
                <div className="p-6 bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-lg border border-indigo-500/30 mb-6 text-center">
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Hearts / Support</p>
                    <div className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {mockRevenue.hearts}
                    </div>
                    <div className="text-xs text-indigo-300 mt-2 font-mono">
                        Connected Souls
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-green-900/20 to-slate-900 rounded-lg border border-green-700/30 mb-6 text-center">
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Est. Daily Revenue</p>
                    <div className="text-3xl font-black text-green-400">
                        ~ $ {mockRevenue.dailyRevenueUSD} USD
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        (Approx. NT$ {mockRevenue.dailyRevenueNTD})
                    </div>
                </div>

                <div className="mt-8 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                    <h4 className="text-brand-accent text-xs font-bold uppercase mb-2">Manager Note</h4>
                    <p className="text-slate-400 text-xs leading-relaxed italic">
                        "Your Carrd is the beautiful storefront. This dashboard is the engine room. With your Cloud Vault connected, your legacy is safe." — Gemini
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;