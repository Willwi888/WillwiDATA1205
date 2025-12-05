import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { dbService } from '../services/db';
import { Song } from '../types';

const AdminDashboard: React.FC = () => {
  const { songs } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');

  // 1. Calculate Catalog Health
  const totalSongs = songs.length;
  const missingISRC = songs.filter(s => !s.isrc).length;
  const missingLyrics = songs.filter(s => !s.lyrics || s.lyrics.length < 10).length;
  const hasMusicBrainz = songs.filter(s => s.musicBrainzId).length;

  // 2. Mock Data for "Business Intelligence"
  // Updated to reflect the user's real milestones (4500 hearts, approx revenue)
  const mockRevenue = {
    dailyRevenueUSD: 500, // Approx $500 USD/day
    dailyRevenueNTD: 16000, 
    hearts: 4500, // The 4500 hearts milestone
    downloads: 128
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
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Manager Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Willwi's Legacy Archive & Performance</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse shadow-[0_0_10px_#38bdf8]"></span>
             <span className="text-xs text-brand-accent font-mono uppercase font-bold">Virtual Manager: Active</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: Legacy Archive Protocol (Google Drive Integration) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Backup Center */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 bg-brand-gold text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg uppercase tracking-wider">Priority Action</div>
                 
                 <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    ☁️ Google Drive Archiving Strategy
                 </h2>
                 <p className="text-slate-300 text-sm mb-6 max-w-lg leading-relaxed">
                    為了確保您的作品「永遠聽得到」，請定期執行此流程。將此網站產生的資料檔 (JSON) 上傳至您的 2TB 雲端空間，與您的音樂母帶放在一起。
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                     <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent text-brand-darker font-bold flex items-center justify-center text-xs">1</span>
                             <span className="text-white text-sm">Download Metadata File</span>
                         </div>
                         <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-white hover:text-slate-900 text-white font-bold rounded-lg transition-all border border-slate-600"
                        >
                             <span>⬇️ Export .JSON</span>
                         </button>
                     </div>

                     <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-slate-900 font-bold flex items-center justify-center text-xs">2</span>
                             <span className="text-white text-sm">Upload to Google Drive</span>
                         </div>
                         <button 
                            onClick={openGoogleDrive}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-all shadow-lg"
                        >
                            <span>↗️ Open Google Drive</span>
                        </button>
                     </div>
                 </div>

                 {/* Restore Section (Small) */}
                 <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-between">
                     <div className="text-xs text-slate-500">
                         Need to restore data on a new device?
                     </div>
                     <div className="relative">
                        <button 
                            onClick={handleImportClick}
                            disabled={isProcessing}
                            className="text-xs text-brand-accent hover:text-white underline"
                        >
                            Import Backup File
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

            {/* Health Check */}
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

                {/* Missing Data List */}
                {(missingISRC > 0 || missingLyrics > 0) && (
                    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/30 text-red-200 text-xs font-bold uppercase tracking-wider flex justify-between">
                            <span>Completeness Report</span>
                            <span>{missingISRC + missingLyrics} Issues</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {songs.map(song => {
                                const issues = [];
                                if (!song.isrc) issues.push('ISRC');
                                if (!song.lyrics || song.lyrics.length < 10) issues.push('Lyrics');

                                if (issues.length === 0) return null;

                                return (
                                    <div key={song.id} className="flex items-center justify-between p-3 border-b border-slate-800 last:border-0 hover:bg-slate-900 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img src={song.coverUrl} className="w-8 h-8 rounded bg-slate-800 object-cover" alt="cover"/>
                                            <span className="text-sm font-medium text-slate-300">{song.title}</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-1">
                                                {issues.map(i => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-900/50">{i}</span>
                                                ))}
                                            </div>
                                            <Link to={`/song/${song.id}`} className="text-xs bg-slate-800 hover:bg-white text-slate-300 hover:text-black px-3 py-1 rounded transition-colors">Edit</Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* COL 2: Business Simulation (MOCK DATA) */}
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

                <div className="space-y-4">
                     <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                         <span className="text-sm text-slate-400">Lyric Videos Created</span>
                         <span className="font-mono font-bold text-white">{mockRevenue.downloads}</span>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                    <h4 className="text-brand-accent text-xs font-bold uppercase mb-2">Virtual Manager Note</h4>
                    <p className="text-slate-400 text-xs leading-relaxed italic">
                        "Data stored in local browser. Remember to use the backup feature to save your legacy to your 2TB Drive. I am here to help you preserve your history." — Gemini
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;