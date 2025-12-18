import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupTracks, MBReleaseGroup, MBTrack } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const cleanGoogleRedirect = (url: string) => {
    try {
        if (url.includes('google.com/url')) {
            const urlObj = new URL(url);
            const q = urlObj.searchParams.get('q');
            if (q) return decodeURIComponent(q);
        }
        return url;
    } catch (e) { return url; }
};

const convertDriveLink = (url: string) => {
    try {
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'single' | 'album' | 'mb'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<SpotifyTrack[]>([]);
  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [selectedMBRelease, setSelectedMBRelease] = useState<(MBReleaseGroup & { coverUrl?: string }) | null>(null);
  const [mbTracks, setMbTracks] = useState<MBTrack[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: '',
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    coverUrl: '', 
    coverOverlayText: '',
    lyrics: '',
    description: '',
    credits: '',
    spotifyLink: '', 
    musicBrainzId: '',
    audioUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '8888' || passwordInput === 'eloveg2026') { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('form_title_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">請輸入存取密碼以新增作品。</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
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
      let finalValue = value;
      if (name === 'coverUrl') finalValue = cleanGoogleRedirect(value);
      if (name === 'audioUrl' && value.includes('drive.google.com')) finalValue = convertDriveLink(value);
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSearch = async () => {
    if (importMode === 'mb') {
        setIsSearching(true); setSearchError(''); setMbResults([]); setSelectedMBRelease(null); setMbTracks([]);
        const results = await getWillwiReleases();
        if (results.length === 0) setSearchError('No releases found.');
        setMbResults(results); setIsSearching(false); return;
    }
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchError(''); setTrackResults([]); setAlbumResults([]);
    try {
        const query = searchQuery.includes('Willwi') ? searchQuery : `${searchQuery} artist:Willwi`;
        if (importMode === 'single') {
            let results = await searchSpotifyTracks(query);
            if (results.length === 0) setSearchError('No results found.');
            setTrackResults(results);
        } else {
            let results = await searchSpotifyAlbums(query);
            if (results.length === 0) setSearchError('No albums found.');
            setAlbumResults(results);
        }
    } catch (err) { setSearchError('Spotify connection failed.'); } finally { setIsSearching(false); }
  };

  const selectTrackForForm = (track: SpotifyTrack) => {
    setFormData(prev => ({
        ...prev,
        title: track.name,
        releaseDate: track.album.release_date,
        coverUrl: track.album.images[0]?.url || '',
        isrc: track.external_ids.isrc || '',
        upc: track.album.external_ids?.upc || '',
        spotifyId: track.id,
        spotifyLink: track.external_urls.spotify,
        releaseCategory: ReleaseCategory.Single,
        releaseCompany: 'Willwi Music'
    }));
    setTrackResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Please enter a Title.");
    setIsSaving(true);
    const newSong: Song = {
      id: Date.now().toString(),
      title: formData.title!,
      versionLabel: formData.versionLabel || '',
      coverUrl: formData.coverUrl || '',
      coverOverlayText: formData.coverOverlayText || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseCompany: formData.releaseCompany || '',
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isrc: formData.isrc,
      upc: formData.upc,
      spotifyId: formData.spotifyId,
      youtubeUrl: formData.youtubeUrl,
      spotifyLink: formData.spotifyLink,
      audioUrl: formData.audioUrl,
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('form_title_add')}</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('single')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'single' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>Single</button>
              <button onClick={() => setImportMode('album')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'album' ? 'bg-brand-accent text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>Album</button>
              <button onClick={() => setImportMode('mb')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'mb' ? 'bg-brand-gold text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}>Sync MB</button>
          </div>
      </div>

      <div className="bg-slate-900 p-6 rounded border border-white/5 mb-8">
        <div className="flex gap-4">
            <input type="text" placeholder="Spotify Search..." className="flex-grow bg-black border border-white/10 rounded px-4 py-3 text-white focus:border-brand-accent outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} disabled={isSearching} className="px-8 py-3 bg-brand-accent text-slate-950 font-black uppercase text-[10px] tracking-widest rounded transition-all">{isSearching ? '...' : 'Search'}</button>
        </div>
        {trackResults.length > 0 && (
            <div className="mt-4 grid gap-2">
                {trackResults.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded border border-white/5 cursor-pointer" onClick={() => selectTrackForForm(t)}>
                        <img src={t.album.images[2]?.url} className="w-10 h-10 object-cover" alt="" />
                        <div className="flex-grow text-xs font-bold">{t.name} <span className="text-slate-500 font-normal">by {t.artists[0].name}</span></div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in">
            <section className="bg-slate-900/40 p-8 border border-white/5">
                <h3 className="text-[10px] font-black text-brand-accent mb-6 uppercase tracking-[0.4em]">{t('form_section_basic')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">{t('form_label_title')} *</label>
                        <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">Cover Overlay Text (e.g. HEART BREAK)</label>
                        <input name="coverOverlayText" value={formData.coverOverlayText} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-brand-gold text-sm font-black" placeholder="動態標題文字" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">{t('form_label_lang')}</label>
                        <select name="language" value={formData.language} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-white text-sm">
                            {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">Cover URL</label>
                        <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">Audio URL (Google Drive / MP3)</label>
                        <input name="audioUrl" value={formData.audioUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-mono">YouTube URL</label>
                        <input name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" />
                    </div>
                </div>
            </section>

            <section className="bg-slate-900/40 p-8 border border-white/5">
                <h3 className="text-[10px] font-black text-brand-accent mb-6 uppercase tracking-[0.4em]">{t('form_label_lyrics')}</h3>
                <textarea name="lyrics" rows={10} value={formData.lyrics} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 text-white text-sm font-mono leading-loose" />
            </section>

            <div className="flex justify-end gap-6 pt-6 border-t border-white/5">
                <button type="button" onClick={() => navigate('/database')} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('form_btn_cancel')}</button>
                <button type="submit" disabled={isSaving} className="px-12 py-4 bg-brand-accent text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">
                    {isSaving ? t('form_btn_saving') : t('form_btn_save')}
                </button>
            </div>
      </form>
    </div>
  );
};

export default AddSong;