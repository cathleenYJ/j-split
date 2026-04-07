-- =============================================
-- J-Split 清除所有資料和結構
-- ⚠️ 警告：此操作會刪除整個表結構、函數、觸發器和所有資料，無法恢復！
-- 執行方式：在 Supabase Dashboard > SQL Editor 中執行此檔案
-- 執行後需要重新運行 schema.sql 來重建表結構
-- =============================================

-- 第一步：刪除所有觸發器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;

-- 第二步：刪除所有函數
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_trip_ids() CASCADE;
DROP FUNCTION IF EXISTS public.is_trip_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_same_trip_member(UUID) CASCADE;

-- 第三步：按照外鍵依賴順序刪除表
DROP TABLE IF EXISTS public.expense_splits CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.exchange_rates CASCADE;
DROP TABLE IF EXISTS public.active_users CASCADE;
DROP TABLE IF EXISTS public.trip_members CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;

-- 第四步：（可選）刪除用戶資料表和認證用戶
-- ⚠️ 注意：這會刪除所有用戶，他們需要重新登入並授權

-- 選項 1：只刪除 profiles 表（保留 auth.users，用戶可以繼續登入）
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- 選項 2：刪除 profiles 和 auth.users（完全清空所有用戶）
-- 取消下面兩行註解以完全重置：
DROP TABLE IF EXISTS public.profiles CASCADE;
DELETE FROM auth.users;

-- =============================================
-- 完成！
-- =============================================
-- 現在可以重新執行 schema.sql 來重建所有結構
-- 
-- 💡 提示：
-- - 如果只想刪除旅程資料，保留用戶，只需執行：DELETE FROM public.trips;
-- - 由於設定了 ON DELETE CASCADE，會自動刪除相關的所有子資料


