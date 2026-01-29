
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
    nav_exit_admin: "EXIT ADMIN",
    studio_process_content: "SELECT: Pick a track from the catalog\nSYNC: Follow the rhythm for sensory sync\nCREATE: Generate your handcrafted visual\nETERNAL: Save your time signature to the cloud",
    before_start_title: "開始前",
    before_start_content: "這裡沒有再來一次也沒有修到完美\n你現在做的就是最後的樣子\n對歌詞的時候慢一點沒關係\n你只是在找這一句應該落在哪裡",
    mastered_title: "完成後",
    mastered_content: "這是最好屬於你的版本因為它是真的",
    fee_title: "關於支持",
    fee_content: "不做免費的事，因為時間不是免費的。每一筆支持，都是為了讓這些音樂繼續存在。",
    download_title: "下載說明",
    download_content: "你可以下載你完成的影片。那是你陪這首歌走過的紀錄。",
    copyright_title: "歌曲與歌詞的權利",
    copyright_content: "仍屬原創者。這裡不是授權，也不是買賣。",
    last_note_title: "最後",
    last_note_content: "不打分數。每一個完成的版本，我都感謝。",
    btn_understand: "挑 選 作 品 開 始 共 創",
    btn_start_studio: "進 入 工 作 室",
    modal_title: "歌詞同步對位邀請",
    modal_close: "關閉"
  },
  zh: {
    nav_home: "首頁",
    nav_interactive: "互動創作",
    nav_catalog: "作品庫",
    nav_about: "關於我們",
    nav_streaming: "串流頻道",
    nav_admin: "後台管理",
    nav_exit_admin: "登出管理",
    studio_process_content: "選擇：於作品庫挑選欲對位之曲目\n對時：隨旋律節奏點擊進行感官同步\n生成：自動產出專屬手作對位影像\n永恆：將您的時間脈絡留存於雲端",
    before_start_title: "開始前",
    before_start_content: "這裡沒有再來一次也沒有修到完美\n你現在做的就是最後的樣子\n對歌詞的時候慢一點沒關係\n你只是在找這一句應該落在哪裡",
    mastered_title: "完成後",
    mastered_content: "這是最好屬於你的版本因為它是真的",
    fee_title: "關於支持",
    fee_content: "不做免費的事，因為時間不是免費的。每一筆支持，都是為了讓這些音樂繼續存在。",
    download_title: "下載說明",
    download_content: "你可以下載你完成的影片。那是你陪這首歌走過的紀錄。",
    copyright_title: "歌曲與歌詞的權利",
    copyright_content: "仍屬原創者。這裡不是授權，也不是買賣。",
    last_note_title: "最後",
    last_note_content: "不打分數。每一個完成的版本，我都感謝。",
    btn_understand: "挑 選 作 品 開 始 共 創",
    btn_start_studio: "進 入 工 作 室",
    modal_title: "歌詞同步對位邀請",
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
