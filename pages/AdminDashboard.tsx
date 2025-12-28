import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const navigate = useNavigate();
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'curation'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSongs = useMemo(() => {
      return songs.filter(s => 
          s.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [songs, searchTerm]);

  const activeCount = songs.filter(s => s.isInteractiveActive).length;

  if (!isAdmin) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-[0.2em]">Manager Login</h2>
                   <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); }} className="space-y-6">
                       <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-slate-700 rounded px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-accent transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       <button className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded uppercase tracking-widest text-xs hover:bg-white transition-all">Unlock System</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-12 animate-fade-in pb-40">
      <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Admin Console</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Willwi Music Database Manager</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('catalog')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'catalog' ? 'bg-white text-black' : 'text-slate-500'}`}>Catalog</button>
            <button onClick={() => setActiveTab('curation')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'curation' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>Curation ({activeCount}/20)</button>
            <button onClick={logoutAdmin} className="px-6 py-2 border border-red-900 text-red-500 text-[10px] font-black uppercase tracking-widest">Logout</button>
          </div>
      </div>

      <div className="mb-6">
          <input 
              type="text" 
              placeholder="搜尋歌名..." 
              className="w-full bg-slate-900 border border-white/5 px-6 py-4 text-white text-sm outline-none focus:border-brand-gold transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
          />
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-sm overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
              <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                      <th className="p-4">Asset</th>
                      <th className="p-4">Release Info</th>
                      <th className="p-4 text-center">Studio Active</th>
                      <th className="p-4 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {filteredSongs.map(song => (
                      <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="p-4">
                              <div className="flex items-center gap-4">
                                  <img src={song.coverUrl} className="w-10 h-10 object-cover rounded border border-white/10" alt="" />
                                  <div className="font-bold text-white text-sm">{song.title}</div>
                              </div>
                          </td>
                          <td className="p-4 text-xs text-slate-400 font-mono">{song.releaseDate}</td>
                          <td className="p-4 text-center">
                              <button 
                                onClick={() => {
                                    if (!song.isInteractiveActive && activeCount >= 20 && activeTab === 'curation') {
                                        alert("前台僅限顯示 20 首，請先關閉其他作品。");
                                        return;
                                    }
                                    updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive });
                                }}
                                className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all ${song.isInteractiveActive ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-500'}`}
                              >
                                {song.isInteractiveActive ? 'ON' : 'OFF'}
                              </button>
                          </td>
                          <td className="p-4 text-right">
                              <button onClick={() => navigate(`/song/${song.id}`)} className="text-[10px] text-slate-300 hover:text-white border border-white/10 px-3 py-1 uppercase tracking-widest">EDIT</button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default AdminDashboard;