
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    nav_home: "HOME",
    nav_interactive: "STUDIO",
    nav_catalog: "CATALOG",
    nav_about: "ABOUT",
    nav_manager: "MANAGER",
    manifesto_title: "EXISTENCE MANIFESTO",
    manifesto_content: "I am not making a tool\nI am leaving a place\nNot for being remembered but for remembering",
    before_start_title: "BEFORE YOU START",
    before_start_content: "There is no redo No perfection Your timing fast or slow is the evidence of you being in this song",
    btn_understand: "I UNDERSTAND CHOOSE WORK",
    btn_start_studio: "ENTER STUDIO",
    btn_get_mp4: "🎬 GET MY MP4 VIDEO",
    db_search_placeholder: "SEARCH ALBUM / ISRC...",
    db_empty: "No works found",
    
    // Modal Translations
    modal_title: "INTERACTIVE ACCESS",
    modal_tab_interactive_sub: "Production Support Mode",
    modal_tab_cinema_sub: "Premium Cinema Mode",
    modal_tab_support_sub: "Creative Support Mode",
    modal_name: "Legal Name",
    modal_email: "Email Address",
    modal_close: "CLOSE",
    modal_payment_header: "PAYMENT INFO",
    payment_total: "TOTAL AMOUNT",
    modal_bank_info: "Bank Details",
    modal_bank_account: "Account No",
    modal_bank_copy: "COPY",
    modal_manual_btn: "I HAVE TRANSFERRED",
    modal_manual_note: "After transfer please send screenshot to our LINE official account",
    modal_contribution_title: "ORDER SUMMARY",
    payment_sessions: "Interactive Credits",
    payment_support_unit: "Unit Price",
    modal_interactive_desc: "Each credit unlocks one interactive production session for any track",
    modal_footer_thanks: "Thank you for supporting independent music"
  },
  zh: {
    nav_home: "首頁",
    nav_interactive: "互動實驗室",
    nav_catalog: "作品庫",
    nav_about: "關於",
    nav_manager: "管理員",
    manifesto_title: "存在宣言",
    manifesto_content: "我不是在做一個工具\n我是在留一個地方\n讓記憶裡的那個人有一個地方可以站著",
    before_start_title: "開始之前",
    before_start_content: "接下來的時間 沒有再來一次 沒有修到完美 有些地方對不準 那不是錯 那是你真的在這首歌裡的證據",
    btn_understand: "我理解 選擇曲目",
    btn_start_studio: "進入工作室",
    btn_get_mp4: "🎬 獲取專屬 MP4 影片檔案",
    db_search_placeholder: "搜尋作品 / 專輯 / ISRC...",
    db_empty: "目前尚無資料",

    // Modal Translations
    modal_title: "互動實驗室存取權",
    modal_tab_interactive_sub: "製作體驗模式",
    modal_tab_cinema_sub: "高畫質影院模式",
    modal_tab_support_sub: "音樂食糧贊助",
    modal_name: "真實姓名",
    modal_email: "電子郵件",
    modal_close: "關閉",
    modal_payment_header: "付款資訊",
    payment_total: "付款總額",
    modal_bank_info: "銀行資訊",
    modal_bank_account: "匯款帳號",
    modal_bank_copy: "複製",
    modal_manual_btn: "我已完成匯款",
    modal_manual_note: "完成後請將截圖傳送至官方 LINE 我們將為您核對並開啟權限",
    modal_contribution_title: "訂單摘要",
    payment_sessions: "互動點數",
    payment_support_unit: "單價",
    modal_interactive_desc: "每點點數可開啟一次任意單曲的互動製作流程",
    modal_footer_thanks: "感謝您對獨立音樂創作的支持"
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
