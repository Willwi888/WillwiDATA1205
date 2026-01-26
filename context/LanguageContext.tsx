
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
    manifesto_content: "I am not making a tool.\nI am leaving a place.\n\nThis is not a music platform,\nnor is it a place to be compared, rated, or consumed.\n\nI make lyrics synchronization manual,\nnot because I can't automate it,\nbut because a song deserves to be accompanied to the end.\n\nNot to be remembered, but to remember.\nI am not waiting for anyone.\nI am just leaving a light on.\nSo the person in memory has a place to stand.",
    before_start_title: "BEFORE YOU BEGIN",
    before_start_content: "Before you start, I want to say one thing.\n\nIn the time that follows,\nthere are no do-overs, no perfection.\n\nYou might be a bit slow, or a bit fast,\nsome parts won't align, some will be off.\n\nThat's not a mistake.\nThat is the evidence that you were truly in this song.\n\nIf you are ready, let's begin.",
    interactive_hint: "You don't need to rush. This song isn't going anywhere.",
    interactive_action: "Follow it and drop the line when you feel it's 'right'. Every line of lyrics is placed by your own hands.",
    finished_title: "COMPLETION",
    finished_content: "This is not a perfect version. It is a version that belongs to you. It's good that you were willing to leave it here.",
    payment_philosophy: "I don't do things for free. Not because creation has a price, but because time has weight. If this site is to exist and be well-treated, it must be respected. You pay not for features, but for the time you're willing to leave for a song.",
    btn_understand: "I AM READY",
    btn_start_studio: "ENTER STUDIO",
    btn_get_mp4: "🎬 GET HANDCRAFTED VIDEO",
    db_search_placeholder: "SEARCH ALBUM / ISRC / UPC...",
    db_empty: "No records found",
    modal_title: "INTERACTIVE ACCESS",
    modal_close: "CLOSE"
  },
  zh: {
    nav_home: "首頁",
    nav_interactive: "錄製室",
    nav_catalog: "作品庫",
    nav_about: "關於",
    nav_manager: "管理員",
    manifesto_title: "存在宣言",
    manifesto_content: "我不是在做一個工具。\n我是在留一個地方。\n\n這裡不是音樂平台，\n也不是用來被比較、被評分、被消耗的地方。\n\n我讓歌詞必須手工對時，\n不是因為我做不到自動化，\n而是因為一首歌，值得被人坐下來陪完。\n\n不是為了被記得，而是為了記得。\n我不等誰回來。我只是留一盞燈。\n讓記憶裡的那個人，有一個地方可以站著。",
    before_start_title: "開始之前",
    before_start_content: "在你開始之前，我想先說一件事。\n\n接下來的時間，\n沒有再來一次，沒有修到完美。\n\n你會慢一點，快一點，\n有些地方對不準，有些地方會歪。\n\n那那是錯。\n那是你真的在這首歌裡的證據。\n\n如果你準備好了，我們就開始。",
    interactive_hint: "你不需要急。這首歌不會走。",
    interactive_action: "跟著它在你覺得「對了」的時候，放下那一行。每一行歌詞，都是你親手放上去的。",
    finished_title: "完成後",
    finished_content: "這不是一個完美的版本。這是一個屬於你的版本。你願意把它留下來真好。",
    payment_philosophy: "我不做免費的事。不是因為創作有價，而是因為時間有重量。如果這個網站要存在、要被好好對待，它必須被尊重。你付費的不是功能，而是你願意為一首歌留下的時間。",
    btn_understand: "我準備好了，開始對時",
    btn_start_studio: "進入工作室",
    btn_get_mp4: "🎬 獲取手作對時影片",
    db_search_placeholder: "搜尋作品 / 專輯 UPC / ISRC...",
    db_empty: "目前尚無資料",
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
