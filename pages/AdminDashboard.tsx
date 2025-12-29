
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType } from '../types';
import { useTranslation } from '../context/LanguageContext';

type Tab = 'catalog' | 'settings' | 'payment' | 'curation';
type SortKey = 'releaseDate' | 'title' | 'language';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs, dbStatus, storageUsage, lastSyncTime } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllUsers, getAllTransactions } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing_assets'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'releaseDate', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [qrImages, setQrImages] = useState({ global_payment: '', production: '', cinema: '', support: '', line: '' });
  const [accessCode, setAccessCode] = useState('8888');
  const [adminPassword, setAdminPassword] = useState('8520');
  const [importStrategy, setImportStrategy] = useState<'merge' | 'overwrite'>('merge');

  useEffect(() => {
      setQrImages({
          global_payment: localStorage.getItem('qr_global_payment') || '',
          production: localStorage.getItem('qr_production') || '',
          cinema: localStorage.getItem('qr_cinema') || '',
          support: localStorage.getItem('qr_support') || '',
          line: localStorage.getItem('qr_line') || ''
      });
      setAccessCode(localStorage.getItem('willwi_access_code') || '8888');
      setAdminPassword(localStorage.getItem('willwi_admin_password') || '8520');
  }, [isAdmin]);

  const handleSort = (key: SortKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const downloadFullBackup = async () => {
      const allSongs = await dbService.getAllSongs();
      const exportData = {
          metadata: { version: '3.0', exportedAt: new Date().toISOString(), count: allSongs.length },
          songs: allSongs
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_DATA_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
            const result = event.target?.result;
            if (typeof result !== 'string') return;
            const parsed = JSON.parse(result);
            const rawSongs = Array.isArray(parsed) ? parsed : (parsed.songs || []);
            if (!Array.isArray(rawSongs)) throw new Error("Invalid Format");

            if (window.confirm(`確認匯入 ${rawSongs.length} 筆作品？\n模式: ${importStrategy === 'overwrite' ? '覆寫' : '合併'}`)) {
                if (importStrategy === 'overwrite') await dbService.clearAllSongs();
                await bulkAddSongs(rawSongs);
                alert("Import Successful.");
                window.location.reload();
            }
          } catch (e) { alert("Import Failed. Invalid JSON."); }
      };
      reader.readAsText(file);
  };

  const filteredSongs = useMemo(() => {
      let result = songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
      if (filterStatus === 'active') result = result.filter(s => s.isInteractiveActive);
      if (filterStatus === 'inactive') result = result.filter(s => !s.isInteractiveActive);
      return result.sort((a, b) => {
          let valA = a[sortConfig.key] || '';
          let valB = b[sortConfig.key] || '';
          return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
  }, [songs, searchTerm, filterStatus, sortConfig]);

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">{t('admin_login_title')}</h2>
                   <form onSubmit={(e) => { 
                       e.preventDefault(); 
                       const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
                       if (passwordInput === correctPwd) enableAdmin(); 
                       else setLoginError(t('admin_login_error')); 
                   }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">{t('admin_login_btn')}</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">DATA OPERATIONS CENTER</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Database Integrity & Sync Control</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/add')} className="h-10 px-6 bg-brand-accent text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white transition-all shadow-lg">New Song</button>
            <button onClick={logoutAdmin} className="h-10 px-6 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-800">Exit</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-950 border border-white/10 p-6 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">DB STATUS</span>
              <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${dbStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xl font-black text-white tracking-widest">{dbStatus}</span>
              </div>
          </div>
          <div className="bg-slate-950 border border-white/10 p-6 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">CATALOG SIZE</span>
              <div className="text-xl font-black text-white tracking-widest">{songs.length} WORKS</div>
          </div>
          <div className="bg-slate-950 border border-white/10 p-6 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">STORAGE LOAD</span>
              <div className="text-xl font-black text-white tracking-widest">{(storageUsage / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <div className="bg-slate-950 border border-white/10 p-6 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">LAST SYNC</span>
              <div className="text-xl font-black text-white tracking-widest">{lastSyncTime ? lastSyncTime.toLocaleTimeString() : '--'}</div>
          </div>
      </div>

      <div className="flex gap-4 mb-8">
          <button onClick={() => setActiveTab('catalog')} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'catalog' ? 'bg-white text-black border-white' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>Song Management</button>
          <button onClick={() => setActiveTab('settings')} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'settings' ? 'bg-brand-accent text-black border-brand-accent' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>Data Ops & JSON</button>
          <button onClick={() => setActiveTab('payment')} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'payment' ? 'bg-brand-gold text-black border-brand-gold' : 'text-slate-500 border-white/10 hover:border-white/30'}`}>Payment Setup</button>
      </div>

      {activeTab === 'catalog' && (
          <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-500 uppercase font-black tracking-widest">
                      <tr>
                          <th className="p-4">Title</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Lab Status</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredSongs.map(s => (
                          <tr key={s.id} className="hover:bg-white/[0.02]">
                              <td className="p-4 font-bold text-white">{s.title}</td>
                              <td className="p-4 text-slate-500 font-mono">{s.releaseDate}</td>
                              <td className="p-4">
                                  <span className={`px-3 py-1 rounded-sm font-black text-[9px] ${s.isInteractiveActive ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                                      {s.isInteractiveActive ? 'OPEN' : 'CLOSED'}
                                  </span>
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={() => navigate(`/song/${s.id}`)} className="text-brand-accent font-bold hover:underline uppercase text-[10px]">Edit Details</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-slate-950 border border-white/10 p-10 rounded-lg flex flex-col justify-between">
                  <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-widest mb-4">Export Data (備份)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-8">將目前本地的所有資料導出為 JSON 檔案。您可以使用此檔案在其他電腦上匯入，以確保資料一致性。</p>
                  </div>
                  <button onClick={downloadFullBackup} className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-accent transition-all">Download JSON Backup</button>
              </div>
              <div className="bg-slate-950 border border-white/10 p-10 rounded-lg flex flex-col justify-between">
                  <div>
                      <h4 className="text-xl font-black text-brand-gold uppercase tracking-widest mb-4">Import Data (同步)</h4>
                      <div className="mb-6 flex gap-2 bg-black p-1 rounded border border-white/5">
                          <button onClick={() => setImportStrategy('merge')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${importStrategy === 'merge' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Smart Merge</button>
                          <button onClick={() => setImportStrategy('overwrite')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${importStrategy === 'overwrite' ? 'bg-red-900/40 text-red-400' : 'text-slate-500'}`}>Force Overwrite</button>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-8">上傳先前備份的 JSON 檔案。此動作會將檔案內的資料同步到目前的瀏覽器中。</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 border border-white/20 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">Upload JSON & Sync</button>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
