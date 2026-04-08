# J-Split - 分帳系統

> 支援多國幣別、即時協作的智慧分帳工具

![J-Split](./public/logo.PNG)

## ✨ 主要功能

- 🌍 **多人協作** - 邀請旅伴一起即時記帳
- 💱 **多幣別支援** - 自動匯率換算，支援 KRW、TWD、USD、JPY、EUR、HKD
- ⚡ **即時同步** - 所有成員即時看到更新
- 🔐 **Google 登入** - 安全便捷的身份驗證
- 🧮 **智慧結算** - 自動計算最優化轉帳方案
- 📱 **手機友善** - 完整的響應式設計

## 🚀 技術棧

### 前端
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **TailwindCSS**

### 後端 & 資料庫
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Row Level Security (RLS)** 資料安全保護

### 部署
- **Vercel** (前端 + API)
- **Supabase Cloud** (資料庫 + 認證)

## 📦 安裝步驟

### 1. 克隆專案

```bash
cd J-Split
npm install
```

### 2. 設定 Supabase

1. 前往 [Supabase](https://supabase.com) 建立新專案
2. 在 SQL Editor 中執行 `supabase/schema.sql` 的所有內容
3. 在 Dashboard > Database > Replication 啟用以下表格的 Realtime：
   - `trips`
   - `expenses`
   - `expense_splits`
   - `trip_members`

### 3. 設定 Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案 > APIs & Services > Credentials
3. 建立 OAuth 2.0 Client ID
4. 設定授權重新導向 URI：
   - `http://localhost:3000/auth/callback` (開發環境)
   - `https://your-domain.vercel.app/auth/callback` (正式環境)
5. 複製 Client ID 和 Client Secret

### 4. 在 Supabase 啟用 Google Provider

1. Supabase Dashboard > Authentication > Providers
2. 啟用 Google
3. 貼上 Google Client ID 和 Secret
4. 設定 Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. 設定環境變數

複製 `.env.local.example` 為 `.env.local`：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# (Google OAuth 已在 Supabase 設定)
```

### 6. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 🌐 部署到 Vercel

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/j-split.git
git push -u origin main
```

### 2. 連接 Vercel

1. 前往 [Vercel](https://vercel.com)
2. Import Repository
3. 選擇您的 GitHub Repository
4. 設定環境變數（複製 `.env.local` 的內容）
5. Deploy

### 3. 更新 Google OAuth 重新導向 URI

將 Vercel 給您的網址（如 `https://j-split.vercel.app`）加入：
- Google Cloud Console 的授權重新導向 URI
- Supabase Authentication Settings 的 Site URL

## 📱 使用說明

### 建立帳本
1. 使用 Google 帳號登入
2. 點擊「建立帳本」
3. 填寫帳本資訊（名稱、目的地、日期等）

### 邀請成員
1. 進入帳本後，點擊「設定」
2. 分享帳本連結給成員
3. 旅伴登入後即可一起編輯

### 記錄費用
1. 填寫費用描述、金額、幣別
2. 選擇付款人
3. 選擇分攤對象（不選則所有人平分）
4. 新增後所有成員即時同步

### 查看結算
- **個人餘額**: 查看每個人應收/應付金額
- **轉帳方案**: 系統自動計算最少轉帳次數的方案

## 🗄️ 資料庫架構

```
profiles          # 使用者資料
├── id (UUID)
├── email
├── full_name
└── avatar_url

trips             # 帳本
├── id (UUID)
├── title
├── destination
├── base_currency
└── created_by

trip_members      # 帳本成員
├── trip_id
├── user_id
└── role

expenses          # 費用
├── id
├── trip_id
├── description
├── amount
├── currency
└── payer_id

expense_splits    # 費用分攤
├── expense_id
├── user_id
└── share_amount

exchange_rates    # 匯率
├── trip_id
├── from_currency
├── to_currency
└── rate
```

## 🔐 安全性

- ✅ Row Level Security (RLS) 保護所有資料表
- ✅ Google OAuth 安全認證
- ✅ JWT Token 身份驗證
- ✅ 只有帳本成員可以查看和編輯資料

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

---

Made with ❤️ for travelers
