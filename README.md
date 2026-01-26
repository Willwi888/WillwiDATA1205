# Willwi 1205 Official Music Database

專為獨立音樂人 **Willwi (陳威兒)** 設計的多語系音樂作品管理系統與互動實驗室。

## 核心設計理念

本系統不只是單純的數據庫，而是一個「留住記憶的地方」。透過極簡、高質感的介面設計，讓聽眾與創作者能在此共同紀錄音樂的呼吸。

## 技術棧 (Tech Stack)

- **前端框架**: React 19 (ES6+ Modules)
- **樣式處理**: Tailwind CSS (客製化品牌色調與流體排版)
- **人工智慧**: 
    - **Google Gemini 3 Flash**: 用於自動化解析音樂數據 (ISRC/UPC)。
    - **Google Gemini Veo (3.1 Fast)**: 於錄製室生成 8 秒有機底片顆粒背景影片。
- **本地存儲**: IndexedDB (透過 `idb` 庫處理離線數據)。
- **金流串接**: 模擬 ECPay 與 NewebPay 的前端簽章邏輯。

## 核心功能 (Core Features)

### 1. 多語音樂作品庫 (Catalog)
- 支持華語、台語、日語、韓語、英語等多國語言切換。
- 自動關聯 Spotify 數據，提供快速匯入功能。
- 橫向簡約濾鏡系統，快速篩選不同語系之作品。

### 2. 手作互動錄製室 (Interactive Studio)
- **呼吸感對時**: 使用者可手動紀錄歌詞節奏點。
- **AI 影像渲染**: 結合 Gemini Veo 技術，根據專輯封面生成專屬的 8 秒鐘有機噪點底片背景。
- **影片導出**: 生成專屬的手作對時影片，供社群分享。

### 3. 管理控制台 (Console)
- 具備安全密碼解鎖機制 (預設碼: `8520`)。
- 全站數據備份 (JSON Export/Import)。
- 全站設置管理：包含封面圖、金流 QR Code、通行代碼等。

### 4. 視覺特效 (Visual Experience)
- **Snowfall**: 全站頂層降雪特效，可透過導覽列隨時開關。
- **Splash Screen**: 品牌動態啟動畫面。
- **Cinema Mode**: 針對歌詞呈現的影視級模糊美化效果。

## 使用注意事項

- **API 權限**: 互動錄製室的渲染功能需連動 `Google GenAI API`。
- **瀏覽器支持**: 建議使用 Chrome / Edge 以獲得最佳的 WebCrypto 與 IndexedDB 效能。
- **音訊格式**: 系統優化了來自 Dropbox 與 Spotify 的串流連結解析。

---
© 2025 Willwi Music Database. All rights reserved.