# J-Split 部署指南 🚀

完整的部署教學，從零開始到上線。

## 📋 前置準備

- Google 帳號（用於 Supabase 和 Vercel）
- GitHub 帳號
- Node.js 18+ 安裝在本機

## 第一步：建立 Supabase 專案

### 1.1 註冊並建立專案

1. 前往 https://supabase.com
2. 點擊「Start your project」
3. 使用 Google 帳號登入
4. 點擊「New Project」
5. 填寫：
   - **Name**: `j-split`
   - **Database Password**: 設定一組強密碼（記下來）
   - **Region**: 選擇 `Northeast Asia (Seoul)` 或離您最近的
6. 點擊「Create new project」（需等待 1-2 分鐘）

### 1.2 執行資料庫 Schema

1. 在 Supabase Dashboard 左側選單點擊 **SQL Editor**
2. 點擊「New query」
3. 複製 `supabase/schema.sql` 的**完整內容**
4. 貼上並點擊「Run」
5. 確認顯示「Success」

### 1.3 啟用 Realtime

1. 點擊左側 **Database** > **Replication**
2. 找到並啟用以下表格的 Realtime：
   - ✅ `trips`
   - ✅ `expenses`
   - ✅ `expense_splits`
   - ✅ `trip_members`

### 1.4 取得 API 金鑰

1. 點擊左側 **Settings** > **API**
2. 複製以下資訊（等等會用到）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...` (很長的字串)

## 第二步：設定 Google OAuth

### 2.1 建立 Google OAuth 應用

1. 前往 https://console.cloud.google.com/
2. 點擊頂部「Select a project」> 「New Project」
3. 輸入專案名稱：`J-Split`，點擊「Create」
4. 選擇剛建立的專案
5. 左側選單：**APIs & Services** > **Credentials**
6. 點擊「Configure Consent Screen」：
   - User Type: **External**
   - App name: `J-Split`
   - User support email: 您的 email
   - Developer contact: 您的 email
   - 點擊「Save and Continue」
   - Scopes 直接點「Save and Continue」
   - Test users 可以跳過，點「Save and Continue」
7. 回到 **Credentials** 頁面
8. 點擊「Create Credentials」> 「OAuth client ID」
9. 選擇：
   - Application type: **Web application**
   - Name: `J-Split Web Client`
10. **Authorized redirect URIs** 點擊「Add URI」，加入：
    ```
    https://你的supabase專案.supabase.co/auth/v1/callback
    ```
    例如：`https://abcdefghijk.supabase.co/auth/v1/callback`
11. 點擊「Create」
12. 複製 **Client ID** 和 **Client Secret**（等等會用到）

### 2.2 在 Supabase 設定 Google Provider

1. 回到 Supabase Dashboard
2. 左側選單：**Authentication** > **Providers**
3. 找到 **Google**，點擊展開
4. 啟用 Google provider（打開開關）
5. 貼上剛才的：
   - **Client ID**
   - **Client Secret**
6. 點擊「Save」

## 第三步：本機開發測試

### 3.1 設定專案

```bash
# 1. 進入專案目錄
cd ~/Desktop/J-Split

# 2. 安裝依賴
npm install

# 3. 複製環境變數範本
cp .env.local.example .env.local

# 4. 編輯環境變數
```

在 `.env.local` 貼上您的資訊：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的專案.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
```

### 3.2 本機測試

```bash
# 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000

**測試項目：**
- ✅ 可以看到首頁
- ✅ 點擊「使用 Google 帳號登入」
- ✅ 登入後可以建立旅程
- ✅ 可以新增費用

### 3.3 更新 Google OAuth 本機測試 (Optional)

如果本機測試登入失敗，需要加入 localhost redirect URI：

1. 回到 Google Cloud Console > Credentials
2. 編輯 OAuth 2.0 Client
3. 在 Authorized redirect URIs 加入：
   ```
   http://localhost:3000/auth/callback
   ```
4. 儲存

## 第四步：部署到 Vercel

### 4.1 推送到 GitHub

```bash
# 1. 初始化 Git（如果還沒有）
git init

# 2. 加入所有檔案
git add .

# 3. 提交
git commit -m "Initial commit - J-Split"

# 4. 建立 GitHub Repository
# 前往 https://github.com/new
# Repository name: j-split
# Public 或 Private 都可以
# 不要勾選任何初始化選項
# 點擊 Create repository

# 5. 連接並推送
git branch -M main
git remote add origin https://github.com/你的帳號/j-split.git
git push -u origin main
```

### 4.2 部署到 Vercel

1. 前往 https://vercel.com
2. 使用 GitHub 帳號登入
3. 點擊「Add New...」> 「Project」
4. Import 您的 `j-split` Repository
5. 點擊「Import」
6. **Environment Variables** 設定：
   - 點擊「Add」
   - 加入：
     ```
     NEXT_PUBLIC_SUPABASE_URL = https://你的專案.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = 你的anon-key
     ```
7. 點擊「Deploy」
8. 等待 2-3 分鐘，部署完成後會得到網址，例如：
   ```
   https://j-split-xxxx.vercel.app
   ```

### 4.3 更新 Google OAuth 正式環境

1. 回到 Google Cloud Console > Credentials
2. 編輯 OAuth 2.0 Client
3. 在 Authorized redirect URIs 加入：
   ```
   https://你的supabase專案.supabase.co/auth/v1/callback
   ```
   （如果還沒加的話）
4. 儲存

### 4.4 更新 Supabase Site URL

1. 回到 Supabase Dashboard
2. 左側 **Authentication** > **URL Configuration**
3. **Site URL** 改為：
   ```
   https://j-split-xxxx.vercel.app
   ```
   （您的 Vercel 網址）
4. **Redirect URLs** 加入：
   ```
   https://j-split-xxxx.vercel.app/**
   ```
5. 點擊「Save」

## 第五步：測試正式環境

1. 開啟您的 Vercel 網址
2. 測試登入
3. 建立旅程
4. 新增費用
5. 邀請朋友一起測試（分享網址）

## 🎉 完成！

您的 J-Split 已經成功上線！

## 📱 分享給朋友

直接分享您的 Vercel 網址：
```
https://j-split-xxxx.vercel.app
```

## 🔧 常見問題

### Q: 登入後頁面沒反應？
A: 檢查瀏覽器 Console (F12)，可能是：
- Google OAuth Redirect URI 設定錯誤
- Supabase Site URL 沒更新

### Q: 無法看到其他成員的更新？
A: 確認 Supabase Realtime 已啟用（第一步 1.3）

### Q: 部署後修改程式碼如何更新？
A:
```bash
git add .
git commit -m "更新說明"
git push
```
Vercel 會自動重新部署

### Q: 想要自己的網域？
A: 
1. Vercel Dashboard > Settings > Domains
2. 加入您的網域
3. 按照指示設定 DNS
4. 記得更新 Google OAuth 和 Supabase 的 URL

## 📞 需要幫助？

- Supabase 文件: https://supabase.com/docs
- Next.js 文件: https://nextjs.org/docs
- Vercel 支援: https://vercel.com/support

---

祝您使用愉快！ ✈️
