
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup, MBTrack, MBImportData } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

// ROBUST LINK CONVERTER
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

const DEFAULT_CREDITS = `Main Artist : Willwi 陳威兒
Composer : Tsung Yu Chen
Lyricist : Tsung Yu Chen
Arranger : Willwi
Producer : Will Chen
Recording | Mixing | Mastering : Will Chen
Studio : Willwi Studio, Taipei
Label : Willwi Music`;

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify-search' | 'mb'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  
  const [selectedAlbumForBatch, setSelectedAlbumForBatch] = useState<SpotifyAlbum | null>(null);
  const [batchTracks, setBatchTracks] = useState<SpotifyTrack[]>([]);
  const [batchDropboxLink, setBatchDropboxLink] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [selectedMBGroup, setSelectedMBGroup] = useState<MBReleaseGroup | null>(null);
  const [mbImportData, setMbImportData] = useState<MBImportData | null>(null);
  const [mbCoverUrl, setMbCoverUrl] = useState<string>('');

  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music', 
    publisher: 'Willwi Music', 
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    isInteractiveActive: false,
    coverUrl: '', 
    lyrics: '',
    credits: DEFAULT_CREDITS, 
    audioUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
      if (passwordInput === correctPwd) { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const playPreview = (url: string | null | undefined, id: string) => {
      if (!url) return;
      if (playingPreviewId === id) {
          audioPreviewRef.current?.pause();
          setPlayingPreviewId(null);
          return;
      }
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      setPlayingPreviewId(id);
      audio.play().catch(() => setPlayingPreviewId(null));
      audio.onended = () => setPlayingPreviewId(null);
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('form_title_add')}</h2>
                   <form onSubmit={handleAdminLogin} className="space-y-4 mt-6">
                       <input type="password" placeholder="Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setMbResults([]); setSelectedMBGroup(null);
    setSearchError('');
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
        if (importMode === 'spotify-search') {
            const query = searchQuery.includes('Willwi') ? searchQuery : `${searchQuery} artist:Willwi`;
            const tracks = await searchSpotifyTracks(query);
            const albums = await searchSpotifyAlbums(query);
            setTrackResults(tracks);
            setAlbumResults(albums);
            if(tracks.length === 0 && albums.length === 0) setSearchError('No results found.');
        } else if (importMode === 'mb') {
            const results = await getWillwiReleases();
            setMbResults(results);
        }
    } catch (err) { setSearchError('Search failed.'); } 
    finally { setIsSearching(false); }
  };

  const selectTrackForForm = async (track: SpotifyTrack) => {
    setFormData(prev => ({
        ...prev,
        title: track.name,
        releaseDate: track.album.release_date,
        coverUrl: track.album.images[0]?.url || '',
        spotifyId: track.id,
        audioUrl: track.preview_url || '',
    }));
    setSearchError('✓ Data Loaded');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Title required.");
    setIsSaving(true);
    const newSong: Song = {
      id: Date.now().toString(),
      title: formData.title!,
      versionLabel: formData.versionLabel || '',
      coverUrl: formData.coverUrl || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      audioUrl: convertToDirectStream(formData.audioUrl || ''),
      lyrics: formData.lyrics,
      credits: formData.credits,
    };
    if (await addSong(newSong)) navigate('/database');
    else setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <style>{`
        @keyframes playing-wave {
          0% { height: 4px; }
          50% { height: 16px; }
          100% { height: 4px; }
        }
        .playing-bar {
          width: 3px;
          background-color: #fbbf24;
          animation: playing-wave 0.8s ease-in-out infinite;
        }
        .playing-bar:nth-child(2) { animation-delay: 0.2s; }
        .playing-bar:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('form_title_add')}</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('spotify-search')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'spotify-search' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_spotify')}</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'manual' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}>{t('import_mode_manual')}</button>
          </div>
      </div>

      <div className="bg-slate-900 p-6 rounded border border-white/5 mb-8">
        <div className="flex gap-4">
            {importMode !== 'manual' && (
                <input className="flex-1 bg-black border border-white/10 px-4 py-3 text-white text-xs outline-none focus:border-white/30 font-mono" placeholder="Search Title or Artist..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            )}
            {importMode !== 'manual' && (
                <button onClick={handleSearch} disabled={isSearching} className="px-6 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                    {isSearching ? '...' : t('btn_search')}
                </button>
            )}
        </div>
        
        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {trackResults.map(t => (
                <div key={t.id} className="flex items-center gap-4 p-3 hover:bg-white/5 border border-white/5 rounded transition-all group">
                    <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={() => selectTrackForForm(t)}>
                        <img src={t.album.images[2]?.url} className="w-full h-full object-cover rounded shadow" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="text-white text-sm font-black truncate">{t.name}</div>
                            {playingPreviewId === t.id && (
                                <div className="flex gap-0.5 items-end h-4">
                                    <div className="playing-bar"></div><div className="playing-bar"></div><div className="playing-bar"></div>
                                </div>
                            )}
                        </div>
                        <div className="text-slate-500 text-[10px] uppercase tracking-wider truncate">{t.album.name}</div>
                    </div>

                    <div className="flex items-center gap-2">
                        {t.preview_url && (
                            <button 
                                onClick={() => playPreview(t.preview_url, t.id)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${playingPreviewId === t.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-slate-800 text-white border-white/10 hover:bg-slate-700'}`}
                            >
                                {playingPreviewId === t.id ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                        )}
                        <button onClick={() => selectTrackForForm(t)} className="px-4 py-2 bg-brand-accent text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all rounded-sm">Import</button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Title</label><input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required /></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Date</label><input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} /></div>
        </div>

        {/* CRITICAL: Interactive Toggle UI Update */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded flex items-center justify-between">
            <div className="flex-1">
                <h4 className="text-white text-xs font-black uppercase tracking-widest">Interactive Availability (啟動創作)</h4>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">ON = Appear in Interactive Lab</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">Audio Source</label><input name="audioUrl" className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs font-mono outline-none" value={formData.audioUrl} onChange={handleChange} placeholder="Paste Dropbox direct link here..." /></div>
        <div className="pt-6 border-t border-white/10 flex justify-end gap-4"><button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? '...' : t('form_btn_save')}</button></div>
      </form>
    </div>
  );
};

export default AddSong;
