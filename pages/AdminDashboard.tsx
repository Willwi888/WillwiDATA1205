
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Layout';
import { Song, ProjectType, Language } from '../types';

const AdminDashboard: React.FC = () => {
  const { 
    songs, deleteSong, updateSong, globalSettings, setGlobalSettings,
    uploadSettingsToCloud, uploadSongsToCloud, bulkAppendSongs, isSyncing, syncSuccess, lastError
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin, getAllTransactions } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'insights' | 'settings' | 'system'>('catalog');
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
      showToast("全站設定已同步");
  };

  const insights = useMemo(() => {
    const txs = getAllTransactions();
    const income = txs.reduce((acc, t) => acc + t.amount, 0);
    const complete = songs.filter(s => s.lyrics && s.audioUrl).length;
    const missing = songs.length - complete;
    
    return {
        totalSongs: songs.length,
        completeness: songs.length > 0 ? Math.round((complete / songs.length) * 100) : 0,
        missingData: missing,
        activeInteractive: songs.filter(s => s.isInteractiveActive).length,
        totalIncome: income,
        supporters: new Set(txs.map(t => t.userEmail)).size
    };
  }, [songs, getAllTransactions]);

  const groupedByUPC = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    songs.forEach(s => {
        const key = s.upc || 'NO_UPC';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return Object.entries(groups).filter(([key, list]) => 
        list.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [songs, searchTerm]);

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

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black px-10">
               <div className="bg-slate-900 border border-white/5 p-12 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-brand-gold font-black uppercase tracking-[0.4em] text-sm mb-10">Command Hub Access</h2>
                   <form onSubmit={(e) => { e.preventDefault(); passwordInput === '8520' ? enableAdmin() : setLoginError('Denied'); }}>
                       <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-5 text-white text-center tracking-[1em] mb-10 outline-none focus:border-brand-gold transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-rose-500 text-[10px] font-bold mb-6 uppercase tracking-widest">{loginError}</p>}
                       <button className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold transition-all">Unlock Dashboard</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-10 pt-32 pb-60 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
          <div>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter">指揮中心</h1>
            <div className="flex items-center gap-4 mt-4">
                <div className={`w-2 h-2 rounded-full ${syncSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                    {syncSuccess ? 'Cloud Sync Online' : 'Cloud Sync Offline'}
                </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => uploadSongsToCloud()} disabled={isSyncing} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all disabled:opacity-50">將資料庫推送到雲端</button>
            <button onClick={() => navigate('/add')} className="px-8 py-3 bg-brand-accent text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">建立新條目</button>
            <button onClick={logoutAdmin} className="px-8 py-3 border border-white/10 text-slate-500 text-[10px] font-black uppercase hover:text-white transition-all">閉幕會議</button>
          </div>
      </div>

      <div className="flex gap-12 border-b border-white/5 mb-12 overflow-x-auto no-scrollbar">
          {(['catalog', 'insights', 'settings', 'system'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all ${activeTab === tab ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}>
                  {tab === 'catalog' ? '目錄 (Catalog)' : tab === 'insights' ? '資料洞察 (Insights)' : tab.toUpperCase()}
              </button>
          ))}
      </div>

      {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">作品完成度</span>
                  <div className="text-4xl font-black text-white">{insights.completeness}%</div>
                  <div className="w-full bg-white/5 h-1 mt-4"><div className="bg-brand-gold h-full" style={{ width: `${insights.completeness}%` }}></div></div>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">資料缺失條目</span>
                  <div className="text-4xl font-black text-rose-500">{insights.missingData}</div>
                  <p className="text-[9px] text-slate-600 mt-2">缺少歌詞或音檔的作品</p>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">累積支持金額</span>
                  <div className="text-4xl font-black text-brand-accent">NT$ {insights.totalIncome.toLocaleString()}</div>
                  <p className="text-[9px] text-brand-accent mt-2">{insights.supporters} 位支持者</p>
              </div>
              <div className="bg-slate-900/40 p-10 border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase block mb-2">互動對位狀態</span>
                  <div className="text-4xl font-black text-emerald-500">{insights.activeInteractive}</div>
                  <p className="text-[9px] text-slate-600 mt-2">目前開放對位之作品數量</p>
              </div>
          </div>
      )}

      {activeTab === 'catalog' && (
          <div className="space-y-12">
              <input type="text" placeholder="在此搜尋目錄條目 (UPC / TITLE)..." className="w-full bg-slate-900 border border-white/5 p-6 text-white text-xs outline-none focus:border-brand-gold font-bold tracking-widest" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              
              <div className="space-y-10">
                  {groupedByUPC.map(([upc, songs]) => (
                      <div key={upc} className="bg-slate-900/20 border border-white/5 rounded-sm p-8 group hover:border-white/10 transition-all">
                          <div className="flex justify-between items-center mb-8">
                              <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center font-mono text-[10px] text-slate-500 font-black">UPC</div>
                                  <div>
                                      <h3 className="text-white font-black uppercase tracking-widest text-lg">{upc === 'NO_UPC' ? '未分類單曲' : upc}</h3>
                                      <span className="text-[10px] text-slate-500 font-mono">TRACKS: {songs.length}</span>
                                  </div>
                              </div>
                              <div className="px-4 py-2 bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-white/10">Project Identity</div>
                          </div>
                          
                          <div className="divide-y divide-white/5">
                              {songs.map(song => (
                                  <div key={song.id} className="py-6 flex items-center justify-between group/row">
                                      <div className="flex items-center gap-6 flex-1">
                                          <img src={song.coverUrl} className="w-10 h-10 object-cover rounded shadow-lg group-hover/row:scale-110 transition-transform" alt="" />
                                          <div>
                                              <span className="text-slate-300 font-black text-sm uppercase tracking-widest group-hover/row:text-white transition-colors">{song.title}</span>
                                              <div className="flex gap-4 mt-1">
                                                  <span className="text-[8px] font-mono text-slate-600">ISRC: {song.isrc || 'N/A'}</span>
                                                  {(!song.lyrics || !song.audioUrl) && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Missing Data</span>}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-10">
                                          <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 border transition-all ${song.isInteractiveActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'text-slate-700 border-white/5'}`}>
                                              {song.isInteractiveActive ? 'Active' : 'Locked'}
                                          </button>
                                          <div className="flex gap-6">
                                              <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[9px] text-brand-gold font-black uppercase hover:text-white">Configure</button>
                                              <button onClick={() => window.confirm('確定要永久刪除此條目？') && deleteSong(song.id)} className="text-[9px] text-rose-500 font-black uppercase hover:text-rose-400">Purge</button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-slate-900/60 p-12 border border-white/5 rounded-sm space-y-8">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs">Security & Passcode</h3>
                  <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Studio Global Passcode</label>
                      <input value={settingsForm.accessCode} onChange={e => setSettingsForm(p => ({...p, accessCode: e.target.value}))} className="w-full bg-black border border-white/10 p-6 text-white font-mono text-3xl text-center outline-none focus:border-brand-gold transition-all" />
                  </div>
                  <button onClick={handleSaveSettings} className="w-full py-5 bg-brand-gold text-black font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-white transition-all">Update Access</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
