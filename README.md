# Willwi Music Database

這是 Willwi 音樂資料庫的備份與版本控制 repository。

## 內容說明

- `schema.sql`: 完整的 Supabase 資料庫結構（包含所有 tables, policies, functions）

## 資料庫架構

### 主要 Tables

- **songs**: 歌曲主資料表（220+ 首原創與翻唱作品）
  - 包含：title, version_label, cover_url, language, project_type, release_category, 各平台連結等
- **users**: 用戶資料表
  - 包含：name, email, credits, is_admin 等
- **transactions**: 交易記錄表
  - 記錄用戶的點數購買與使用紀錄
- **spotify_config**: Spotify API 設定
  - 儲存 client_id, client_secret, refresh_token
- **sync_logs**: Spotify 同步記錄
  - 記錄每次與 Spotify API 同步的狀態
- **messages**: Realtime 訊息表
  - 用於即時通訊功能

## 專案資訊

- **資料庫平台**: Supabase (PostgreSQL)
- **主要用途**: Willwi 音樂平台後端資料庫
- **最後更新**: 2026-01-24

---

© 2026 Willwi (泡麵) | 獨立音樂創作者
