
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, updateSong, globalSettings, setGlobalSettings,
    uploadSettingsToCloud, uploadSongsToCloud, isSyncing, syncSuccess, lastError
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'system'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [settingsForm, setSettingsForm] = useState(globalSettings);

  useEffect(() => {
    if (isAdmin) setSettingsForm(globalSettings);
  }, [isAdmin, globalSettings]);

  const handleSaveSettings = async () => {
      setGlobalSettings(settingsForm);
      await uploadSettingsToCloud(settingsForm);
      alert("全站設定已更新並同步至雲端。");
  };

  const handleQrUpload = (key: keyof typeof settingsForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettingsForm(prev => ({ ...prev, [key]: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const filteredSongs = useMemo(() => {
      return songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [songs, searchTerm]);

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black px-10">
               <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 p-12 max-w-md w-full shadow-2xl text-center animate-blur-in">
                   <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-sm mb-10">Console Authorized Access</h2>
                   <input type="password" placeholder="MANAGEMENT KEY" className="w-full bg-black border border-white/10 px-6 py-5 text-white text-center tracking-[1em] mb-10 outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (passwordInput === '8520' ? enableAdmin() : setLoginError('Access Denied'))} />
                   {loginError && <p className="text-rose-500 text-[10px] font-bold mb-6 uppercase tracking-widest">{loginError}</p>}
                   <button onClick={() => passwordInput === '8520' ? enableAdmin() : setLoginError('Access Denied')} className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-brand-gold transition-all">Unlock Dashboard</button>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-10 pt-32 pb-60 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter">Command Hub</h1>
            <div className="flex items-center gap-4 mt-4">
                <div className={`w-2.5 h-2.5 rounded-full ${syncSuccess ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">{syncSuccess ? 'Cloud Sync Online' : 'Cloud Sync Offline'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => uploadSongsToCloud()} disabled={isSyncing} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all disabled:opacity-50 shadow-xl">Push Database To Cloud</button>
            <button onClick={() => navigate('/add')} className="px-8 py-3 bg-brand-accent text-black text-[10px] font-black uppercase tracking-widest shadow-xl">Create New Entry</button>
            <button onClick={logoutAdmin} className="px-8 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Close Session</button>
          </div>
      </div>

      {!syncSuccess && lastError && (
          <div className="mb-10 p-6 bg-rose-950/30 border border-rose-500/50 rounded-sm font-mono text-[10px] text-rose-300 animate-pulse">
              SYNC DIAGNOSTIC: {lastError}
          </div>
      )}

      <div className="flex gap-12 border-b border-white/5 mb-12">
          {['catalog', 'settings', 'system'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>{tab}</button>
          ))}
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-8">
              <input type="text" placeholder="Search entries by title or identifier..." className="w-full bg-slate-900/60 border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold transition-all font-bold tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="bg-slate-900/40 border border-white/5 rounded-sm overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                  <table className="w-full text-left">
                      <thead className="bg-black/80 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
                          <tr>
                              <th className="p-6">Metadata Entry</th>
                              <th className="p-6 text-center">Studio Lock</th>
                              <th className="p-6 text-right">Operations</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className="hover:bg-white/[0.03] transition-all group">
                                  <td className="p-6 flex items-center gap-6">
                                      <img src={song.coverUrl} className="w-12 h-12 object-cover rounded shadow-lg group-hover:scale-110 transition-transform" alt="" />
                                      <div>
                                          <span className="text-white font-black text-sm uppercase tracking-widest">{song.title}</span>
                                          <div className="text-[9px] text-slate-500 font-mono mt-1">{song.isrc || 'NO-ISRC'}</div>
                                      </div>
                                  </td>
                                  <td className="p-6 text-center">
                                      <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-6 py-2 text-[10px] font-black uppercase border rounded-sm transition-all ${song.isInteractiveActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-slate-600 border-white/10'}`}>
                                          {song.isInteractiveActive ? 'PUBLIC ACTIVE' : 'LOCKED'}
                                      </button>
                                  </td>
                                  <td className="p-6 text-right space-x-6">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-brand-gold font-black uppercase tracking-widest hover:text-white transition-all">Configure</button>
                                      <button onClick={() => window.confirm('Permanently delete this entry?') && deleteSong(song.id)} className="text-[10px] text-rose-500 font-black uppercase tracking-widest hover:text-rose-400 transition-all">Purge</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-10 bg-slate-900/60 p-12 border border-white/5 rounded-sm">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs">Security Config</h3>
                  <div className="space-y-6">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Studio Global Passcode</label>
                      <input value={settingsForm.accessCode} onChange={e => setSettingsForm(p => ({...p, accessCode: e.target.value}))} className="w-full bg-black border border-white/10 p-6 text-white font-mono text-3xl text-center outline-none focus:border-brand-gold transition-all" />
                      <p className="text-[9px] text-slate-600 leading-relaxed font-bold uppercase tracking-widest">Public users require this code to enter the interactive studio session.</p>
                  </div>
                  <button onClick={handleSaveSettings} className="w-full py-5 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest shadow-2xl">Apply Access Update</button>
              </div>
              <div className="space-y-10 bg-slate-900/60 p-12 border border-white/5 rounded-sm">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs">Brand Narrative</h3>
                  <div className="space-y-6">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Primary Portrait URL</label>
                      <input value={settingsForm.portraitUrl} onChange={e => setSettingsForm(p => ({...p, portraitUrl: e.target.value}))} className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold font-mono" />
                      <p className="text-[9px] text-slate-600 leading-relaxed font-bold uppercase tracking-widest">Controls the full-screen cinematic portrait visual on the landing page.</p>
                  </div>
                  <button onClick={handleSaveSettings} className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest shadow-2xl">Update Core Branding</button>
              </div>
          </div>
      )}

      {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {['qr_production', 'qr_cinema', 'qr_support'].map(key => (
                  <div key={key} className="bg-slate-900/60 p-10 border border-white/5 rounded-sm text-center group">
                      <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-8">{key.replace('_', ' ')} RESOURCE</h4>
                      <div className="aspect-square bg-black border border-white/10 mb-8 flex items-center justify-center overflow-hidden rounded-sm shadow-inner group-hover:border-brand-gold/50 transition-all">
                          {settingsForm[key as keyof typeof settingsForm] ? <img src={settingsForm[key as keyof typeof settingsForm] as string} className="w-full h-full object-contain p-4" alt="" /> : <span className="text-slate-800 text-[9px] uppercase font-black tracking-widest">Resource Empty</span>}
                      </div>
                      <label className="block w-full py-4 bg-white text-black font-black uppercase text-[9px] tracking-widest cursor-pointer shadow-xl hover:bg-brand-gold transition-all">
                          Upload New Map
                          <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(key as keyof typeof settingsForm)} />
                      </label>
                  </div>
              ))}
              <div className="col-span-full pt-16">
                  <button onClick={handleSaveSettings} className="w-full py-8 bg-brand-gold text-black font-black uppercase tracking-[0.6em] text-xs shadow-[0_20px_60px_rgba(251,191,36,0.3)] hover:scale-[1.01] transition-all">Commit Global Infrastructure Update</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
