
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast error");
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { lang, setLang } = useTranslation();
  const location = useLocation();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/database', label: 'Catalog' },
    { path: '/interactive', label: 'Studio' },
    { path: '/admin', label: 'Console' }
  ];

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-black text-slate-400 font-sans font-thin selection:bg-brand-accent selection:text-black">
        
        {toast && (
          <div className="fixed top-12 right-12 z-[2000] px-6 py-3 border border-brand-accent bg-black text-brand-accent text-[9px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(251,191,36,0.2)]">
            {toast.message}
          </div>
        )}

        {/* Sharp Sidebar-style Mini Nav (Optional) or Top Bar */}
        {location.pathname !== '/' && (
           <nav className="fixed top-0 left-0 w-full h-16 border-b border-white/10 flex items-center justify-between px-10 bg-black z-[100]">
                <div className="flex items-center gap-10">
                    <Link to="/" className="text-white text-lg tracking-widest uppercase hover:text-brand-accent transition-colors">Willwi</Link>
                    <div className="hidden md:flex gap-6">
                        {navLinks.map(link => (
                            <Link 
                              key={link.path} 
                              to={link.path} 
                              className={`text-[9px] uppercase tracking-[0.4em] transition-all ${location.pathname === link.path ? 'text-brand-accent underline underline-offset-8' : 'text-white/20 hover:text-white'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
                    className="text-[9px] uppercase tracking-widest text-white/20 hover:text-brand-accent"
                >
                    {lang.toUpperCase()}
                </button>
           </nav>
        )}

        <main>{children}</main>
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
