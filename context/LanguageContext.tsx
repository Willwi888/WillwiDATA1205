
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    nav_home: "HOME",
    nav_interactive: "STUDIO",
    nav_catalog: "CATALOG",
    nav_about: "ABOUT",
    nav_manager: "CONSOLE",
    db_search_placeholder: "SEARCH...",
    modal_title: "ACCESS CONTROL",
    modal_close: "CLOSE"
  },
  zh: {
    nav_home: "首頁",
    nav_interactive: "工作室",
    nav_catalog: "作品庫",
    nav_about: "關於",
    nav_manager: "中控台",
    db_search_placeholder: "搜尋...",
    modal_title: "存取權限",
    modal_close: "關閉"
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: string) => {
    const k = key.toLowerCase();
    return (TRANSLATIONS[lang] as any)[k] || (TRANSLATIONS['zh'] as any)[k] || key;
  };
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation error');
  return context;
};
