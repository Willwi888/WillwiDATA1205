import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, bulkAddSongs } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'songs' | 'data'>('songs');

  const filteredSongs = useMemo(() => {
      return songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [songs, searchTerm]);

  const handleExportJSON = async () => {
      const data = await dbService.getAllSongs();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WILLWI_CORE_DB_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (Array.isArray(data)) {
                  if (window.confirm(`將匯入 ${data.length} 筆作品。這會同步至此電腦資料庫，確定嗎？`)) {
                      await bulkAddSongs(data);
                      alert("同步完成。");
                      window.location.reload();
                  }
              }
          } catch (e) { alert("JSON 格式錯誤。"); }
      };
      reader.readAsText(file);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black">
               <div className="border border-white/10 p-12 max-w-sm w-full text-center">
                   <h2 className="text-xl font-black text-white mb-10 uppercase tracking-[0.4em]">Core Access</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); }} className="space-y-4">
                       <input type="password" placeholder="CODE" className="w-full bg-slate-900 px-4 py-5 text-white text-center tracking-[1em] font-mono outline-none border border-transparent focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       <button className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-brand-gold transition-all">Verify</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-20 animate-fade-in text-slate-100">
      <div className="flex justify-between items-end mb-20 border-b border-white/10 pb-10">
          <div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <div className="flex gap-10 mt-10">
                <button onClick={() => setActiveTab('songs')} className={`text-[11px] font-black uppercase tracking-[0.4em] pb-2 border-b-2 transition-all ${activeTab === 'songs' ? 'border-brand-gold text-white' : 'border-transparent text-slate-600'}`}>作品管理 (Manager)</button>
                <button onClick={() => setActiveTab('data')} className={`text-[11px] font-black uppercase tracking-[0.4em] pb-2 border-b-2 transition-all ${activeTab === 'data' ? 'border-brand-gold text-white' : 'border-transparent text-slate-600'}`}>跨機搬運 (Data Sync)</button>
            </div>
          </div>
          <button onClick={logoutAdmin} className="px-8 py-3 border border-red-900 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-900 hover:text-white transition-all">Logout</button>
      </div>

      {activeTab === 'songs' ? (
          <div className="animate-fade-in">
            <div className="mb-10 flex gap-px bg-white/10 p-px">
                <input 
                    type="text" 
                    placeholder="Search Track..." 
                    className="flex-grow bg-black px-6 py-5 text-white text-sm outline-none focus:bg-slate-900"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button onClick={() => navigate('/add')} className="bg-brand-accent text-slate-950 px-12 py-5 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all">New Entry</button>
            </div>

            <div className="border border-white/5 bg-black">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
                        <tr>
                            <th className="p-6">Cover / Title</th>
                            <th className="p-6">Release</th>
                            <th className="p-6 text-center">Interactive</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredSongs.map(song => (
                            <tr key={song.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-6">
                                        <img src={song.coverUrl} className="w-14 h-14 object-cover grayscale" alt="" />
                                        <div className="font-black text-white text-lg uppercase tracking-tight">{song.title}</div>
                                    </div>
                                </td>
                                <td className="p-6 text-xs text-slate-500 font-mono">{song.releaseDate}</td>
                                <td className="p-6 text-center">
                                    <button 
                                        onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })}
                                        className={`px-6 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${song.isInteractiveActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-600'}`}
                                    >
                                        {song.isInteractiveActive ? 'Active' : 'Hidden'}
                                    </button>
                                </td>
                                <td className="p-6 text-right space-x-4">
                                    <button onClick={() => navigate(`/song/${song.id}`)} className="text-[10px] text-slate-400 hover:text-white uppercase tracking-widest transition-all">Edit</button>
                                    <button onClick={() => { if(window.confirm('Confirm delete?')) deleteSong(song.id); }} className="text-[10px] text-red-700 hover:text-red-500 uppercase tracking-widest transition-all">Del</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1px bg-white/10 border border-white/10 animate-fade-in">
              <div className="bg-black p-20 flex flex-col items-center text-center group hover:bg-slate-900 transition-all">
                  <div className="w-20 h-20 border border-brand-gold text-brand-gold flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Export JSON</h3>
                  <p className="text-slate-500 text-xs mb-10 uppercase tracking-[0.2em] leading-loose">下載完整資料結構。用於在不同電腦登入時搬運正確的作品庫資料。</p>
                  <button onClick={handleExportJSON} className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.5em] hover:bg-brand-gold transition-all">Download Core Database</button>
              </div>

              <div className="bg-black p-20 flex flex-col items-center text-center group hover:bg-slate-900 transition-all">
                  <div className="w-20 h-20 border border-brand-accent text-brand-accent flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Import JSON</h3>
                  <p className="text-slate-500 text-xs mb-10 uppercase tracking-[0.2em] leading-loose">從其他電腦讀取 JSON 備份，將最新的作品集同步至此官網後台。</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJSON} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 border border-brand-accent text-brand-accent font-black uppercase text-xs tracking-[0.5em] hover:bg-brand-accent hover:text-black transition-all">Upload To Sync</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;