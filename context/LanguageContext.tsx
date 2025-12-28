
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_interactive: "Interactive Lab", 
    nav_catalog: "Catalog",
    nav_add: "Add",
    nav_about: "About",
    nav_admin: "Manager",
    nav_exit_admin: "Exit Admin",
    footer_rights: "Willwi Music. All rights reserved.",
    
    // Hero Generic
    hero_title: "WILLWI STUDIO",
    hero_verified: "OFFICIAL VERIFIED",
    hero_desc_long: "Support the Musician WILLWI • Lyric Video Creation Tool\nSelect a track, start creating your unique dynamic lyric video.",

    // Home Column 1: Dynamic Lyric Video
    home_col_resonance_title: "Dynamic Lyric Video",
    home_col_resonance_desc: "Handcrafted Lyric Creation",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ Create 1 Lyric Video",
    home_col_resonance_li2: "✦ Support the Artist",
    home_col_resonance_li3: "✦ Digital Certificate",
    home_btn_enter: "ENTER LAB",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "PREMIUM",
    home_col_cinema_title: "Cloud Cinema + Sign",
    home_col_cinema_desc: "High-Def with Digital Autograph",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K High Definition",
    home_col_cinema_li2: "✦ Artist Digital Signature",
    home_col_cinema_li3: "✦ Embedded in Video",
    home_btn_details: "PREMIUM",

    // Home Column 3: Pure Support
    home_col_support_title: "Music Sustenance",
    home_col_support_desc: "Pure Support",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ Buy Willwi a Meal",
    home_col_support_li2: "✦ Keep Creation Alive",
    home_col_support_li3: "✦ Direct Contribution",
    home_btn_support: "SUPPORT",

    // Database
    db_title: "Database",
    db_subtitle: "Willwi Official Catalog",
    db_search_placeholder: "SEARCH TRACK / ISRC...",
    db_filter_lang_all: "All Languages",
    db_spotify_unavailable: "Spotify Preview Unavailable",
    db_btn_enter_lab: "Enter Lab",
    db_btn_info: "Info",
    db_empty: "Empty Collection.",

    // Add Song
    form_title_add: "Add New Work",
    form_btn_save: "Save to Database",
    form_btn_cancel: "Cancel",
    form_btn_saving: "Saving...",
    form_label_title: "Song Title",
    form_label_version: "Version Label",
    form_label_lang: "Language",
    form_label_project: "Project Type",
    form_label_category: "Release Category",
    form_label_date: "Date",
    form_label_cover: "Cover Image URL",
    form_label_links: "Platform Links (Streaming & Sales)",
    form_label_audio: "Raw Audio Source (Private - For Generation)",
    form_label_metadata: "Metadata",
    form_label_lyrics: "Lyrics",
    form_label_credits: "Credits & Description",
    form_placeholder_audio: "Paste Dropbox Share Link (Use FILE LINK, not FOLDER)",
    
    import_mode_smart: "Smart Link (HyperFollow)",
    import_mode_spotify: "Spotify Search",
    import_mode_mb: "MusicBrainz",
    import_mode_manual: "Manual",
    btn_search: "Search",
    btn_processing: "Processing...",
    
    msg_save_error: "Error saving to database.",

    // Song Detail
    detail_back_link: "← Catalog",
    detail_edit_mode: "Edit Mode",
    detail_upload_image: "Upload Image",
    detail_admin_control: "Admin Control Tower",
    detail_interactive_status: "Interactive Status",
    detail_mb_indexing: "MusicBrainz Indexing",
    detail_mb_view: "View MB Entry",
    detail_mb_none: "Not Indexed",
    detail_mb_submit: "Submit to MB",
    detail_delete: "DELETE SONG",
    detail_btn_immersive: "Lyrics Mode",
    detail_btn_start_session: "Create Lyric Video (NT$ 320)",
    detail_admin_force: "Admin Force Start (Test)",
    detail_status_instrumental: "Instrumental (No Lyrics)",
    detail_status_closed: "Not Available",
    detail_section_context: "Story",
    detail_section_lyrics: "Lyrics",
    detail_section_credits: "Credits",
    detail_empty_desc: "No description.",
    detail_empty_lyrics: "No lyrics.",
    detail_empty_credits: "No credits.",
    detail_ai_generate: "Generate AI Review",

    // Interactive
    interactive_intro_method: "Disclaimer",
    interactive_disclaimer_1_title: "Not a Purchase",
    interactive_disclaimer_1_text: "The content provided on this platform does not involve the sale of songs, lyrics, or any digital goods, nor does it involve copyright licensing, transfer, or downloading.",
    interactive_disclaimer_2_title: "Support for Labor",
    interactive_disclaimer_2_text: "The related fees are used to support the time and labor invested by the creator, including the manual lyric synchronization and the guided creative participation process.",
    interactive_disclaimer_3_title: "Invitation",
    interactive_disclaimer_3_text: "If you only wish to listen to music, please visit major music streaming platforms. Here, it is not about purchasing songs, but inviting you to support creation.",
    interactive_btn_participate: "I Understand & Select Track",
    
    interactive_select_title: "Selection",
    interactive_select_subtitle: "Pick a song that resonates with you.",
    interactive_select_empty: "No tracks available.",
    interactive_select_start: "Start >",
    
    interactive_gate_ticket: "Access Ticket",
    interactive_gate_selected: "Selected Track",
    interactive_gate_fee: "Entry Fee",
    interactive_gate_pay_note: "Payment confirms your support for the artist's labor.",
    interactive_gate_pay_btn: "Support & Unlock",
    
    interactive_guide_title: "Studio Guide",
    interactive_guide_style: "Visual Style",
    interactive_guide_play: "How to Play",
    interactive_guide_pc: "PC",
    interactive_guide_mobile: "Mobile",
    interactive_guide_space: "SPACE Key",
    interactive_guide_tap: "TAP Screen",
    interactive_guide_desc: "This is a rhythm game. When you hear the singer sing the *first word of each line*:",
    interactive_btn_understand: "I Understand",
    
    interactive_panel_control: "Control Panel",
    interactive_panel_visual: "Visual Style",
    interactive_panel_format: "Canvas Format",
    interactive_panel_composition: "Composition",
    interactive_btn_practice: "PRACTICE MODE",
    interactive_btn_stop_preview: "STOP PREVIEW",
    interactive_btn_start_record: "START RECORDING",
    interactive_loading_audio: "LOADING AUDIO...",
    interactive_preview_mode: "Preview Mode • Setup your visual style",
    
    interactive_recording_hint_desktop: "PRESS SPACE TO SYNC",
    interactive_rendering_title: "Rendering Video",
    interactive_rendering_desc: "High Quality Export (5Mbps)\nPlease do not close this tab.",
    
    interactive_wrapped_title: "Production Wrapped",
    interactive_input_name: "YOUR NAME",
    interactive_btn_export: "CONFIRM & EXPORT",
    
    interactive_finished_title: "Creation Complete",
    interactive_finished_subtitle: "Thank You",
    interactive_finished_warning: "⚠️ Download your video now.",
    interactive_finished_desc: "Every beginning is trust;\nEvery ending is gratitude.\nThank you for giving this song new life.",
    interactive_btn_save_video: "Download Video (MP4)",
    interactive_btn_return: "Back to Menu",

    // About
    about_title: "About Willwi",
    about_subtitle: "Chen Wei-Er • Independent Musician",
    about_section_1_title: "Creative Positioning",
    about_section_1_content: "Willwi (Chen Wei-Er) is an independent musician whose work centers on songwriting and music production, with a long-term focus on narrative-driven sound and the integrity of completed works.\n\nHis professional activities include original music releases, music production, as well as commercial performances and project-based live appearances, primarily oriented around the work itself and tailored to brand events and commissioned projects.",
    about_section_2_title: "Public Engagement",
    about_section_2_content: "In the area of public engagement, he has been invited to speak at four universities, sharing experiences related to music creation, industry practice, and cross-disciplinary work in educational contexts.",
    about_section_3_title: "Exposure Strategy",
    about_section_3_content: "Willwi’s career path does not prioritize traditional television or mainstream media exposure. He regards television and variety show appearances as professional roles belonging to performing artists and therefore does not participate in that exposure-driven track. His public-facing work focuses instead on music creation, live performance projects, collaborations, and educational exchange.\n\nThis positioning reflects a deliberate professional choice and respect for industry roles, rather than limitations of visibility, access, or capability.",
    about_social_title: "Official Channels",

    // Admin
    admin_title: "Admin Console",
    admin_subtitle: "Willwi Music Central Control",
    admin_btn_new: "New Song",
    admin_btn_exit: "Exit",
    admin_stat_total: "Total Catalog",
    admin_stat_active: "Interactive Active",
    admin_stat_payment: "Payment Setup",
    admin_stat_data: "Data Center",
    
    admin_table_play: "Play",
    admin_table_info: "Work Info",
    admin_table_links: "Ext. Links",
    admin_table_date: "Release Date",
    admin_table_mode: "Interactive Mode",
    admin_table_action: "Manage",
    
    admin_login_title: "Manager Login",
    admin_login_btn: "Unlock Console",
    admin_login_error: "Invalid Code",
    
    admin_settings_system: "System Settings",
    admin_settings_security: "Security & Access Control",
    admin_sec_admin_pwd: "Admin Login Password",
    admin_sec_user_code: "User Access Code",
    admin_sec_admin_desc: "Used for accessing this console and adding songs.",
    admin_sec_user_desc: "Code for users to unlock interactive features after payment.",
    admin_btn_update: "Update",
    
    admin_data_export: "Export JSON",
    admin_data_export_desc: "Backup all songs, lyrics, and links into a single JSON file.",
    admin_data_import: "Import JSON",
    admin_data_import_desc: "Upload JSON to overwrite database.",
    admin_btn_download: "Download Backup",
    admin_btn_overwrite: "Select File & Overwrite",
    
    admin_payment_setup: "Payment QR Code Setup",
    admin_payment_user_code: "User Access Code",
    
    // Payment Modal
    modal_title: "Participant Identity",
    modal_close: "Close",
    modal_name: "Name",
    modal_email: "Email",
    modal_payment_header: "Payment Method",
    modal_tab_interactive_sub: "Create Dynamic Video",
    modal_tab_cinema_sub: "High-Def + Signature",
    modal_tab_support_sub: "Pure Support",
    payment_total: "Total",
    payment_sessions: "Quantity",
    payment_support_unit: "Unit Price",
    payment_service_fee: "Service Fee",
    payment_premium_tier: "PREMIUM TIER",
    modal_bank_info: "Bank Transfer Info",
    modal_bank_account: "Account",
    modal_bank_copy: "COPY",
    modal_manual_btn: "I Have Transferred (Next)",
    modal_manual_note: "* Please screenshot transfer and send to LINE for access code.",
    modal_already_have_code: "Already have a code? Click here",
    modal_verify_title: "Verify Access",
    modal_verify_desc: "Please send payment screenshot to LINE Official Account.\nWillwi will provide you with an Access Code.",
    modal_verify_placeholder: "Enter Code (e.g. 8888)",
    modal_verify_back: "Back",
    modal_verify_unlock: "Unlock",
    modal_interactive_desc: "Supports the artist and grants access to the creation tool.",
    modal_cinema_desc: "Includes 4K rendering and a digital signature embedded in the video.",
    modal_support_desc: "Direct support for the artist's living expenses.",
    modal_custom_amount_label: "Custom Amount",
    modal_custom_amount_hint: "Default 100",
    modal_footer_thanks: "Thank you for your support",
    modal_confirm_btn_invalid: "Fill Identity to Confirm",
  },
  zh: {
    // Navigation
    nav_home: "首頁",
    nav_interactive: "互動創作", 
    nav_catalog: "作品庫",
    nav_add: "登錄",
    nav_about: "關於",
    nav_admin: "後台管理",
    nav_exit_admin: "登出管理",
    footer_rights: "Willwi Music. 版權所有",
    
    // Hero Generic
    hero_title: "WILLWI STUDIO",
    hero_verified: "官方認證",
    hero_desc_long: "支持音樂人 WILLWI 歌詞影片創作工具\n選擇作品 開始製作專屬您的動態歌詞影片",

    // Home Column 1: Dynamic Lyric Video
    home_col_resonance_title: "動態歌詞影片",
    home_col_resonance_desc: "手工對時創作體驗",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 製作一首專屬動態影片",
    home_col_resonance_li2: "✦ 支持音樂人創作",
    home_col_resonance_li3: "✦ 獲得數位參與證書",
    home_btn_enter: "開始製作",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "典藏",
    home_col_cinema_title: "雲端影院 + 簽名",
    home_col_cinema_desc: "高畫質嵌入歌手專屬簽名",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K 高畫質重製",
    home_col_cinema_li2: "✦ 歌手親筆數位簽名",
    home_col_cinema_li3: "✦ 獨一無二的收藏",
    home_btn_details: "訂製",

    // Home Column 3: Pure Support
    home_col_support_title: "音樂食糧",
    home_col_support_desc: "純粹創作能量挹注",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ 贊助一份餐點",
    home_col_support_li2: "✦ 無負擔支持",
    home_col_support_li3: "✦ 創作者社群感謝",
    home_btn_support: "投食",

    // Database
    db_title: "Database",
    db_subtitle: "Willwi Official Catalog",
    db_search_placeholder: "搜尋作品或 ISRC...",
    db_filter_lang_all: "所有語言",
    db_spotify_unavailable: "Spotify 預覽不可用",
    db_btn_enter_lab: "進入實驗室",
    db_btn_info: "資訊",
    db_empty: "目前無作品。",

    // Add Song
    form_title_add: "登錄新作品",
    form_btn_save: "儲存作品",
    form_btn_cancel: "取消",
    form_btn_saving: "儲存中...",
    form_label_title: "作品名稱",
    form_label_version: "版本標註",
    form_label_lang: "語系",
    form_label_project: "專案類型",
    form_label_category: "發行類別",
    form_label_date: "發行日期",
    form_label_cover: "封面圖片 URL",
    form_label_links: "平台連結 (串流與販售)",
    form_label_audio: "原始音檔來源 (私有 - 僅供生成)",
    form_label_metadata: "元數據 (Metadata)",
    form_label_lyrics: "歌詞內容",
    form_label_credits: "製作名單與描述",
    form_placeholder_audio: "貼上 Dropbox 分享連結 (請用檔案連結，勿用資料夾)",
    
    import_mode_smart: "Smart Link (HyperFollow)",
    import_mode_spotify: "Spotify 搜尋",
    import_mode_mb: "MusicBrainz",
    import_mode_manual: "手動輸入",
    btn_search: "搜尋",
    btn_processing: "處理中...",
    
    msg_save_error: "儲存至資料庫時發生錯誤。",

    // Song Detail
    detail_back_link: "← 回作品庫",
    detail_edit_mode: "編輯模式",
    detail_upload_image: "上傳圖片",
    detail_admin_control: "管理員控制台",
    detail_interactive_status: "互動狀態",
    detail_mb_indexing: "MusicBrainz 索引",
    detail_mb_view: "查看 MB 條目",
    detail_mb_none: "未索引",
    detail_mb_submit: "提交至 MB",
    detail_delete: "刪除作品",
    detail_btn_immersive: "歌詞模式",
    detail_btn_start_session: "製作歌詞影片 (NT$ 320)",
    detail_admin_force: "管理員強制啟動 (測試)",
    detail_status_instrumental: "純音樂 (無歌詞)",
    detail_status_closed: "尚未開放",
    detail_section_context: "創作故事",
    detail_section_lyrics: "歌詞",
    detail_section_credits: "製作名單",
    detail_empty_desc: "暫無描述。",
    detail_empty_lyrics: "暫無歌詞。",
    detail_empty_credits: "暫無名單。",
    detail_ai_generate: "生成 AI 樂評",

    // Interactive
    interactive_intro_method: "免責聲明",
    interactive_disclaimer_1_title: "非商品販售",
    interactive_disclaimer_1_text: "本平台所提供之內容並非購買歌曲、歌詞或任何數位商品，亦不涉及著作權授權、轉讓或下載行為。",
    interactive_disclaimer_2_title: "支持創作勞動",
    interactive_disclaimer_2_text: "相關費用係用於支持創作者投入之人工時間，包含手工歌詞對位與創作引導之參與過程。",
    interactive_disclaimer_3_title: "邀請與參與",
    interactive_disclaimer_3_text: "如僅需聆聽音樂，請至各大音樂平台收聽。這裡不是購買歌曲，而是邀請您支持創作。",
    interactive_btn_participate: "我了解 • 選擇曲目",
    
    interactive_select_title: "曲目選擇",
    interactive_select_subtitle: "請選擇 1 首您最喜愛的歌曲，開始創作。",
    interactive_select_empty: "目前無可用曲目。",
    interactive_select_start: "開始 >",
    
    interactive_gate_ticket: "通行證",
    interactive_gate_selected: "已選曲目",
    interactive_gate_fee: "費用",
    interactive_gate_pay_note: "付款完成後，請輸入通行碼。",
    interactive_gate_pay_btn: "支持並解鎖",
    
    interactive_guide_title: "製作室指南",
    interactive_guide_style: "視覺風格 (Visual Style)",
    interactive_guide_play: "操作方式 (How to Play)",
    interactive_guide_pc: "PC 電腦",
    interactive_guide_mobile: "Mobile 手機",
    interactive_guide_space: "SPACE 空白鍵",
    interactive_guide_tap: "TAP 點擊螢幕",
    interactive_guide_desc: "這是一個節奏遊戲。當你聽到歌手唱出每一句的「第一個字」時：",
    interactive_btn_understand: "我了解了 (I Understand)",
    
    interactive_panel_control: "控制面板",
    interactive_panel_visual: "視覺風格",
    interactive_panel_format: "畫布比例",
    interactive_panel_composition: "版面構成",
    interactive_btn_practice: "試玩模式 (PRACTICE)",
    interactive_btn_stop_preview: "停止預覽",
    interactive_btn_start_record: "開始錄製 (START)",
    interactive_loading_audio: "載入音訊中...",
    interactive_preview_mode: "預覽模式 • 請設定您的視覺風格",
    
    interactive_recording_hint_desktop: "按空白鍵同步歌詞",
    interactive_rendering_title: "影片渲染中",
    interactive_rendering_desc: "高畫質輸出 (5Mbps)\n請勿關閉此分頁。",
    
    interactive_wrapped_title: "製作完成",
    interactive_input_name: "輸入您的名字 (製作證書用)",
    interactive_btn_export: "確認並導出",
    
    interactive_finished_title: "製作完成",
    interactive_finished_subtitle: "謝謝您",
    interactive_finished_warning: "⚠️ 請立即下載您的影片。",
    interactive_finished_desc: "每一次的開始，都是信任；\n每一次的結束，都是感謝。\n謝謝您讓這首歌有了新的生命。",
    interactive_btn_save_video: "下載影片 (MP4)",
    interactive_btn_return: "回選單",

    // About
    about_title: "關於 Willwi",
    about_subtitle: "Chen Wei-Er • 獨立音樂人",
    about_section_1_title: "創作定位",
    about_section_1_content: "Willwi（陳威兒）是一位以詞曲創作與音樂製作為核心的獨立音樂人，長期專注於以作品完成度與聲音敘事為中心的創作實踐。\n\n其工作內容包含原創音樂發行、音樂製作，以及商業演出與專案型現場表演，演出以作品導向為主，並依合作需求參與品牌活動與各類專案。",
    about_section_2_title: "公共交流",
    about_section_2_content: "在公共交流方面，曾受邀至四所大學進行演講與分享，主題涵蓋音樂創作、產業經驗與跨領域實務，與教育與知識分享性質之場域保持持續互動。",
    about_section_3_title: "曝光選擇",
    about_section_3_content: "Willwi 的發展路徑並未以傳統媒體或電視曝光作為主要方向。他將電視與綜藝型通告視為藝人表演的專業領域，因此不參與該類型曝光競逐；其公開活動重心放在作品本身、現場演出、專案合作與教育交流。\n\n此定位源於對產業分工的尊重與個人創作節奏的選擇，而非能見度、資源或能力條件所致。",
    about_social_title: "官方頻道",

    // Admin
    admin_title: "Admin Console",
    admin_subtitle: "Willwi Music Central Control",
    admin_btn_new: "New Song",
    admin_btn_exit: "Exit",
    admin_stat_total: "Total Catalog",
    admin_stat_active: "Interactive Active",
    admin_stat_payment: "Payment Setup",
    admin_stat_data: "Data Center",
    
    admin_table_play: "Play",
    admin_table_info: "作品資訊",
    admin_table_links: "Ext. Links",
    admin_table_date: "發行日期",
    admin_table_mode: "互動模式",
    admin_table_action: "管理",
    
    admin_login_title: "Manager Login",
    admin_login_btn: "Unlock Console",
    admin_login_error: "密碼錯誤",
    
    admin_settings_system: "系統設定 (System)",
    admin_settings_security: "安全性與權限 (Security & Access Control)",
    admin_sec_admin_pwd: "後台管理密碼 (Admin)",
    admin_sec_user_code: "前台通行碼 (User Access)",
    admin_sec_admin_desc: "用於登入本管理後台與新增作品頁面。",
    admin_sec_user_desc: "使用者付款後，輸入此代碼以解鎖互動功能。",
    admin_btn_update: "更新",
    
    admin_data_export: "導出作品集 (Export JSON)",
    admin_data_export_desc: "將目前資料庫中所有的作品、歌詞與連結備份成單一 JSON 檔案，以便隨時復原或轉移。",
    admin_data_import: "匯入作品集 (Import JSON)",
    admin_data_import_desc: "上傳備份的 JSON 檔案。注意：這會清空目前的資料庫並以新檔案覆蓋。",
    admin_btn_download: "立即下載備份檔案",
    admin_btn_overwrite: "選擇檔案並覆寫",
    
    admin_payment_setup: "金流 QR Code 設置",
    admin_payment_user_code: "使用者通行碼 (User Access Code)",
    
    // Payment Modal
    modal_title: "參與者身份",
    modal_close: "關閉",
    modal_name: "姓名",
    modal_email: "信箱",
    modal_payment_header: "支持方式",
    modal_tab_interactive_sub: "製作專屬影片",
    modal_tab_cinema_sub: "專屬收藏",
    modal_tab_support_sub: "純粹支持",
    payment_total: "支持總額",
    payment_sessions: "製作數量",
    payment_support_unit: "單價",
    payment_service_fee: "服務費用",
    payment_premium_tier: "典藏等級",
    modal_bank_info: "匯款資訊",
    modal_bank_account: "匯款帳號",
    modal_bank_copy: "複製",
    modal_manual_btn: "我已匯款，開始製作 (Start)",
    modal_manual_note: "* 請務必截圖匯款畫面，稍後透過 LINE 官方帳號傳送給 Willwi 核對以取得通行碼。",
    modal_already_have_code: "已有通行碼？點此輸入",
    modal_verify_title: "驗證通行",
    modal_verify_desc: "請將匯款/付款截圖傳送至 LINE 官方帳號。\nWillwi 確認後將提供您一組通行碼 (Access Code)。",
    modal_verify_placeholder: "輸入通行碼 (如 8888)",
    modal_verify_back: "返回",
    modal_verify_unlock: "解鎖",
    modal_interactive_desc: "選擇製作數量，您的每一份支持，都將讓音樂創作持續下去。",
    modal_cinema_desc: "高規格 4K 影片渲染，並將歌手親筆簽名嵌入影片畫面中，極具收藏價值。",
    modal_support_desc: "這是一份音樂食糧，讓 Willwi 能夠吃飽，繼續有力氣做音樂。",
    modal_custom_amount_label: "金額",
    modal_custom_amount_hint: "預設 100 元",
    modal_footer_thanks: "感謝您的溫度",
    modal_confirm_btn_invalid: "請填寫身份以確認",
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: keyof typeof TRANSLATIONS['en']) => {
      return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
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
