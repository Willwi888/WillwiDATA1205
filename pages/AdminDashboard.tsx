
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Language, Song } from '../types';

type AdminTab = 'catalog' | 'settings' | 'payment';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, 
    uploadSettingsToCloud, currentSong, setCurrentSong, isPlaying, setIsPlaying,
    updateSong, isSyncing
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSongs = useMemo(() => {
    return songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && normalizeIdentifier(s.isrc).includes(normalizeIdentifier(searchTerm)))
    );
  }, [songs, searchTerm]);

  const handleSaveSettings = async () => {
    await uploadSettingsToCloud(globalSettings);
    showToast("全站設定已同步");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-16 max-w-md w-full text-center space-y-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-[0.4em]">Manager</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); }} className="space-y-8">
            <input type="password" placeholder="••••" className="w-full bg-black border-b border-white/20 px-4 py-6 text-white text-center tracking-[1em] font-mono text-3xl outline-none focus:border-brand-gold" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-widest text-xs">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-48 animate-fade-in pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-10">
        <div>
          <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">Console</h1>
          <p className="text-brand-gold text-[11px] font-black uppercase tracking-[0.6em] mt-4">Pure Data Management</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/add')} className="h-14 px-12 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all">New Entry</button>
          <button onClick={logoutAdmin} className="h-14 px-12 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Logout</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-16 gap-12">
        {[
          { id: 'catalog', label: '庫存清單' },
          { id: 'settings', label: '全站設置' },
          { id: 'payment', label: '支付更新' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === tab.id ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-12 animate-fade-in">
          <div className="relative">
            <input type="text" placeholder="SEARCH TITLE / ISRC..." className="w-full bg-transparent border-b border-white/10 px-4 py-8 text-2xl outline-none focus:border-brand-gold text-white font-bold uppercase tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="space-y-4">
            {filteredSongs.map((track) => (
              <div key={track.id} className="group flex items-center gap-10 p-8 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                <img src={track.coverUrl} className="w-20 h-20 object-cover shadow-2xl grayscale group-hover:grayscale-0 transition-all" alt="" />
                <div className="flex-1">
                  <h4 className="text-xl font-black text-white uppercase tracking-wider">{track.title}</h4>
                  <div className="flex gap-6 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>{track.isrc}</span>
                    <span>{track.releaseDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <button 
                    onClick={() => updateSong(track.id, { isInteractiveActive: !track.isInteractiveActive })}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-sm border ${track.isInteractiveActive ? 'bg-emerald-500 text-black border-emerald-500' : 'text-slate-600 border-white/10'}`}
                  >
                    {track.isInteractiveActive ? 'Active' : 'Private'}
                  </button>
                  <button onClick={() => navigate(`/add?edit=${track.id}`)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) deleteSong(track.id); }} className="text-[10px] font-black uppercase text-rose-900 hover:text-rose-500 transition-all">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-12 animate-fade-in">
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">網站視覺背景 (YouTube, MP4 或圖片)</h3>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">支援 YouTube 網址、MP4 直連或靜態圖。系統會自動進行全螢幕適應。</p>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.portraitUrl} onChange={(e) => setGlobalSettings(prev => ({ ...prev, portraitUrl: e.target.value }))} placeholder="Paste YouTube or MP4 URL here..." />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">環境背景音樂 (MP3 如 Anapana)</h3>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">進入網站點擊解鎖後會自動循環播放。若已設定 YouTube 則可留空或以此 MP3 為優先。</p>
            <input className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" value={globalSettings.qr_global_payment} onChange={(e) => setGlobalSettings(prev => ({ ...prev, qr_global_payment: e.target.value }))} placeholder="Paste Anapana MP3 URL here..." />
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">工作室通行碼</h3>
            <input className="w-40 bg-black border border-white/10 p-6 text-white text-4xl font-black text-center outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={(e) => setGlobalSettings(prev => ({ ...prev, accessCode: e.target.value }))} />
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Save & Sync</button>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="animate-fade-in space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { key: 'qr_production', label: '製作體驗 (STUDIO)' },
              { key: 'qr_cinema', label: '影院模式 (CINEMA)' },
              { key: 'qr_support', label: '創作贊助 (SUPPORT)' },
              { key: 'qr_line', label: 'LINE 官方 (COMM)' }
            ].map(item => (
              <div key={item.key} className="p-6 bg-white/[0.01] border border-white/5 text-center space-y-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</h4>
                <div className="aspect-square bg-white/5 flex items-center justify-center relative group overflow-hidden">
                  {(globalSettings as any)[item.key] && <img src={(globalSettings as any)[item.key]} className="w-full h-full object-contain" alt="" />}
                  <label className="absolute inset-0 flex items-center justify-center bg-brand-gold/90 text-black font-black text-[9px] uppercase opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setGlobalSettings(prev => ({ ...prev, [item.key]: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveSettings} className="px-16 py-6 bg-brand-gold text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-white transition-all">Sync All Assets</button>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
