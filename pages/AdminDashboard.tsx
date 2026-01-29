
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, ProjectType } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud,
    uploadSongsToCloud, syncSuccess, refreshData
  } = useData();
  const { isAdmin, logoutAdmin, enableAdmin, getAllUsers, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'curation'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);

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

  // 以專輯聚合邏輯
  const groupedAlbums = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    const filtered = songs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.isrc && s.isrc.includes(searchTerm)) ||
        (s.upc && s.upc.includes(searchTerm))
    );

    filtered.forEach(song => {
      const normalizedUPC = song.upc ? normalizeIdentifier(song.upc) : '';
      const groupKey = normalizedUPC ? `ALBUM_${normalizedUPC}` : `SINGLE_${song.id}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(song);
    });

    return Object.entries(groups).sort((a, b) => 
        new Date(b[1][0].releaseDate).getTime() - new Date(a[1][0].releaseDate).getTime()
    );
  }, [songs, searchTerm]);

  const handleUpdateSetting = (key: string, value: string) => {
      const newSettings = { ...globalSettings, [key]: value };
      setGlobalSettings(newSettings);
      uploadSettingsToCloud(newSettings);
      showToast("設定已同步", "success");
  };

  const toggleAlbum = (id: string) => {
      setExpandedAlbumId(expandedAlbumId === id ? null : id);
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
            <button onClick={() => { refreshData(); showToast("已從雲端刷新數據"); }} className="px-10 py-5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">刷新雲端</button>
            <button onClick={logoutAdmin} className="px-10 py-5 border border-white/10 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">登出系統</button>
          </div>
      </div>

      <div className="flex gap-16 border-b border-white/5 mb-16">
          {(['catalog', 'insights', 'curation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[12px] font-black uppercase tracking-[0.5em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-600 hover:text-white'}`}>
                  {tab === 'catalog' ? '作品管理' : tab === 'insights' ? '數據洞察' : '策展工具'}
              </button>
          ))}
      </div>

      {activeTab === 'catalog' && (
          <div className="space-y-12">
              <div className="flex flex-col md:flex-row gap-6">
                <input type="text" placeholder="搜尋 ISRC / UPC / 作品標題..." className="flex-1 bg-slate-900/30 border border-white/5 p-6 text-white text-xs font-bold tracking-widest outline-none focus:border-white/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="flex items-center gap-4 bg-white/5 px-8 rounded-sm text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    共有 {groupedAlbums.length} 個發行項目
                </div>
              </div>

              <div className="space-y-4">
                  {groupedAlbums.map(([groupKey, albumSongs]) => {
                      const main = albumSongs[0];
                      const isExpanded = expandedAlbumId === groupKey;
                      const isAlbum = albumSongs.length > 1;

                      return (
                          <div key={groupKey} className="bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden transition-all">
                              {/* 專輯標題行 */}
                              <div 
                                  onClick={() => toggleAlbum(groupKey)}
                                  className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.03]'}`}
                              >
                                  <div className="flex items-center gap-8">
                                      <div className="relative group">
                                          <img src={main.coverUrl} className="w-16 h-16 object-cover border border-white/10 shadow-lg" alt="" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                              <span className="text-[8px] text-white font-black">{isExpanded ? 'CLOSE' : 'OPEN'}</span>
                                          </div>
                                      </div>
                                      <div>
                                          <span className="text-white font-bold text-base uppercase tracking-widest">{main.title}</span>
                                          <div className="flex gap-4 mt-2">
                                              <span className="text-[9px] text-brand-gold font-mono uppercase tracking-tighter">UPC: {main.upc || 'SINGLE'}</span>
                                              <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{main.releaseDate}</span>
                                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{albumSongs.length} 曲目</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                      <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                                          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 9l-7 7-7-7" /></svg>
                                      </div>
                                  </div>
                              </div>

                              {/* 曲目清單詳情 */}
                              {isExpanded && (
                                  <div className="p-8 bg-black/40 animate-blur-in">
                                      <div className="mb-6 grid grid-cols-12 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 pb-4 px-4">
                                          <div className="col-span-1">#</div>
                                          <div className="col-span-4">曲目標題 (Track Title)</div>
                                          <div className="col-span-2">ISRC</div>
                                          <div className="col-span-3 text-center">資產與對時 (Assets)</div>
                                          <div className="col-span-2 text-right">操作 (Admin)</div>
                                      </div>
                                      <div className="space-y-1">
                                          {albumSongs.sort((a,b)=> (a.isrc||'').localeCompare(b.isrc||'')).map((track, idx) => (
                                              <div key={track.id} className="grid grid-cols-12 items-center p-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-all rounded-sm group">
                                                  <div className="col-span-1 text-slate-700 font-mono text-[10px]">{idx + 1}</div>
                                                  <div className="col-span-4">
                                                      <span className="text-white text-[13px] font-medium uppercase tracking-widest block">{track.title}</span>
                                                      <span className="text-[8px] text-slate-600 uppercase mt-1 block">{track.releaseCompany || 'Willwi Music'} • {track.language}</span>
                                                  </div>
                                                  <div className="col-span-2 text-brand-gold font-mono text-[10px]">{track.isrc}</div>
                                                  <div className="col-span-3 flex justify-center gap-3">
                                                      <AssetBadge label="Audio" active={!!track.audioUrl} />
                                                      <AssetBadge label="Lyrics" active={!!track.lyrics} />
                                                      <AssetBadge label="Credits" active={!!track.credits} />
                                                      <AssetBadge label="Studio" active={!!track.isInteractiveActive} color="brand-accent" />
                                                  </div>
                                                  <div className="col-span-2 flex justify-end gap-6">
                                                      <button onClick={() => navigate(`/add?edit=${track.id}`)} className="text-[10px] text-white/40 font-black uppercase tracking-widest hover:text-white transition-colors">編輯詳情</button>
                                                      <button onClick={() => { if(window.confirm(`確定刪除曲目「${track.title}」？`)) deleteSong(track.id); }} className="text-[10px] text-rose-900 font-black uppercase tracking-widest hover:text-rose-500 transition-colors">刪除</button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
              {[
                { label: '總聽眾數', value: stats.totalUsers, color: 'text-brand-accent' },
                { label: '累積贊助額', value: `NT$ ${stats.totalIncome.toLocaleString()}`, color: 'text-emerald-400' },
                { label: '開放對時作品', value: stats.activeInteractive, color: 'text-brand-gold' },
                { label: '缺漏資產作品', value: stats.missingData, color: 'text-rose-400' }
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

// 小組件：資產狀態標籤
const AssetBadge: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color = 'emerald-500' }) => (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-sm transition-all ${active ? `border-${color}/40 text-${color}` : 'border-white/5 text-slate-800'}`}>
        <div className={`w-1 h-1 rounded-full ${active ? `bg-${color}` : 'bg-slate-900'}`}></div>
        <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
    </div>
);

export default AdminDashboard;
