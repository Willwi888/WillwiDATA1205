
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';

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

  // 系統設置表單
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
               <div className="bg-slate-900 border border-white/5 p-12 max-w-md w-full shadow-2xl text-center animate-blur-in">
                   <h2 className="text-brand-gold font-black uppercase tracking-widest text-sm mb-10">Manager Login</h2>
                   <input type="password" placeholder="ACCESS CODE" className="w-full bg-black border border-white/10 px-6 py-5 text-white text-center tracking-[1em] mb-8 outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (passwordInput === '8520' ? enableAdmin() : setLoginError('密碼錯誤'))} />
                   {loginError && <p className="text-red-500 text-[10px] font-bold mb-6 uppercase">{loginError}</p>}
                   <button onClick={() => passwordInput === '8520' ? enableAdmin() : setLoginError('密碼錯誤')} className="w-full py-4 bg-white text-black font-black uppercase text-xs">Unlock Console</button>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-10 pt-32 pb-60 animate-fade-in">
      
      <div className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Console</h1>
            <div className="flex items-center gap-3 mt-4">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{syncSuccess ? 'Cloud Connected' : 'Cloud Error'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => uploadSongsToCloud()} disabled={isSyncing} className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase hover:bg-brand-gold disabled:opacity-50">Push Cloud Sync</button>
            <button onClick={() => navigate('/add')} className="px-6 py-3 bg-brand-accent text-black text-[10px] font-black uppercase">Add Song</button>
            <button onClick={logoutAdmin} className="px-6 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase">Exit</button>
          </div>
      </div>

      {!syncSuccess && lastError && (
          <div className="mb-10 p-6 bg-rose-950/30 border border-rose-500/50 rounded font-mono text-[10px] text-rose-300">
              Diagnostic: {lastError}
          </div>
      )}

      <div className="flex gap-10 border-b border-white/5 mb-10">
          {['catalog', 'settings', 'system'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-[11px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>{tab}</button>
          ))}
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-6">
              <input type="text" placeholder="Filter by Title..." className="w-full bg-slate-900 border border-white/10 p-4 text-white text-xs outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="bg-slate-900 border border-white/5 rounded overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                      <thead className="bg-black text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                              <th className="p-5">Track Info</th>
                              <th className="p-5">Studio Access</th>
                              <th className="p-5 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className="hover:bg-white/[0.02]">
                                  <td className="p-5 flex items-center gap-4">
                                      <img src={song.coverUrl} className="w-10 h-10 object-cover" alt="" />
                                      <span className="text-white font-bold text-sm uppercase">{song.title}</span>
                                  </td>
                                  <td className="p-5">
                                      <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-4 py-1 text-[9px] font-black uppercase border ${song.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-500 border-white/10'}`}>{song.isInteractiveActive ? 'ON' : 'OFF'}</button>
                                  </td>
                                  <td className="p-5 text-right space-x-4">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-brand-gold font-black uppercase">Edit</button>
                                      <button onClick={() => window.confirm('Delete?') && deleteSong(song.id)} className="text-[10px] text-rose-500 font-black uppercase">Delete</button>
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
              <div className="space-y-8 bg-slate-900 p-10 rounded">
                  <h3 className="text-brand-gold font-black uppercase text-xs">Access Control</h3>
                  <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 uppercase font-black">Studio Passcode (通行碼)</label>
                      <input value={settingsForm.accessCode} onChange={e => setSettingsForm(p => ({...p, accessCode: e.target.value}))} className="w-full bg-black border border-white/10 p-4 text-white font-mono text-xl text-center" />
                  </div>
                  <button onClick={handleSaveSettings} className="w-full py-4 bg-brand-gold text-black font-black uppercase text-xs">Update Passcode</button>
              </div>
              <div className="space-y-8 bg-slate-900 p-10 rounded">
                  <h3 className="text-brand-gold font-black uppercase text-xs">Homepage Visuals</h3>
                  <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 uppercase font-black">Portrait URL (首頁人像地址)</label>
                      <input value={settingsForm.portraitUrl} onChange={e => setSettingsForm(p => ({...p, portraitUrl: e.target.value}))} className="w-full bg-black border border-white/10 p-4 text-white text-xs" />
                  </div>
                  <button onClick={handleSaveSettings} className="w-full py-4 bg-white text-black font-black uppercase text-xs">Update Visuals</button>
              </div>
          </div>
      )}

      {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {['qr_production', 'qr_cinema', 'qr_support'].map(key => (
                  <div key={key} className="bg-slate-900 p-8 rounded text-center">
                      <h4 className="text-[10px] text-slate-500 font-black uppercase mb-6">{key.replace('_', ' ')}</h4>
                      <div className="aspect-square bg-black border border-white/10 mb-6 flex items-center justify-center overflow-hidden">
                          {settingsForm[key as keyof typeof settingsForm] ? <img src={settingsForm[key as keyof typeof settingsForm] as string} className="w-full h-full object-contain" /> : <span className="text-slate-800 text-xs">Empty</span>}
                      </div>
                      <label className="block w-full py-3 bg-white text-black font-black uppercase text-[10px] cursor-pointer">
                          Upload New QR
                          <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload(key as keyof typeof settingsForm)} />
                      </label>
                  </div>
              ))}
              <div className="col-span-full pt-10">
                  <button onClick={handleSaveSettings} className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-[0.2em]">Save All QR & Settings</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
