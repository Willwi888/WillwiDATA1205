
import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { Song, ProjectType, Language, ReleaseCategory } from '../types';
import { useToast } from '../components/Layout';

const AdminDashboard: React.FC = () => {
  const { 
    songs, 
    updateSong, 
    deleteSong, 
    refreshData,
    globalSettings,
    setGlobalSettings,
    uploadSettingsToCloud,
    isSyncing,
    stats
  } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'stats' | 'settings' | 'backup'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && s.isrc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.upc && s.upc.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [songs, searchTerm]);

  // 按 UPC 分組作品
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    filteredSongs.forEach(s => {
      const key = s.upc ? normalizeIdentifier(s.upc) : `SINGLE_${s.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.values(groups).sort((a, b) => b[0].releaseDate.localeCompare(a[0].releaseDate));
  }, [filteredSongs]);

  const handleAdminPlay = (song: Song) => {
    if (!audioRef.current) return;
    if (adminPlayingId === song.id) {
      audioRef.current.pause();
      setAdminPlayingId(null);
    } else {
      const url = resolveDirectLink(song.audioUrl || '');
      if (!url) return showToast("INVALID AUDIO ASSET", "error");
      setAdminPlayingId(song.id);
      audioRef.current.src = url;
      audioRef.current.play().catch(() => showToast("PLAYBACK FAILED", "error"));
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-8">
        <div className="p-16 max-w-md w-full text-center space-y-12 bg-[#020617] border border-white/5 rounded-sm shadow-2xl animate-fade-in">
          <h2 className="text-4xl font-thin text-white uppercase tracking-[0.4em]">Console</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('密碼錯誤'); }} className="space-y-10">
            <input 
              type="password" 
              placeholder="ACCESS CODE" 
              className="w-full bg-black border-b border-white/10 px-4 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" 
              value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus 
            />
            {loginError && <p className="text-rose-500 text-[10px] font-thin uppercase tracking-widest">{loginError}</p>}
            <button className="w-full py-6 bg-brand-gold text-slate-950 font-thin uppercase tracking-[0.4em] text-xs hover:bg-white transition-all shadow-xl">Identify Manager</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-40 px-10 md:px-24 font-sans selection:bg-brand-gold selection:text-black animate-fade-in">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-12">
        <div>
          <h1 className="text-8xl md:text-10xl font-thin text-white uppercase tracking-tighter leading-none mb-6">Manager</h1>
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-[10px] text-white/40 font-thin uppercase tracking-[0.8em]">SYSTEM_HEALTH_OPTIMIZED</p>
          </div>
        </div>
        <div className="flex gap-6">
          <button onClick={() => navigate('/add')} className="h-12 px-10 bg-white text-black text-[10px] font-thin uppercase tracking-[0.2em] hover:bg-brand-gold transition-all">錄入單曲</button>
          <button onClick={logoutAdmin} className="h-12 px-8 border border-white/5 text-white/40 text-[10px] font-thin uppercase tracking-[0.2em] hover:text-white transition-all">安全退出</button>
        </div>
      </div>

      <div className="flex border-b border-white/5 mb-24 gap-12 overflow-x-auto no-scrollbar">
        {[
          { id: 'catalog', label: '智慧作品庫' },
          { id: 'stats', label: '資料洞察' },
          { id: 'settings', label: '環境設置' },
          { id: 'backup', label: '備份存檔' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`pb-8 text-[11px] font-thin uppercase tracking-[0.6em] transition-all relative ${activeTab === tab.id ? 'text-brand-gold' : 'text-slate-600 hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[0.5px] bg-brand-gold"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-16">
          <div className="max-w-xl">
             <input 
               type="text" 
               placeholder="SEARCH TITLES / UPC / ISRC..." 
               className="w-full bg-transparent border-b border-white/5 py-4 text-2xl font-thin text-white outline-none focus:border-brand-gold transition-all tracking-widest placeholder:text-white/5" 
               value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
             />
          </div>
          
          <div className="space-y-20">
              {groupedCatalog.map(group => {
                  const main = group[0];
                  const isAlbum = group.length > 1;
                  return (
                    <div key={main.upc || main.id} className="bg-white/[0.01] border border-white/5 rounded-sm p-10 space-y-10 group/item hover:border-white/10 transition-all">
                        <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
                            <img src={main.coverUrl} className="w-24 h-24 object-cover border border-white/5" />
                            <div className="flex-1">
                                <h3 className="text-2xl font-thin text-white uppercase tracking-wider mb-2">{isAlbum ? `Album: ${main.upc}` : main.title}</h3>
                                <div className="flex items-center gap-6">
                                    <span className="text-[10px] text-brand-gold font-mono">{main.upc || 'SINGLE'}</span>
                                    <span className="text-[10px] text-slate-700 uppercase tracking-widest">{group.length} Tracks</span>
                                    <span className="text-[10px] text-slate-700 uppercase tracking-widest">{main.releaseDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-[0.5px] bg-white/5 border border-white/5">
                            {group.map(song => (
                                <div key={song.id} className="bg-black py-6 px-8 flex items-center justify-between group/song hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center gap-8">
                                        <button onClick={() => handleAdminPlay(song)} className={`w-10 h-10 border border-white/10 rounded-full flex items-center justify-center text-white/30 hover:text-white ${adminPlayingId === song.id ? 'bg-brand-gold text-black border-brand-gold' : ''}`}>
                                            {adminPlayingId === song.id ? '||' : '>'}
                                        </button>
                                        <div>
                                            <span className="text-[12px] font-thin text-white uppercase tracking-widest">{song.title}</span>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-[9px] font-mono text-slate-600 uppercase">ISRC: {song.isrc}</span>
                                                {!song.lyrics && <span className="text-[8px] text-rose-500/60 font-black uppercase">LYRICS_MISSING</span>}
                                                {!song.audioUrl && <span className="text-[8px] text-rose-500/60 font-black uppercase">AUDIO_MISSING</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`text-[10px] font-thin uppercase tracking-widest ${song.isInteractiveActive ? 'text-emerald-500' : 'text-slate-700'}`}>
                                            {song.isInteractiveActive ? 'ACTIVE' : 'LOCKED'}
                                        </button>
                                        <div className="flex gap-6">
                                            <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-[10px] font-thin text-slate-600 hover:text-white uppercase tracking-widest">Edit</button>
                                            <button onClick={() => { if (window.confirm(`Delete ${song.title}?`)) deleteSong(song.id); }} className="text-[10px] font-thin text-rose-900/40 hover:text-rose-500 uppercase tracking-widest">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  );
              })}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 animate-fade-in-up">
            <div className="bg-white/[0.01] border border-white/5 p-12 space-y-10">
                <h4 className="text-[10px] text-slate-500 font-thin uppercase tracking-[0.8em]">Completion Rate</h4>
                <div className="relative h-48 flex items-center justify-center">
                    <svg className="w-40 h-40 -rotate-90">
                        <circle cx="80" cy="80" r="70" className="stroke-white/5 fill-none" strokeWidth="2" />
                        <circle cx="80" cy="80" r="70" className="stroke-brand-gold fill-none transition-all duration-2000" strokeWidth="2" strokeDasharray="440" strokeDashoffset={440 - (440 * stats.completionRate / 100)} />
                    </svg>
                    <span className="absolute text-5xl font-thin text-white">{stats.completionRate}%</span>
                </div>
                <p className="text-[9px] text-slate-700 uppercase tracking-widest text-center leading-loose">Percentage of songs with both lyrics and valid audio assets.</p>
            </div>
            {/* Additional report items can go here */}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-24 animate-fade-in-up">
             <div className="bg-[#020617] border border-white/5 p-12 space-y-12">
                <h4 className="text-white font-thin text-2xl uppercase tracking-[0.4em]">環境資產控制</h4>
                <div className="grid grid-cols-2 gap-8">
                    {[
                      { id: 'qr_production', label: 'Production Access QR' },
                      { id: 'qr_cinema', label: 'Cinema Master QR' },
                      { id: 'qr_support', label: 'Thermal Support QR' },
                      { id: 'accessCode', label: 'Global Access Code' }
                    ].map(item => (
                        <div key={item.id} className="space-y-4">
                            <label className="text-[10px] text-slate-600 font-thin uppercase tracking-widest">{item.label}</label>
                            {item.id === 'accessCode' ? (
                                <input 
                                    className="w-full bg-black border border-white/10 p-4 text-brand-gold font-mono text-2xl text-center outline-none focus:border-brand-gold" 
                                    value={globalSettings.accessCode} onChange={e => setGlobalSettings({...globalSettings, accessCode: e.target.value})} 
                                />
                            ) : (
                                <input 
                                    className="w-full bg-black border border-white/10 p-4 text-xs text-slate-500 outline-none focus:border-brand-gold" 
                                    value={(globalSettings as any)[item.id]} onChange={e => setGlobalSettings({...globalSettings, [item.id]: e.target.value})} 
                                    placeholder="Base64 or URL"
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={() => uploadSettingsToCloud(globalSettings)} className="px-16 py-6 bg-brand-gold text-black text-[10px] font-thin uppercase tracking-[0.6em] hover:bg-white transition-all shadow-2xl">同步至雲端</button>
             </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="max-w-xl space-y-12 animate-fade-in-up">
            <p className="text-slate-500 text-sm leading-relaxed uppercase tracking-widest font-thin">
               Download the master manifest of Willwi 1205 Database. This file contains all validated metadata, lyrics, and storylines.
            </p>
            <button 
                onClick={() => {
                    const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `WILLWI_MANIFEST_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                }}
                className="w-full py-8 border border-white/10 text-white font-thin uppercase tracking-[1em] hover:bg-white hover:text-black transition-all"
            >
                Generate Archive
            </button>
        </div>
      )}
    </div>
  );
}; export default AdminDashboard;
