
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, Language, ProjectType, ReleaseCategory } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, playSong,
    uploadSongsToCloud, syncSuccess
  } = useData();
  const { isAdmin, logoutAdmin, enableAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const groupedByAlbum = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || `未定義專輯`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([_, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || (s.isrc && s.isrc.includes(searchTerm)))
    ).sort((a, b) => b[1][0].releaseDate.localeCompare(a[1][0].releaseDate));
  }, [songs, searchTerm]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-slate-950 border border-white/5 p-16 max-w-md w-full shadow-2xl text-center rounded-sm">
          <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs mb-10">Manager Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') { enableAdmin(); } else { showToast("密碼錯誤", "error"); } }} className="space-y-6">
            <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-6 text-white text-center tracking-[1em] outline-none focus:border-brand-gold text-4xl font-mono" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 bg-black animate-fade-in">
      {/* Admin Header - Correct matching style */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-24 gap-12">
          <div>
            <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none mb-4">指揮中心</h1>
            <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${syncSuccess ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">CLOUD: {syncSuccess ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/add')} className="px-10 py-5 bg-brand-gold text-black text-[11px] font-black uppercase tracking-widest shadow-xl">新增作品</button>
            <button onClick={() => uploadSongsToCloud()} className="px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-widest shadow-xl">備份雲端</button>
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
          <div className="space-y-16">
              <input type="text" placeholder="搜尋標題、ISRC 或 UPC..." className="w-full bg-slate-900/30 border border-white/5 p-6 text-white text-xs font-bold tracking-widest outline-none focus:border-white/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              
              {groupedByAlbum.map(([upc, items]) => (
                  <div key={upc} className="border-b border-white/5 pb-16">
                      <div className="flex items-center gap-4 mb-10">
                          <h3 className="text-white font-black uppercase tracking-widest text-xl">{upc}</h3>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">({items.length} TRACKS)</span>
                      </div>
                      <div className="space-y-4">
                          {items.map(song => (
                              <div key={song.id} className="flex items-center justify-between py-5 border-b border-white/[0.03] group hover:bg-white/[0.02] px-4 transition-all">
                                  <div className="flex items-center gap-8">
                                      <div className="w-12 h-12 bg-slate-900 border border-white/10 overflow-hidden rounded-sm relative">
                                          <img src={song.coverUrl || globalSettings.defaultCoverUrl} className="w-full h-full object-cover" alt="" />
                                          <button onClick={(e) => { e.stopPropagation(); playSong(song); }} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                          </button>
                                      </div>
                                      <div>
                                          <span className="text-white font-bold text-sm uppercase tracking-widest group-hover:text-brand-gold transition-colors">{song.title}</span>
                                          <p className="text-[10px] text-slate-600 font-mono mt-1">ISRC: {song.isrc || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-8">
                                      <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] text-white font-black uppercase tracking-widest border border-white/10 px-6 py-2 hover:bg-white hover:text-black">EDIT</button>
                                      <button onClick={() => { if(window.confirm('確定從雲端與本地刪除作品？')) deleteSong(song.id); }} className="text-[10px] text-rose-900 font-black uppercase tracking-widest hover:text-rose-500">DEL</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
