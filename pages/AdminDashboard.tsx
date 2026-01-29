
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, ProjectType } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud,
    uploadSongsToCloud, syncSuccess
  } = useData();
  const { isAdmin, logoutAdmin, enableAdmin, getAllUsers, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

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

  const filteredSongs = useMemo(() => {
    return songs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && s.isrc.includes(searchTerm)) ||
        (s.upc && s.upc.includes(searchTerm))
    ).sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }, [songs, searchTerm]);

  const handleUpdateSetting = (key: string, value: string) => {
      const newSettings = { ...globalSettings, [key]: value };
      setGlobalSettings(newSettings);
      uploadSettingsToCloud(newSettings);
      showToast("設定已同步", "success");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-950 border border-white/5 p-16 max-w-md w-full shadow-2xl text-center rounded-sm">
          <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs mb-10">Manager Console</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); } else { showToast("密碼錯誤", "error"); } }} className="space-y-6">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[1em] outline-none focus:border-brand-gold text-4xl font-mono" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock Access</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start mb-24 gap-12">
          <div>
            <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none mb-4">指揮中心</h1>
            <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${syncSuccess ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">DATABASE: {syncSuccess ? 'CLOUD SYNC READY' : 'LOCAL ONLY'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-10 py-5 bg-brand-accent text-black text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-white transition-all">新增作品</button>
            <button onClick={() => uploadSongsToCloud()} className="px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-gold transition-all">備份雲端</button>
            <button onClick={logoutAdmin} className="px-10 py-5 border border-white/10 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">登出系統</button>
          </div>
      </div>

      <div className="flex gap-16 border-b border-white/5 mb-16">
          {(['catalog', 'insights', 'curation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[12px] font-black uppercase tracking-[0.5em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                  {tab === 'catalog' ? '作品目錄' : tab === 'insights' ? '數據洞察' : '策展工具'}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-12">
              <div className="flex flex-col md:flex-row gap-6">
                <input type="text" placeholder="搜尋 ISRC / UPC / 標題..." className="flex-1 bg-slate-900/30 border border-white/5 p-6 text-white text-xs font-bold tracking-widest outline-none focus:border-white/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="flex items-center gap-4 bg-white/5 px-8 rounded-sm text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    顯示 {filteredSongs.length} 首
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-sm overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                              <th className="p-6">作品資訊</th>
                              <th className="p-6">ISRC</th>
                              <th className="p-6">發行日期</th>
                              <th className="p-6">資產狀態</th>
                              <th className="p-6 text-right">操作</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredSongs.map(song => (
                              <tr key={song.id} className="group hover:bg-white/[0.02] transition-all">
                                  <td className="p-6">
                                      <div className="flex items-center gap-4">
                                          <img src={song.coverUrl} className="w-10 h-10 object-cover border border-white/10" alt="" />
                                          <div>
                                              <span className="text-white font-bold text-xs uppercase tracking-widest">{song.title}</span>
                                              <p className="text-[9px] text-slate-600 font-mono mt-1">{song.upc || '無 UPC'}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-6 font-mono text-[10px] text-brand-gold">{song.isrc}</td>
                                  <td className="p-6 font-mono text-[10px] text-slate-500">{song.releaseDate}</td>
                                  <td className="p-6">
                                      <div className="flex gap-2">
                                          <div className={`w-2 h-2 rounded-full ${song.audioUrl ? 'bg-emerald-500' : 'bg-rose-500'}`} title={song.audioUrl ? '音檔已就緒' : '缺音檔'}></div>
                                          <div className={`w-2 h-2 rounded-full ${song.lyrics ? 'bg-emerald-500' : 'bg-rose-500'}`} title={song.lyrics ? '歌詞已就緒' : '缺歌詞'}></div>
                                          <div className={`w-2 h-2 rounded-full ${song.isInteractiveActive ? 'bg-brand-accent' : 'bg-slate-700'}`} title={song.isInteractiveActive ? '對時開放中' : '對時關閉'}></div>
                                      </div>
                                  </td>
                                  <td className="p-6 text-right">
                                      <div className="flex justify-end gap-6">
                                          <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-white/40 font-black uppercase tracking-widest hover:text-white">Edit</button>
                                          <button onClick={() => { if(window.confirm('確定刪除？')) deleteSong(song.id); }} className="text-[10px] text-rose-900 font-black uppercase tracking-widest hover:text-rose-500">Del</button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
              {[
                { label: 'Total Fans', value: stats.totalUsers, color: 'text-brand-accent' },
                { label: 'Support Total', value: `NT$ ${stats.totalIncome.toLocaleString()}`, color: 'text-emerald-400' },
                { label: 'Interactive Active', value: stats.activeInteractive, color: 'text-brand-gold' },
                { label: 'Missing Assets', value: stats.missingData, color: 'text-rose-400' }
              ].map(stat => (
                  <div key={stat.label} className="bg-white/5 border border-white/10 p-10 rounded-sm">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6 block">{stat.label}</span>
                      <div className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'curation' && (
          <div className="space-y-24 animate-fade-in">
              <section className="space-y-12">
                  <h3 className="text-brand-gold font-black uppercase tracking-widest text-xs border-l border-brand-gold pl-6">系統參數與通行碼</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">互動實驗室解鎖碼 (Access Code)</span>
                          <input 
                            type="text" 
                            className="w-full bg-black border border-white/10 p-6 text-brand-gold font-mono tracking-[0.5em] text-2xl outline-none focus:border-brand-gold" 
                            value={globalSettings.accessCode} 
                            onChange={(e) => handleUpdateSetting('accessCode', e.target.value)}
                          />
                      </div>
                      <div className="space-y-4">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">精選 YouTube 頻道網址</span>
                          <input 
                            type="text" 
                            className="w-full bg-black border border-white/10 p-6 text-white text-xs outline-none focus:border-brand-gold" 
                            value={globalSettings.exclusiveYoutubeUrl} 
                            onChange={(e) => handleUpdateSetting('exclusiveYoutubeUrl', e.target.value)}
                          />
                      </div>
                  </div>
              </section>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
