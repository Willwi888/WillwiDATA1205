
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, ProjectType } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud,
    uploadSongsToCloud, syncSuccess, playSong
  } = useData();
  const { isAdmin, logoutAdmin, enableAdmin, getAllUsers, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Stats for Insights
  const [stats, setStats] = useState({
      totalUsers: 0,
      totalIncome: 0,
      missingData: 0,
      activeInteractive: 0
  });

  useEffect(() => {
    if (isAdmin) {
        const users = getAllUsers();
        const txs = getAllTransactions();
        setStats({
            totalUsers: users.length,
            totalIncome: txs.reduce((acc, t) => acc + t.amount, 0),
            missingData: songs.filter(s => !s.audioUrl || !s.lyrics).length,
            activeInteractive: songs.filter(s => s.isInteractiveActive).length
        });
    }
  }, [isAdmin, songs, getAllUsers, getAllTransactions]);

  const groupedByAlbum = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || `未分類發行`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || (s.isrc && s.isrc.includes(searchTerm)))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  const handleUpdateSetting = (key: string, value: string) => {
      const newSettings = { ...globalSettings, [key]: value };
      setGlobalSettings(newSettings);
      uploadSettingsToCloud(newSettings);
      showToast("設定已同步至雲端", "success");
  };

  const handleImageUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              handleUpdateSetting(key, reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-950 border border-white/5 p-16 max-w-md w-full shadow-2xl text-center rounded-sm">
          <h2 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-xs mb-10">Manager Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); } else { showToast("密碼錯誤", "error"); } }} className="space-y-6">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[1em] outline-none focus:border-brand-gold text-4xl font-mono" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <button type="submit" className="w-full py-5 bg-white text-black font-medium uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-24 gap-12">
          <div>
            <h1 className="text-7xl font-medium text-white uppercase tracking-tighter leading-none mb-4">指揮中心</h1>
            <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.5em]">CLOUD: {syncSuccess ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-10 py-5 bg-brand-gold text-black text-[11px] font-medium uppercase tracking-widest shadow-xl">新增作品</button>
            <button onClick={() => uploadSongsToCloud()} className="px-10 py-5 bg-white text-black text-[11px] font-medium uppercase tracking-widest shadow-xl">備份雲端</button>
            <button onClick={logoutAdmin} className="px-10 py-5 border border-white/10 text-slate-500 text-[11px] font-medium uppercase tracking-widest hover:text-white transition-all">登出系統</button>
          </div>
      </div>

      <div className="flex gap-16 border-b border-white/5 mb-16">
          {(['catalog', 'insights', 'curation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[12px] font-medium uppercase tracking-[0.5em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                  {tab === 'catalog' ? '作品目錄' : tab === 'insights' ? '數據洞察' : '策展工具'}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-16">
              <input type="text" placeholder="搜尋標題、ISRC 或 UPC..." className="w-full bg-slate-900/30 border border-white/5 p-6 text-white text-xs font-medium tracking-widest outline-none focus:border-white/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {groupedByAlbum.map(([upc, items]) => (
                  <div key={upc} className="border-b border-white/5 pb-16">
                      <div className="flex items-center gap-4 mb-10">
                          <h3 className="text-white font-medium uppercase tracking-widest text-xl">{upc}</h3>
                          <span className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">({items.length} TRACKS)</span>
                      </div>
                      <div className="space-y-4">
                          {items.map(song => (
                              <div key={song.id} className="flex items-center justify-between py-5 border-b border-white/[0.03] group hover:bg-white/[0.02] px-4 transition-all">
                                  <div className="flex items-center gap-8">
                                      <img src={song.coverUrl} className="w-12 h-12 object-cover border border-white/10" alt="" />
                                      <div>
                                          <span className="text-white font-medium text-sm uppercase tracking-widest">{song.title}</span>
                                          <p className="text-[10px] text-slate-600 font-mono mt-1">ISRC: {song.isrc || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-8">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-white/60 font-medium uppercase tracking-widest hover:text-brand-gold">EDIT</button>
                                      <button onClick={() => deleteSong(song.id)} className="text-[10px] text-rose-900 font-medium uppercase tracking-widest hover:text-rose-500">DEL</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
              {[
                { label: 'Total Fans', value: stats.totalUsers, color: 'text-brand-accent' },
                { label: 'Creative Support', value: `NT$ ${stats.totalIncome.toLocaleString()}`, color: 'text-emerald-400' },
                { label: 'Interactive Active', value: stats.activeInteractive, color: 'text-brand-gold' },
                { label: 'Missing Assets', value: stats.missingData, color: 'text-rose-400' }
              ].map(stat => (
                  <div key={stat.label} className="bg-white/5 border border-white/10 p-10 rounded-sm">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-6 block">{stat.label}</span>
                      <div className={`text-4xl font-medium tracking-tighter ${stat.color}`}>{stat.value}</div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'curation' && (
          <div className="space-y-24 animate-fade-in">
              <section className="space-y-12">
                  <h3 className="text-brand-gold font-medium uppercase tracking-widest text-xs border-l border-brand-gold pl-6">金流 QR Code 設置</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {['qr_global_payment', 'qr_production', 'qr_cinema', 'qr_support', 'qr_line'].map(key => (
                          <div key={key} className="p-8 bg-white/5 border border-white/5 text-center group">
                              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest mb-6 block">{key.replace('qr_', '').toUpperCase()}</span>
                              <div className="aspect-square bg-black border border-white/10 mb-6 flex items-center justify-center overflow-hidden">
                                  {globalSettings[key as keyof typeof globalSettings] ? (
                                      <img src={globalSettings[key as keyof typeof globalSettings] as string} className="w-full h-full object-contain" alt="" />
                                  ) : (
                                      <span className="text-slate-700 text-[9px]">NO IMAGE</span>
                                  )}
                              </div>
                              <label className="block w-full cursor-pointer py-4 border border-white/10 text-white/40 text-[9px] font-medium uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                  UPLOAD NEW
                                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload(key)} />
                              </label>
                          </div>
                      ))}
                  </div>
              </section>

              <section className="space-y-12">
                  <h3 className="text-brand-accent font-medium uppercase tracking-widest text-xs border-l border-brand-accent pl-6">全站視覺管理</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Global Background (全站背景)</span>
                          <div className="aspect-video bg-black border border-white/10 overflow-hidden relative group">
                              <img src={globalSettings.portraitUrl} className="w-full h-full object-cover opacity-60" alt="" />
                              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-[10px] text-white font-medium uppercase tracking-widest">Replace Background</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload('portraitUrl')} />
                              </label>
                          </div>
                      </div>
                      <div className="space-y-12">
                          <div className="space-y-4">
                              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">系統解鎖通行碼 (Access Code)</span>
                              <input 
                                type="text" 
                                className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono tracking-widest outline-none focus:border-brand-gold" 
                                value={globalSettings.accessCode} 
                                onChange={(e) => handleUpdateSetting('accessCode', e.target.value)}
                              />
                          </div>
                          <div className="space-y-4">
                              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">精選 YouTube 連結 (YouTube Featured)</span>
                              <input 
                                type="text" 
                                className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" 
                                value={globalSettings.exclusiveYoutubeUrl} 
                                onChange={(e) => handleUpdateSetting('exclusiveYoutubeUrl', e.target.value)}
                              />
                          </div>
                      </div>
                  </div>
              </section>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
