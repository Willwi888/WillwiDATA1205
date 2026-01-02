
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (song.isrc && song.isrc.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      const matchesProject = filterProject === 'All' || song.projectType === filterProject;
      return matchesSearch && matchesLang && matchesProject;
    });
  }, [songs, searchTerm, filterLang, filterProject]);

  const togglePreview = (url: string | undefined, id: string) => {
    if (!url) return alert("目前此曲暫無試聽音檔連結。");
    if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
    } else {
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(id);
        audioRef.current.onended = () => setPlayingId(null);
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      <div className="mb-20 text-center relative">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">DATABASE</h2>
           <p className="text-slate-600 text-[10px] font-bold tracking-[0.8em] uppercase relative z-10">{t('db_subtitle')}</p>
      </div>

      {/* 整合篩選列 */}
      <div className="flex flex-col md:flex-row gap-px mb-12 bg-white/5 p-px border border-white/10 shadow-2xl">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={t('db_search_placeholder')}
            className="w-full bg-black px-8 py-5 text-white outline-none text-sm font-black uppercase tracking-widest focus:bg-slate-900 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-700 uppercase tracking-widest pointer-events-none">
            {filteredSongs.length} RESULTS
          </div>
        </div>
        
        <div className="flex bg-black">
          {/* 專案類別篩選器 */}
          <select 
              className="bg-transparent text-slate-400 px-6 py-5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white border-l border-white/10 transition-colors" 
              value={filterProject} 
              onChange={(e) => setFilterProject(e.target.value)}
          >
              <option value="All">所有專案 (All Projects)</option>
              {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* 語言篩選器 */}
          <select 
              className="bg-transparent text-slate-400 px-6 py-5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white border-l border-white/10 transition-colors" 
              value={filterLang} 
              onChange={(e) => setFilterLang(e.target.value)}
          >
              <option value="All">語言篩選 (Lang)</option>
              {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-sm bg-black/20 backdrop-blur-sm">
          <table className="w-full text-left min-w-[1000px] border-collapse">
              <thead className="bg-black/80 border-b border-white/10">
                  <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="px-4 py-6 w-16 text-center">Preview</th>
                      <th className="px-4 py-6">作品名稱</th>
                      <th className="px-4 py-6">ISRC</th>
                      <th className="px-4 py-6">類別 / 專案</th>
                      <th className="px-4 py-6">語系</th>
                      <th className="px-4 py-6">日期</th>
                      <th className="px-4 py-6">發行公司</th>
                      <th className="px-4 py-6 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {filteredSongs.map(song => (
                      <tr key={song.id} className="group hover:bg-white/[0.02] transition-all">
                          <td className="px-4 py-6 text-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePreview(song.audioUrl, song.id); }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${playingId === song.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-slate-900 text-white border-white/10 hover:border-white'}`}
                              >
                                  {playingId === song.id ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                              </button>
                          </td>
                          <td className="px-4 py-6">
                              <div className="flex items-center gap-3">
                                  <img src={song.coverUrl} className="w-10 h-10 object-cover rounded shadow-md group-hover:scale-105 transition-transform" alt="" />
                                  <div className="max-w-[200px]">
                                      <div className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-brand-gold transition-colors truncate">{song.title}</div>
                                      {song.versionLabel && <div className="text-[8px] text-slate-600 font-bold uppercase mt-0.5">{song.versionLabel}</div>}
                                  </div>
                              </div>
                          </td>
                          <td className="px-4 py-6">
                              <span className="text-[10px] font-mono text-slate-500 group-hover:text-brand-gold transition-colors">{song.isrc || '--'}</span>
                          </td>
                          <td className="px-4 py-6">
                              <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{song.releaseCategory?.split(' ')[0] || '--'}</span>
                                  <span className="text-[8px] font-bold text-slate-600 uppercase">{song.projectType}</span>
                              </div>
                          </td>
                          <td className="px-4 py-6">
                              <span className="px-2 py-0.5 text-[8px] font-black uppercase text-slate-400 border border-slate-800 rounded-sm bg-black/40">
                                {song.language}
                              </span>
                          </td>
                          <td className="px-4 py-6 text-[9px] font-mono text-slate-500">{song.releaseDate}</td>
                          <td className="px-4 py-6">
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider truncate block max-w-[120px]">{song.releaseCompany || '--'}</span>
                          </td>
                          <td className="px-4 py-6 text-right">
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => navigate(`/song/${song.id}`)} className="px-3 py-1.5 border border-white/5 text-slate-600 hover:text-white hover:border-white text-[8px] font-black uppercase tracking-widest transition-all">Info</button>
                                  <button onClick={() => navigate('/interactive', { state: { targetSongId: song.id } })} className="px-3 py-1.5 bg-white text-black text-[8px] font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-lg">Start Lab</button>
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {filteredSongs.length === 0 && (
          <div className="py-60 text-center border border-white/10 rounded-sm bg-black/10">
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[1em]">{t('db_empty')}</p>
          </div>
      )}
    </div>
  );
};

export default Database;
