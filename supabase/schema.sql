-- =============================================
-- J-Split 資料庫 Schema (Supabase PostgreSQL)
-- 完整版：包含所有表格、RLS 政策、觸發器和邀請功能
-- 執行方式：在 Supabase Dashboard > SQL Editor 中執行此檔案
-- =============================================

-- =============================================
-- 第一階段：建立所有資料表
-- =============================================

-- 1. 使用者資料表（由 Supabase Auth 自動處理，這裡只做擴充）
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 旅程資料表
CREATE TABLE public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  cover_image TEXT,
  base_currency TEXT DEFAULT 'TWD',
  display_currency TEXT DEFAULT 'TWD',
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 旅程成員資料表
CREATE TABLE public.trip_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 4. 匯率資料表
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, from_currency, to_currency)
);

-- 5. 費用資料表
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  currency TEXT NOT NULL,
  payer_id UUID REFERENCES public.profiles(id) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 費用分攤資料表
CREATE TABLE public.expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  share_amount DECIMAL(20, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- 7. 即時協作表（追蹤誰正在編輯）
CREATE TABLE public.active_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- =============================================
-- 第二階段：創建輔助函數（避免 RLS 遞迴問題）
-- =============================================

-- 函數 1: 獲取用戶加入的所有旅程 ID（使用 SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION public.get_user_trip_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT trip_id FROM public.trip_members
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函數 2: 檢查用戶是否為某旅程的成員（使用 SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函數 3: 檢查兩個用戶是否在同一旅程中（使用 SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION public.is_same_trip_member(profile_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = auth.uid() AND tm2.user_id = profile_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 第三階段：啟用 RLS 並設定政策
-- =============================================

-- 啟用所有表的 Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

-- Profiles 政策（允許查看同旅程成員的資料）
CREATE POLICY "Users can view own and trip members profiles" 
  ON public.profiles FOR SELECT 
  USING (
    auth.uid() = id 
    OR 
    public.is_same_trip_member(id)
  );

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trips 政策（支援邀請功能：已登入用戶可查看旅程基本資訊）
CREATE POLICY "Authenticated users can view trips" 
  ON public.trips FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create trips" 
  ON public.trips FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trip creator can update" 
  ON public.trips FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Trip creator can delete" 
  ON public.trips FOR DELETE 
  USING (auth.uid() = created_by);

-- Trip Members 政策（支援邀請功能：成員可查看同旅程的所有成員）
CREATE POLICY "Members can view all trip members" 
  ON public.trip_members FOR SELECT 
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Users can add themselves as members" 
  ON public.trip_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trip creators can manage members" 
  ON public.trip_members FOR ALL
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE created_by = auth.uid()
    )
  );

-- Exchange Rates 政策（使用輔助函數避免遞迴）
CREATE POLICY "Members can view exchange rates" 
  ON public.exchange_rates FOR SELECT 
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Members can manage exchange rates" 
  ON public.exchange_rates FOR ALL 
  USING (public.is_trip_member(trip_id));

-- Expenses 政策（使用輔助函數避免遞迴）
CREATE POLICY "Members can view expenses" 
  ON public.expenses FOR SELECT 
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Members can create expenses" 
  ON public.expenses FOR INSERT 
  WITH CHECK (
    public.is_trip_member(trip_id) AND auth.uid() = created_by
  );

CREATE POLICY "Members can update expenses" 
  ON public.expenses FOR UPDATE 
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Members can delete expenses" 
  ON public.expenses FOR DELETE 
  USING (public.is_trip_member(trip_id));

-- Expense Splits 政策（使用輔助函數避免遞迴）
CREATE POLICY "Members can view expense splits" 
  ON public.expense_splits FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e 
      WHERE e.id = expense_splits.expense_id 
      AND public.is_trip_member(e.trip_id)
    )
  );

CREATE POLICY "Members can manage splits" 
  ON public.expense_splits FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e 
      WHERE e.id = expense_splits.expense_id 
      AND public.is_trip_member(e.trip_id)
    )
  );

-- Active Users 政策（使用輔助函數避免遞迴）
CREATE POLICY "Members can view active users" 
  ON public.active_users FOR ALL 
  USING (public.is_trip_member(trip_id));

-- =============================================
-- 第四階段：觸發器
-- =============================================

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 觸發器：新使用者自動建立 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 先删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 完成！接下來需要手動設定
-- =============================================
-- 1. 在 Supabase Dashboard > Database > Replication 中啟用 Realtime：
--    - trips
--    - trip_members
--    - expenses
--    - expense_splits
--    - active_users
--
-- 2. 如果已有現有用戶，執行此 SQL 為他們創建 profile：
--    INSERT INTO public.profiles (id, email, full_name, avatar_url)
--    SELECT 
--      au.id,
--      au.email,
--      au.raw_user_meta_data->>'full_name',
--      au.raw_user_meta_data->>'avatar_url'
--    FROM auth.users au
--    LEFT JOIN public.profiles p ON au.id = p.id
--    WHERE p.id IS NULL;

