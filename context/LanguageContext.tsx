
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    nav_home: "HOME",
    nav_interactive: "STUDIO",
    nav_catalog: "CATALOG",
    nav_about: "ABOUT",
    nav_streaming: "STREAMING",
    nav_admin: "CONSOLE",
    nav_manager: "MANAGER",
    nav_exit_admin: "EXIT ADMIN",
    manifesto_title: "EXISTENCE MANIFESTO",
    manifesto_content: "Not to be remembered, but to remember.\nStanding there once was not for a reunion,\nbut to give the reunion a form to happen.\nI don't wait for anyone; I just want to leave a light,\nso the youth in memory has somewhere to go.",
    before_start_title: "DECLARATION",
    before_start_content: "No previews here. If you haven't heard this song, please go to Spotify or Apple Music to meet it fully. When you're ready to walk with it for a while, then we begin.",
    btn_understand: "I AM READY",
    btn_start_studio: "進入工作室",
    btn_get_mp4: "🎬 GET MY HANDCRAFTED VIDEO",
    db_search_placeholder: "SEARCH ALBUM / ISRC...",
    db_empty: "No works found",
    footer_rights: "WILLWI MUSIC. ALL RIGHTS RESERVED.",
    
    // Modal Translations
    modal_title: "INTERACTIVE ACCESS",
    modal_close: "CLOSE"
  },
  zh: {
    nav_home: "首頁",
    nav_interactive: "互動創作",
    nav_catalog: "作品庫",
    nav_about: "關於",
    nav_streaming: "串流頻道",
    nav_admin: "後台管理",
    nav_manager: "管理員",
    nav_exit_admin: "登出後台",
    manifesto_title: "存在宣言",
    manifesto_content: "不是為了被記得 而是為了記得\n曾經站在那裡不是為了重逢\n而是為了讓重逢有一個格式可以發生\n我不等誰回來 我只想留一盞燈\n讓記憶中的少年有地方可去",
    before_start_title: "開始之前",
    before_start_content: "這裡不提供試聽。若你尚未聽過這首歌，請先前往 Spotify 或 Apple Music 完整的遇見它。當你準備好要陪它走一段時，我們再開始。",
    btn_understand: "我準備好了，開始對時",
    btn_start_studio: "進 入 工 作 室",
    btn_get_mp4: "🎬 獲取手作對時影片",
    db_search_placeholder: "搜尋作品 / 專輯 / ISRC...",
    db_empty: "目前尚無資料",
    footer_rights: "WILLWI MUSIC. 版權所有",

    // Modal Translations
    modal_title: "互動實驗室存取權",
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
