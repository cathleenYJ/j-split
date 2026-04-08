-- 新增 display_currency 欄位到 trips 表
-- 用於保存用戶選擇的結算顯示幣別

ALTER TABLE public.trips 
ADD COLUMN display_currency TEXT;

-- 將現有旅程的 display_currency 設為 base_currency
UPDATE public.trips 
SET display_currency = base_currency 
WHERE display_currency IS NULL;

-- 設定預設值
ALTER TABLE public.trips 
ALTER COLUMN display_currency SET DEFAULT 'TWD';
