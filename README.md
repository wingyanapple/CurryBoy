# CurryBoy 營業小助理 🍛

灰黑底 + CurryBoy 橙、MUJI 風格嘅手機小工具。
用 **GitHub Pages**（免費寄存）+ **Supabase**（免費資料庫）部署，
可以加到 iPhone 主畫面，兩個人共用同一個資料庫、實時同步。

## 功能

- **本日營業額**：CurryBoy / Keeta / Foodpanda 三欄自動加總，每日一筆，同日可更新
- **本月營業額**：由每月 1 號累積，睇每日明細
- **本月支出**：先揀類別再入銀碼，按日分組、顯示每日小計
- **本月 Balance**：營業額 − 支出，自動分盈利 / 虧損
- **待辦事項 / Idea / 購物清單**：新增、標記完成、刪除
- **清空腦袋**：一次過打一大段，App 用關鍵字自動分成 待辦 / 購物 / Idea，確認後入庫

-----

# 📱 由零開始（全部可以喺 iPhone 做）

> 全程用 Safari 就得。建議揀個安靜時間，一次過做完大約 15 分鐘。

## 第 1 步：開 Supabase（資料庫）

1. 去 **<https://supabase.com>** → **Start your project** → 用 Google / GitHub 登入
1. 撳 **New project**
- Name：`curryboy`
- Database Password：set 一個（記低，之後唔太用到）
- Region：揀 **Southeast Asia (Singapore)** 最近
1. 撳 **Create new project**，等 1–2 分鐘整緊個資料庫

## 第 2 步：貼 SQL 建立資料表

1. 左邊菜單揀 **SQL Editor** → **New query**
1. 打開本專案嘅 **`supabase_setup.sql`**，**全部內容複製**，貼入去
1. 撳右下角 **Run**（或 ⌘+Enter）
1. 見到 **Success. No rows returned** 就成功 ✅

## 第 3 步：攞 Project URL 同 Publishable Key

1. 喺 Dashboard 頂部撳 **Connect**（或左下 **Settings → API Keys**）
1. 抄低兩樣嘢：
- **Project URL**：類似 `https://abcd1234.supabase.co`
- **Publishable key**：以 `sb_publishable_…` 開頭
  （如果見到 *Create new API keys* 掣，先撳佢建立；舊 project 用 **anon** key 都得）
1. 打開本專案嘅 **`app.js`**，將最上面兩行改成你嘅資料：
   
   ```js
   const SUPABASE_URL = "https://abcd1234.supabase.co";      // ← 換成你嘅
   const SUPABASE_KEY = "sb_publishable_xxxxxxxxxxxxxxxxxxxx"; // ← 換成你嘅
   ```
1. 儲存 `app.js`

> ⚠️ Publishable key 係設計俾前端公開用嘅，安全。只要你唔將個 Project URL 周圍派，一般人搵唔到。

## 第 4 步：開 GitHub Repo（放網頁檔案）

1. 去 **<https://github.com>** 登入（無就先 Sign up）
1. 右上 **+** → **New repository**
- Repository name：`curryboy`
- 揀 **Public**
- 撳 **Create repository**

## 第 5 步：上載檔案

1. 喺新 repo 頁面撳 **uploading an existing file**（或 **Add file → Upload files**）
1. 將以下檔案 **全部一次過** 揀晒上載（檔案要喺同一層，唔好放入資料夾）：
   
   ```
   index.html   style.css   app.js
   manifest.json   service-worker.js
   icon-180.png  icon-192.png  icon-512.png  icon-512-maskable.png
   ```

> iPhone 做法：撳 **choose your files** → **瀏覽（Files App）** → 揀晒上面啲檔案。
> 如果一次揀唔晒，可以分幾次上載，每次撳 **Commit changes**。
1. 撳 **Commit changes**

## 第 6 步：開 GitHub Pages

1. repo 頁面撳 **Settings**（齒輪）
1. 左邊揀 **Pages**
1. **Source** 揀 **Deploy from a branch**
1. **Branch** 揀 **main** + **/(root)** → 撳 **Save**
1. 等約 1 分鐘，頁面頂會出現你嘅網址：
   
   ```
   https://你嘅github名.github.io/curryboy/
   ```
1. 用 Safari 開呢條網址，App 應該出到嚟 🎉

## 第 7 步：加到 iPhone 主畫面

1. 用 **Safari** 開上面條網址
1. 撳底部 **分享**（中間個方格加箭咀）
1. 揀 **加入主畫面（Add to Home Screen）**
1. 撳 **加入** → 主畫面就有 CurryBoy 圖示，撳一下全螢幕開，似真 App 一樣

> 兩個人各自喺自己 iPhone 重複 **第 7 步**（用同一條網址）就可以共用。
> 一部改完，另一部會自動同步（如未即時更新，撳右上 ↻ 重新載入掣）。

-----

## 之後想改嘢？

- 改任何檔案：喺 GitHub repo 撳該檔案 → 鉛筆圖示 → 改 → Commit。
  GitHub Pages 幾十秒後自動更新。改完喺手機 App 撳 ↻ 或重開即可。
- 想換支出類別 / 待辦類別：改 `app.js` 最上面嘅 `EXPENSE_CATS`、`TODO_CATS`。

## 清空腦袋分類規則

- 含「買、補貨、訂、入貨」→ 購物清單
- 含「要做、記得、跟進、處理、打俾、問」→ 待辦事項
- 含「諗到、idea、可以試、不如、想做」→ Idea
- 搵唔到關鍵字 → 預設放「待辦」（確認畫面可逐項手動改）

## 安全小提示

呢個 App 為咗夠簡單，無設登入，任何人有條網址 + key 都改到資料。
適合你哋兩個自己用。如果日後想加密碼保護，可以再加 Supabase Auth。

## 檔案一覽

|檔案                  |作用                           |
|--------------------|-----------------------------|
|`index.html`        |App 主框架                      |
|`style.css`         |介面樣式（灰黑 + 橙 + MUJI）          |
|`app.js`            |全部功能邏輯（**部署前要填 Supabase 資料**）|
|`manifest.json`     |PWA 設定                       |
|`service-worker.js` |離線快取                         |
|`supabase_setup.sql`|資料庫建立 SQL                    |
|`icon-*.png`        |App 圖示                       |