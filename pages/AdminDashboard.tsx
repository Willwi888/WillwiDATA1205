import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, resolveDirectLink, normalizeIdentifier } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song, ProjectType, Language } from '../types';
import { useToast } from '../components/Layout';

const AdminDashboard: React.FC = () => {
  const { songs, updateSong, deleteSong, globalSettings, setGlobalSettings, uploadSettingsToCloud, stats } = useData();
  const { isAdmin, enableAdmin, logoutAdmin } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'stats' | 'settings' | 'backup'>('catalog');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [adminPlayingId, setAdminPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const groupedCatalog = useMemo(() => {
    const filtered = songs.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.isrc && s.isrc.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const groups: Record<string, Song[]> = {};
    filtered.forEach(s => {
      const key = s.upc ? normalizeIdentifier(s.upc) : `SINGLE_${s.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.values(groups).sort((a, b) => b[0].releaseDate.localeCompare(a[0].releaseDate));
  }, [songs, searchTerm]);

  const handleAdminPlay = (song: Song) => {
    if (!audioRef.current) return;
    if (adminPlayingId === song.id) {
      audioRef.current.pause();
      setAdminPlayingId(null);
    } else {
      const url = resolveDirectLink(song.audioUrl || '');
      if (!url) return showToast("INVALID AUDIO", "error");
      setAdminPlayingId(song.id);
      audioRef.current.src = url;
      audioRef.current.play().catch(() => showToast("FAILED", "error"));
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-10">
        <div className="w-full max-w-sm text-center space-y-12 animate-fade-in">
          <h2 className="text-xl font-thin uppercase tracking-[1em]">Console</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === '8520') enableAdmin(); else setLoginError('FAIL'); }} className="space-y-8">
            <input 
              type="password" 
              placeholder="CODE" 
              className="w-full bg-transparent border-b border-white/10 px-4 py-4 text-white text-center tracking-[1em] font-mono text-2xl outline-none focus:border-brand-gold" 
              value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus 
            />
            <button className="w-full py-4 border border-white/10 text-[10px] uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all">Identify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-40 px-10 md:px-20 animate-fade-in">
      <audio ref={audioRef} onEnded={() => setAdminPlayingId(null)} crossOrigin="anonymous" />
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-12">
        <h1 className="text-5xl md:text-7xl font-thin uppercase tracking-tighter leading-none">Management</h1>
        <div className="flex items-center gap-10">
          <button onClick={() => navigate('/add')} className="text-[9px] uppercase tracking-[0.4em] bg-white text-black px-8 py-3 hover:bg-brand-gold transition-all">New Entry</button>
          <button onClick={logoutAdmin} className="text-[9px] uppercase tracking-[0.4em] text-white/30 hover:text-white transition-all">Logout</button>
        </div>
      </div>

      {/* 嚴格橫式分頁欄 */}
      <div className="flex items-center gap-12 border-b border-white/5 mb-16 overflow-x-auto no-scrollbar">
        {[
          { id: 'catalog', label: 'Catalog' },
          { id: 'stats', label: 'Insights' },
          { id: 'settings', label: 'Settings' },
          { id: 'backup', label: 'Backup' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`pb-4 text-[10px] uppercase tracking-[0.6em] transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-brand-gold' : 'text-white/20 hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[0.5px] bg-brand-gold"></div>}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
          {activeTab === 'catalog' && (
            <div className="space-y-12">
              <input 
                type="text" 
                placeholder="SEARCH..." 
                className="w-full bg-transparent border-b border-white/5 py-4 text-lg font-thin text-white outline-none focus:border-brand-gold transition-all tracking-widest" 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
              />
              <div className="grid grid-cols-1 gap-6">
                  {groupedCatalog.map(group => (
                    <div key={group[0].id} className="border border-white/5 p-8 space-y-6 bg-white/[0.01]">
                        <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                            <img src={group[0].coverUrl} className="w-12 h-12 object-cover opacity-60" />
                            <div>
                                <h3 className="text-xl font-thin uppercase tracking-widest">{group.length > 1 ? `Album: ${group[0].upc}` : group[0].title}</h3>
                                <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{group[0].releaseDate}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {group.map(song => (
                                <div key={song.id} className="flex items-center justify-between text-[11px] uppercase tracking-widest py-2 hover:bg-white/5 px-4 transition-all">
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => handleAdminPlay(song)} className={`w-8 h-8 flex items-center justify-center border border-white/10 rounded-full ${adminPlayingId === song.id ? 'text-brand-gold border-brand-gold' : 'text-white/20 hover:text-white'}`}>
                                            {adminPlayingId === song.id ? '||' : '>'}
                                        </button>
                                        <span className="text-white/60">{song.title}</span>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className="text-[9px] font-mono text-white/10">{song.isrc}</span>
                                        <button onClick={() => navigate(`/add?edit=${song.id}`)} className="text-white/20 hover:text-white">Edit</button>
                                        <button onClick={() => { if(confirm('Delete?')) deleteSong(song.id); }} className="text-rose-900/40 hover:text-rose-500">Del</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="py-20 text-center space-y-8">
                <span className="text-[10px] uppercase tracking-[1em] text-white/20">Catalog Coverage</span>
                <div className="text-8xl font-thin text-brand-gold">{stats.completionRate}%</div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-16">
                <div className="space-y-6">
                    <h4 className="text-[10px] uppercase tracking-[0.6em] text-white/40">Access Passcode</h4>
                    <input className="w-full bg-transparent border-b border-white/10 py-3 text-brand-gold font-mono outline-none focus:border-brand-gold" value={globalSettings.accessCode} onChange={e => setGlobalSettings({...globalSettings, accessCode: e.target.value})} />
                    <button onClick={() => uploadSettingsToCloud(globalSettings)} className="text-[9px] uppercase tracking-[0.4em] border border-brand-gold/40 text-brand-gold px-10 py-3 hover:bg-brand-gold hover:text-black transition-all">Update Settings</button>
                </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="py-20 text-center">
                <button 
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `WILLWI_EXPORT.json`;
                        a.click();
                    }}
                    className="text-[10px] uppercase tracking-[0.6em] border border-white/10 px-12 py-4 hover:bg-white hover:text-black transition-all"
                >
                    Download Master JSON
                </button>
            </div>
          )}
      </div>
    </div>
  );
}; export default AdminDashboard;