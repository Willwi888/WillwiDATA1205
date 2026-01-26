
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Home: React.FC = () => {
  const { songs } = useData();
  const navigate = useNavigate();
  
  const recentAssets = songs.slice(0, 10);

  return (
    <div className="min-h-screen relative flex flex-col bg-black overflow-hidden font-sans font-light">
      
      {/* GLOBAL HUB HEADER */}
      <header className="fixed top-0 left-0 w-full h-20 border-b border-white/5 flex items-center justify-between px-10 lg:px-24 z-[100] bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-8">
              <span className="text-white text-lg tracking-[1.2em] uppercase font-bold">Willwi</span>
              <div className="hidden md:flex items-center gap-4 text-[9px] font-mono text-emerald-500 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  STATION_ACTIVE: 12.05_HUB
              </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="px-6 py-2 border border-brand-accent/30 text-brand-accent text-[9px] font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all"
          >
            Access Console
          </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col pt-40 px-10 lg:px-24 pb-40">
        
        {/* HERO DATA ROW */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-40">
            <div className="space-y-10 max-w-3xl">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-brand-accent/20 bg-brand-accent/5">
                    <span className="text-[10px] text-brand-accent font-black uppercase tracking-[0.5em]">Global Asset Authority</span>
                </div>
                <h1 className="text-7xl lg:text-[11rem] font-black text-white tracking-tighter uppercase leading-[0.8] mix-blend-difference">
                    Technical<br/>
                    <span className="text-brand-accent">Database</span><br/>
                    Interface
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-[0.3em] leading-loose max-w-lg">
                    High-fidelity repository for metadata curation, lyric synchronization, and global distribution tracking. Engineered for professional music asset management.
                </p>
            </div>

            <div className="w-full lg:max-w-md space-y-4">
                <div 
                  onClick={() => navigate('/database')}
                  className="group w-full p-10 border border-white/10 hover:border-brand-accent transition-all flex justify-between items-center bg-white/[0.01] cursor-pointer"
                >
                    <div className="text-left">
                        <span className="block text-[10px] text-white/20 uppercase tracking-[0.5em] mb-3">Index Catalog</span>
                        <span className="text-2xl text-white font-thin uppercase tracking-[0.3em] group-hover:text-brand-accent">Primary Registry</span>
                    </div>
                    <span className="text-3xl font-thin text-white/10 group-hover:text-brand-accent">→</span>
                </div>
                <div 
                  onClick={() => navigate('/interactive')}
                  className="group w-full p-10 border border-white/10 hover:border-brand-accent transition-all flex justify-between items-center bg-white/[0.01] cursor-pointer"
                >
                    <div className="text-left">
                        <span className="block text-[10px] text-white/20 uppercase tracking-[0.5em] mb-3">Operational Hub</span>
                        <span className="text-2xl text-white font-thin uppercase tracking-[0.3em] group-hover:text-brand-accent">Studio Console</span>
                    </div>
                    <span className="text-3xl font-thin text-white/10 group-hover:text-brand-accent">→</span>
                </div>
            </div>
        </div>

        {/* DATA FEED TABLE */}
        <div className="space-y-8">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <h3 className="text-[10px] text-white/40 uppercase tracking-[1.5em]">Live Registry Feed</h3>
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">TS: {new Date().toISOString()}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4">
                {recentAssets.map((asset, idx) => (
                    <div 
                        key={asset.id}
                        onClick={() => navigate(`/song/${asset.id}`)}
                        className="group flex items-center gap-8 py-6 px-8 border border-white/5 hover:border-white/20 hover:bg-white/[0.02] cursor-pointer transition-all"
                    >
                        <span className="text-[10px] font-mono text-white/10 group-hover:text-brand-accent transition-colors">{(idx+1).toString().padStart(2, '0')}</span>
                        <div className="w-12 h-12 bg-slate-900 border border-white/10 grayscale group-hover:grayscale-0 transition-all overflow-hidden">
                            <img src={asset.coverUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] text-white/40 uppercase tracking-widest group-hover:text-white truncate">{asset.title}</h4>
                            <div className="flex gap-6 mt-1.5">
                                <span className="text-[9px] text-slate-700 font-mono group-hover:text-slate-500 uppercase">ISRC: {asset.isrc || 'UNKNOWN'}</span>
                                <span className="text-[9px] text-brand-accent/20 group-hover:text-brand-accent/60 font-bold uppercase tracking-widest">{asset.language}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </main>

      <footer className="h-16 px-10 lg:px-24 flex justify-between items-center border-t border-white/5 bg-black z-[100]">
          <div className="flex items-center gap-10">
              <span className="text-[9px] text-white/10 tracking-[0.8em] uppercase font-bold">Security: MASTER_CURATOR</span>
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] text-white/10 tracking-[0.5em] uppercase font-bold">Node: SG_W1205</span>
          </div>
          <p className="text-[9px] text-white/5 tracking-[1em] uppercase">Willwi Global Authority © 2025</p>
      </footer>
    </div>
  );
};

export default Home;
