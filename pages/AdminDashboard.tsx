
import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song, ProjectType, Language } from '../types';
import { useToast } from '../components/Layout';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [langFilter, setLangFilter] = useState('');

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLang = !langFilter || s.language === langFilter;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, langFilter]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black font-sans font-light">
        <div className="p-16 w-full max-w-sm text-center space-y-12 bg-white/[0.01] border border-white/5">
          <h2 className="text-xl uppercase tracking-[0.8em] text-white/40">Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else showToast('Error','error'); }} className="space-y-8">
            <input type="password" placeholder="CODE" className="w-full bg-transparent border-b border-white/10 px-4 py-6 text-white text-center tracking-[1.5em] text-2xl outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-4 border border-white/10 text-white/50 text-[9px] uppercase tracking-[0.6em] hover:bg-white hover:text-black transition-all">ENTER CONSOLE</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-40 px-10 md:px-24 font-sans font-light">
      <div className="flex justify-between items-end mb-24">
        <div className="space-y-4">
          <h1 className="text-4xl uppercase tracking-[0.6em] text-white">Management</h1>
          <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em]">System Status: {songs.length} Records Operational</p>
        </div>
        <div className="flex gap-8">
          <button onClick={() => navigate('/add')} className="text-[9px] uppercase tracking-[0.4em] text-white border-b border-white/10 pb-1 hover:border-brand-gold transition-all">New Track</button>
          <button onClick={logoutAdmin} className="text-[9px] uppercase tracking-[0.4em] text-rose-500/40 hover:text-rose-500 transition-all">Logout</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {['catalog', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-[10px] uppercase tracking-[0.4em] transition-all relative ${activeTab === tab ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}>
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[0.5px] bg-brand-gold"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          <div className="flex gap-12 items-center">
            <input type="text" placeholder="Search title..." className="flex-1 bg-transparent border-b border-white/10 py-3 text-lg text-white outline-none placeholder:text-white/5 uppercase tracking-widest font-thin" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <select value={langFilter} onChange={e => setLangFilter(e.target.value)} className="bg-transparent border border-white/5 text-[10px] text-slate-500 px-6 py-3 uppercase tracking-widest outline-none">
              <option value="">All Regions</option>
              {Object.values(Language).map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
          </div>
          
          <div className="bg-[#030303] border border-white/5">
            <table className="w-full text-left">
                <thead className="text-[8px] text-slate-600 uppercase tracking-[0.8em] border-b border-white/5">
                    <tr>
                        <th className="p-8 font-light">Metadata</th>
                        <th className="p-8 font-light">Type</th>
                        <th className="p-8 font-light text-center">Studio</th>
                        <th className="p-8 font-light text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} className="group hover:bg-white/[0.01] transition-all">
                            <td className="p-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-white/5 border border-white/5 overflow-hidden">
                                      <img src={song.coverUrl} className="w-full h-full object-cover opacity-60" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-xs uppercase tracking-widest mb-1">{song.title}</h4>
                                        <p className="text-[9px] text-slate-600 font-mono tracking-tighter">{song.isrc || 'NO ISRC'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8 text-[9px] text-slate-500 uppercase tracking-widest">{song.projectType}</td>
                            <td className="p-8 text-center">
                                <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[8px] uppercase tracking-widest px-4 py-2 border transition-all ${song.isInteractiveActive ? 'text-emerald-500 border-emerald-500/20' : 'text-slate-800 border-white/5'}`}>
                                   {song.isInteractiveActive ? 'OPEN' : 'LOCKED'}
                                </button>
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex justify-end gap-6">
                                  <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] text-slate-600 hover:text-white transition-all uppercase tracking-widest">Edit</button>
                                  <button onClick={() => deleteSong(song.id)} className="text-[9px] text-rose-900/40 hover:text-rose-500 transition-all uppercase tracking-widest">Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl animate-fade-in space-y-24">
          <div className="space-y-12">
            <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.8em]">Platform Assets</h4>
            <div className="grid grid-cols-2 gap-8">
              {(['qr_support', 'qr_production', 'qr_cinema'] as const).map(qr => (
                <div key={qr} className="space-y-4">
                  <div className="aspect-square bg-white/[0.02] border border-white/5 flex items-center justify-center p-8">
                    {(globalSettings as any)[qr] ? <img src={(globalSettings as any)[qr]} className="w-full h-full object-contain opacity-40 grayscale" /> : <span className="text-[9px] text-slate-800 uppercase tracking-widest">Empty</span>}
                  </div>
                  <label className="block text-center py-2 text-[8px] uppercase tracking-widest text-slate-600 border border-white/5 hover:bg-white hover:text-black cursor-pointer transition-all">
                    Upload {qr.replace('qr_','')}
                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                      const f = e.target.files?.[0];
                      if(f){
                        const r = new FileReader();
                        r.onloadend = () => setGlobalSettings({...globalSettings, [qr]: r.result as string});
                        r.readAsDataURL(f);
                      }
                    }} />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => uploadSettingsToCloud(globalSettings)} className="px-16 py-4 border border-brand-gold/40 text-brand-gold text-[9px] uppercase tracking-[0.5em] hover:bg-brand-gold hover:text-black transition-all shadow-2xl">SYNC CLOUD DATA</button>
        </div>
      )}
    </div>
  );
}; 

export default AdminDashboard;
