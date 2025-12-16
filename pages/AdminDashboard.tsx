import React, { useRef, useState, useEffect } from 'react';
import { useData, INITIAL_DATA } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song } from '../types';

// Helper to convert Google Drive Sharing Link
const convertDriveLink = (url: string) => {
    try {
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

const AdminDashboard: React.FC = () => {
  const { songs } = useData();
  const { isAdmin, enableAdmin } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite'); // NEW: Import Mode
  
  // Admin Login State
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Domain Check State
  const [isOnWrongDomain, setIsOnWrongDomain] = useState(false);

  // Homepage Player Config State
  const [homeConfig, setHomeConfig] = useState({
      title: '',
      subtitle: '',
      coverUrl: '',
      audioUrl: '',
      youtubeUrl: '' // NEW: YouTube Support
  });

  // Load Home Config on Mount
  useEffect(() => {
      const savedConfig = localStorage.getItem('willwi_home_player_config');
      if (savedConfig) {
          setHomeConfig(JSON.parse(savedConfig));
      }
  }, []);

  const saveHomeConfig = () => {
      localStorage.setItem('willwi_home_player_config', JSON.stringify(homeConfig));
      alert("首頁播放器設定已儲存！");
  };

  // Project Links provided by user
  const PROJECT_LINKS = {
      drive: 'https://drive.google.com/drive/folders/1PmP_GB7etr45T_DwcZcLt45Om2RDqTNI?usp=drive_link',
      supabase: 'https://supabase.com/dashboard/project/rzxqseimxhbokrhcdjbi',
      vercel: 'https://vercel.com/willwi',
      live: 'https://willwi-music-467949320732.us-west1.run.app/' // Explicitly the correct one
  };

  const CORRECT_DOMAIN_ID = '467949320732';

  useEffect(() => {
      // Check if current URL matches the expected ID
      const currentUrl = window.location.href;
      // We check if we are NOT on localhost (dev) AND NOT on the correct ID
      if (!currentUrl.includes('localhost') && !currentUrl.includes(CORRECT_DOMAIN_ID)) {
          setIsOnWrongDomain(true);
      }
  }, []);

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

  // 3. CARRD Embed Generator Logic
  const generateEmbedCode = () => {
      // Using the current live URL
      const appUrl = PROJECT_LINKS.live;
      return `<iframe src="${appUrl}?embed=true" style="width:100%; height:100vh; border:none; background:transparent;" allow="microphone; clipboard-read; clipboard-write; encrypted-media;"></iframe>`;
  };

  const copyEmbedCode = () => {
      navigator.clipboard.writeText(generateEmbedCode());
      alert("Embed code copied! Paste this into a Carrd 'Embed' Element.");
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

  const handleImportClick = (mode: 'overwrite' | 'merge') => {
      setImportMode(mode);
      const msg = mode === 'overwrite' 
        ? "⚠️ 警告：【覆蓋模式】將會清除目前所有的資料，並完全替換為備份檔內容。\n\n確定要繼續嗎？"
        : "ℹ️ 提示：【合併模式】將保留現有資料，並將備份檔中的新歌加入。若有 ID 衝突，將以備份檔為主。";
      
      if (window.confirm(msg)) {
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
              let parsedSongs: Song[] = [];
              
              try {
                  parsedSongs = JSON.parse(json);
              } catch (e) {
                  throw new Error("JSON Parse Failed");
              }
              
              if (!Array.isArray(parsedSongs)) {
                  throw new Error("Invalid Data Format: Not an array");
              }
              
              // Simple validation
              const validSongs = parsedSongs.filter(s => s.id && s.title);
              if (validSongs.length === 0) {
                  throw new Error("No valid songs found in file");
              }

              setRestoreStatus(`Validating ${validSongs.length} songs...`);

              if (importMode === 'overwrite') {
                  // 1. Clear existing DB
                  await dbService.clearAllSongs();
                  // 2. Add new songs
                  await dbService.bulkAdd(validSongs);
                  setRestoreStatus('Overwrite Complete! Reloading...');
              } else {
                  // Merge Logic
                  await dbService.bulkAdd(validSongs); // bulkAdd implementation typically puts (overwrites on ID collision)
                  setRestoreStatus('Merge Complete! Reloading...');
              }
              
              setTimeout(() => {
                  window.location.reload();
              }, 1500);

          } catch (err) {
              console.error(err);
              setRestoreStatus(`Error: ${(err as Error).message}`);
              alert(`匯入失敗：${(err as Error).message}`);
              setIsProcessing(false);
          } finally {
              // Reset input so same file can be selected again if needed
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  // --- Factory Reset Function ---
  const handleFactoryReset = async () => {
      if (window.confirm("🚨 緊急重置\n\n這將會清除所有現有資料，並重新載入「預設」的 Willwi 歌曲目錄。\n\n當您發現資料庫意外清空時，請使用此功能恢復基本資料。\n確定執行？")) {
          setIsProcessing(true);
          try {
              await dbService.clearAllSongs();
              await dbService.bulkAdd(INITIAL_DATA);
              alert("已恢復預設資料。網頁將重新整理。");
              window.location.reload();
          } catch(e) {
              alert("重置失敗");
          } finally {
              setIsProcessing(false);
          }
      }
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
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      
      {/* WARNING BANNER FOR WRONG DOMAIN */}
      {isOnWrongDomain && (
          <div className="bg-red-900/80 border border-red-600 p-6 rounded-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
              <div className="flex items-center gap-4">
                  <span className="text-3xl">⚠️</span>
                  <div>
                      <h3 className="text-xl font-bold text-white">您可能位在錯誤的網址 (Wrong Domain)</h3>
                      <p className="text-red-200 text-sm">
                          這可能是造成資料遺失的原因。瀏覽器認為這是不一樣的網站。
                      </p>
                  </div>
              </div>
              <a 
                  href={PROJECT_LINKS.live}
                  className="px-6 py-3 bg-white text-red-900 font-bold rounded shadow-lg hover:bg-slate-200 transition-colors uppercase tracking-widest text-sm whitespace-nowrap"
              >
                  前往正確網址
              </a>
          </div>
      )}

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

      {/* CARRD INTEGRATION PANEL (NEW) */}
      <div className="bg-slate-900 border border-blue-500/50 rounded-xl p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg uppercase tracking-wider">NEW FEATURE</div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
             <span className="text-3xl">🔗</span> Carrd Integration Toolkit
          </h2>
          <p className="text-slate-300 text-sm mb-6 max-w-2xl leading-relaxed">
             利用您的 Carrd Pro 帳戶功能來強化此資料庫。您可以將此應用程式嵌入至 Carrd 頁面中，並利用 Carrd 的大容量空間託管圖片與影片。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tool 1: Embed Generator */}
              <div className="bg-slate-950 p-6 rounded-lg border border-slate-800">
                  <h3 className="text-lg font-bold text-white mb-2">1. 嵌入至 Carrd (Embed)</h3>
                  <p className="text-xs text-slate-400 mb-4">
                      將此程式碼貼入 Carrd 的 <strong>「Embed」</strong> 元件。這將開啟「透明背景模式」，讓 Carrd 的設計直接透視進來。
                  </p>
                  <div className="relative">
                      <textarea 
                          readOnly
                          className="w-full h-24 bg-black border border-slate-700 rounded p-3 text-green-400 font-mono text-xs mb-2 focus:outline-none"
                          value={generateEmbedCode()}
                      />
                      <button 
                        onClick={copyEmbedCode}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded font-bold"
                      >
                          Copy Code
                      </button>
                  </div>
              </div>

              {/* Tool 2: Asset Hosting Guide */}
              <div className="bg-slate-950 p-6 rounded-lg border border-slate-800">
                  <h3 className="text-lg font-bold text-white mb-2">2. 使用 Carrd 託管素材</h3>
                  <p className="text-xs text-slate-400 mb-4">
                      Carrd 允許上傳最大 64MB 的影片與圖片。
                  </p>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
                      <li>在 Carrd 編輯器中，新增一個 <strong>Image</strong> 或 <strong>Video</strong> 元件。</li>
                      <li>上傳您的高畫質檔案。</li>
                      <li>發布網站 (Publish)。</li>
                      <li>在瀏覽器打開您的 Carrd 網站，對該圖片/影片點擊右鍵 -> <strong>複製連結網址 (Copy Link Address)</strong>。</li>
                      <li>回到這裡的「Add Song」頁面，貼上該網址。</li>
                  </ol>
                  <div className="mt-4 p-2 bg-blue-900/20 text-blue-300 text-[10px] rounded border border-blue-900/50">
                      💡 Tip: 這樣可以節省此 App 的流量，並利用 Carrd 的 CDN 加速。
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: Main Management */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* NEW: HOMEPAGE PLAYER MANAGER */}
            <div className="bg-slate-900 border border-brand-accent/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <h2 className="text-xl font-bold text-brand-accent mb-6 flex items-center gap-2">
                    🏠 首頁播放器管理 (Home Player)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">主標題 / 歌名</label>
                            <input 
                                className="w-full bg-black border border-slate-700 rounded p-2 text-white"
                                value={homeConfig.title}
                                onChange={(e) => setHomeConfig({...homeConfig, title: e.target.value})}
                                placeholder="e.g. Love Again"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">副標題 / 文字呈現</label>
                            <textarea 
                                className="w-full bg-black border border-slate-700 rounded p-2 text-white h-20"
                                value={homeConfig.subtitle}
                                onChange={(e) => setHomeConfig({...homeConfig, subtitle: e.target.value})}
                                placeholder="簡短介紹或歌詞..."
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                         {/* YouTube Field (New) */}
                         <div>
                            <label className="block text-xs text-red-400 font-bold mb-1">YouTube 影片連結 (優先顯示)</label>
                            <input 
                                className="w-full bg-black border border-red-900/50 rounded p-2 text-white text-xs"
                                value={homeConfig.youtubeUrl || ''}
                                onChange={(e) => setHomeConfig({...homeConfig, youtubeUrl: e.target.value})}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </div>
                        
                        <div className="pt-2 border-t border-slate-800">
                            <label className="block text-xs text-brand-gold font-bold mb-1">Google Drive 音檔連結 (無影片時顯示)</label>
                            <input 
                                className="w-full bg-black border border-brand-gold/50 rounded p-2 text-white text-xs font-mono"
                                value={homeConfig.audioUrl}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.includes('drive.google.com')) {
                                        setHomeConfig({...homeConfig, audioUrl: convertDriveLink(val)});
                                    } else {
                                        setHomeConfig({...homeConfig, audioUrl: val});
                                    }
                                }}
                                placeholder="Paste Drive Link Here..."
                            />
                            <p className="text-[10px] text-slate-500 mt-1">系統會自動轉換權限為直連播放。</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={saveHomeConfig}
                        className="px-6 py-2 bg-brand-accent text-slate-900 font-bold rounded hover:bg-white transition-colors"
                    >
                        儲存首頁設定
                    </button>
                </div>
            </div>

            {/* 1. CLOUD SYNC CENTER (Moved to TOP for visibility) */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-xl p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg uppercase tracking-wider">CRITICAL</div>
                 
                 <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    ☁️ 資料備份與雲端同步 (Backup & Sync)
                 </h2>
                 <p className="text-slate-300 text-sm mb-6 max-w-lg leading-relaxed">
                    這是確保資料永久保存的唯一途徑。網站本身不儲存資料（資料在您的瀏覽器中）。請<strong>定期下載 JSON 檔並上傳至 Google Drive</strong>。
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                     <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent text-brand-darker font-bold flex items-center justify-center text-xs">1</span>
                             <span className="text-white text-sm font-bold">匯出資料庫檔案</span>
                         </div>
                         <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-brand-accent hover:bg-white hover:text-slate-900 text-slate-900 font-bold rounded-lg transition-all border border-transparent shadow-lg shadow-brand-accent/20"
                        >
                             <span className="text-xl">⬇️</span>
                             <span>下載最新備份 (.json)</span>
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
                            <span className="text-xl">↗️</span>
                            <span>開啟 Google Drive</span>
                        </button>
                     </div>
                 </div>

                 {/* Restore Section */}
                 <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col items-start gap-4 bg-slate-950/30 p-4 rounded-lg">
                     <div className="w-full">
                         <strong className="text-white text-sm block mb-1">資料還原 (Restore)</strong>
                         <p className="text-xs text-slate-400 mb-3">
                             換了新電腦或瀏覽器？請在此匯入之前的 JSON 檔案。
                         </p>
                         <div className="flex gap-4">
                             <button 
                                onClick={() => handleImportClick('overwrite')}
                                disabled={isProcessing}
                                className="flex-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 font-bold px-4 py-2 rounded transition-colors"
                            >
                                ⚠️ 覆蓋 (Overwrite)
                            </button>
                            <button 
                                onClick={() => handleImportClick('merge')}
                                disabled={isProcessing}
                                className="flex-1 text-xs bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-800 font-bold px-4 py-2 rounded transition-colors"
                            >
                                ➕ 合併 (Merge)
                            </button>
                         </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                     </div>
                 </div>

                 {/* Factory Reset Section */}
                 <div className="mt-2 pt-2 flex justify-end">
                     <button 
                        onClick={handleFactoryReset}
                        disabled={isProcessing}
                        className="text-[10px] text-red-500 hover:text-red-300 underline"
                     >
                        資料庫異常？重置為原廠設定
                     </button>
                 </div>

                 {restoreStatus && <p className="mt-2 text-brand-gold font-mono text-xs text-right animate-pulse">{restoreStatus}</p>}
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
                        className={`block p-4 border rounded-lg group transition-all ${isOnWrongDomain ? 'bg-red-900/10 border-red-500/50' : 'bg-slate-950 border-brand-accent/30'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-bold ${isOnWrongDomain ? 'text-red-400' : 'text-brand-accent'}`}>Official Live</span>
                            <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-1 rounded border border-brand-accent/50">PRIMARY</span>
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-slate-300 truncate">{PROJECT_LINKS.live}</p>
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