import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, getLanguageColor } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const Database: React.FC = () => {
  const { songs, deleteSong } = useData();
  const { t } = useTranslation();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); 

  // Selection State
  // Note: For listeners, this acts as a "Single Select" to pick a song for the studio.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (song.isrc?.toLowerCase().includes(searchTerm.toLowerCase()) || song.upc?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLang = filterLang === 'All' || song.language === filterLang;
      return matchesSearch && matchesLang;
    });
  }, [songs, searchTerm, filterLang]);

  // Handlers
  const toggleSelection = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      
      // "One at a time" Logic:
      // If clicking a new song, clear previous selection and select the new one.
      // If clicking the already selected song, deselect it.
      const next = new Set<string>();
      if (!selectedIds.has(id)) {
          next.add(id);
      }
      setSelectedIds(next);
  };

  const handleSelectAll = () => {
      // Admin Feature only: Select All for bulk delete
      if (!isAdmin) return; 

      if (selectedIds.size === filteredSongs.length && filteredSongs.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredSongs.map(s => s.id)));
      }
  };

  const handleBulkDelete = async () => {
      if (!isAdmin) return;
      if (!window.confirm(`【危險操作】\n確定要刪除選取的 ${selectedIds.size} 首作品嗎？\n此動作無法復原。`)) return;
      
      for (const id of selectedIds) {
          await deleteSong(id);
      }
      setSelectedIds(new Set());
  };

  const handleStartSession = () => {
      if (selectedIds.size !== 1) return;
      const songId = Array.from(selectedIds)[0];
      const selectedSong = songs.find(s => s.id === songId);
      
      if (!selectedSong) return;

      if (!selectedSong.isInteractiveActive) {
          alert("此作品的互動創作功能尚未開放 (Interactive Mode is Closed)。");
          return;
      }

      if (selectedSong.language === Language.Instrumental) {
          alert("此作品為純音樂 (Instrumental)，無法進行歌詞互動。");
          return;
      }

      if (!selectedSong.lyrics || selectedSong.lyrics.trim().length === 0) {
          alert("此作品尚未登錄歌詞，無法進行互動。");
          return;
      }
      
      // Navigate to Interactive Mode with the selected song ID in state
      navigate('/interactive', { state: { targetSongId: songId } });
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-32 relative">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{t('db_title')}</h2>
           <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px] tracking-widest">
                <span className="text-brand-gold">{t('catalog_subtitle')}</span>
                <span>/</span>
                <span>{t('catalog_stats')}: {songs.length}</span>
           </div>
        </div>
        
        <div className="flex bg-slate-900 border border-white/10 p-1">
            <button onClick={() => setViewMode('grid')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>{t('catalog_view_grid')}</button>
            <button onClick={() => setViewMode('table')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>{t('catalog_view_list')}</button>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-white/10 mb-6 flex flex-col md:flex-row">
        <input
          type="text"
          placeholder={t('db_search_placeholder')}
          className="flex-grow bg-transparent px-6 py-4 text-white outline-none placeholder-slate-700 text-sm font-bold uppercase tracking-widest"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="w-px bg-white/10 hidden md:block"></div>
        <select className="bg-transparent text-slate-500 px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white appearance-none" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
            <option value="All">{t('catalog_filter_all')}</option>
            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Select All Bar (Top) - Only Visible to Admin for Bulk Ops */}
      {isAdmin && (
        <div className="flex items-center gap-4 mb-6 px-2">
            <button onClick={handleSelectAll} className="flex items-center gap-2 group">
                <div className={`w-4 h-4 border border-slate-600 flex items-center justify-center ${selectedIds.size > 0 && selectedIds.size === filteredSongs.length ? 'bg-brand-gold border-brand-gold' : 'bg-transparent group-hover:border-white'}`}>
                    {selectedIds.size > 0 && selectedIds.size === filteredSongs.length && <div className="w-2 h-2 bg-black"></div>}
                    {selectedIds.size > 0 && selectedIds.size < filteredSongs.length && <div className="w-2 h-0.5 bg-brand-gold"></div>}
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Select All (Admin Only)</span>
            </button>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {filteredSongs.map(song => (
                <div key={song.id} onClick={() => navigate(`/song/${song.id}`)} className="group cursor-pointer relative">
                    {/* Grid Selection Overlay */}
                    <div 
                        className={`absolute top-2 left-2 z-20 p-2 cursor-pointer transition-all ${selectedIds.has(song.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => toggleSelection(song.id, e)}
                    >
                         <div className={`w-6 h-6 border flex items-center justify-center shadow-lg transition-all rounded-full ${selectedIds.has(song.id) ? 'bg-brand-gold border-brand-gold' : 'bg-black/60 border-white/50 hover:bg-black hover:border-white'}`}>
                             {selectedIds.has(song.id) && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                         </div>
                    </div>

                    <div className={`aspect-square bg-slate-900 border overflow-hidden mb-6 shadow-2xl transition-all duration-500 ${selectedIds.has(song.id) ? 'border-brand-gold ring-1 ring-brand-gold scale-[0.98]' : 'border-white/5 group-hover:border-white/20'}`}>
                        <img src={song.coverUrl} className={`w-full h-full object-cover transition-all duration-700 ${selectedIds.has(song.id) ? 'grayscale' : 'group-hover:scale-110'}`} alt="" />
                    </div>
                    <h4 className={`text-[12px] font-black uppercase tracking-widest truncate transition-colors ${selectedIds.has(song.id) ? 'text-brand-gold' : 'text-white'}`}>{song.title}</h4>
                    <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">{song.releaseDate}</p>
                </div>
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/5 bg-slate-900/20">
            <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-black">
                    <tr>
                        <th className="px-4 py-5 w-10">
                             {/* Header Checkbox controlled by external selectAll */}
                        </th>
                        <th className="px-4 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('catalog_col_asset')}</th>
                        <th className="px-4 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('catalog_col_metadata')}</th>
                        <th className="px-4 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">{t('catalog_col_release')}</th>
                        <th className="px-4 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('catalog_col_action')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                        <tr key={song.id} onClick={() => navigate(`/song/${song.id}`)} className={`transition-colors cursor-pointer group ${selectedIds.has(song.id) ? 'bg-brand-gold/5' : 'hover:bg-white/[0.02]'}`}>
                            <td className="px-4 py-6" onClick={(e) => toggleSelection(song.id, e)}>
                                <div className={`w-4 h-4 border flex items-center justify-center transition-all rounded-full ${selectedIds.has(song.id) ? 'bg-brand-gold border-brand-gold' : 'border-slate-600 group-hover:border-white'}`}>
                                    {selectedIds.has(song.id) && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </td>
                            <td className="px-4 py-6 whitespace-nowrap">
                                <div className="flex items-center gap-5">
                                    <img className={`h-12 w-12 object-cover border ${selectedIds.has(song.id) ? 'border-brand-gold' : 'border-white/10'}`} src={song.coverUrl} alt="" />
                                    <div>
                                        <div className={`text-sm font-black transition-colors ${selectedIds.has(song.id) ? 'text-brand-gold' : 'text-white group-hover:text-brand-gold'}`}>{song.title}</div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{song.language}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-6 whitespace-nowrap">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-mono text-slate-400">ISRC: {song.isrc || '--'}</div>
                                    <div className="text-[10px] font-mono text-slate-600">UPC: {song.upc || '--'}</div>
                                </div>
                            </td>
                            <td className="px-4 py-6 whitespace-nowrap text-[10px] text-slate-500 font-mono hidden sm:table-cell tracking-widest">{song.releaseDate}</td>
                            <td className="px-4 py-6 text-right"><span className="text-slate-800 group-hover:text-white transition-colors text-[9px] font-black">{t('catalog_btn_view')}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* ACTION BAR - Fixed Bottom */}
      <div className={`fixed bottom-0 left-0 w-full bg-slate-900 border-t border-brand-gold/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 z-40 ${selectedIds.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                  {selectedIds.size === 1 && (
                      <div className="flex items-center gap-4">
                           <div className="text-2xl font-black text-brand-gold">1</div>
                           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                               {t('catalog_bar_selected_single')}<br/>
                               <span className="text-white">{t('catalog_bar_ready')}</span>
                           </div>
                      </div>
                  )}
                  {selectedIds.size > 1 && (
                      <div className="flex items-center gap-4">
                           <div className="text-2xl font-black text-white">{selectedIds.size}</div>
                           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                               {t('catalog_bar_selected_multi')}<br/>
                               <span className="text-slate-700">{t('catalog_bar_admin_mode')}</span>
                           </div>
                      </div>
                  )}
              </div>
              <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedIds(new Set())} className="px-6 py-3 border border-white/10 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                      {t('catalog_bar_cancel')}
                  </button>
                  
                  {/* Listener Action: Start Creative Session (Only when 1 song selected) */}
                  {selectedIds.size === 1 && (
                      <button onClick={handleStartSession} className="px-8 py-3 bg-brand-gold text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg animate-pulse">
                          {t('catalog_bar_start')}
                      </button>
                  )}

                  {/* Admin Actions */}
                  {isAdmin && (
                      <>
                        <button onClick={handleBulkDelete} className="px-6 py-3 bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                            Delete Selected
                        </button>
                      </>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Database;