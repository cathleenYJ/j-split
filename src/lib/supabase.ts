import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClientComponentClient()

// 用於服務端
export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 資料庫型別（可以用 Supabase CLI 自動生成）
export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Trip = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  cover_image: string | null
  base_currency: string
  display_currency: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type TripMember = {
  id: string
  trip_id: string
  user_id: string | null      // 訪客成員為 null
  guest_name: string | null   // 訪客顯示名稱，登入成員為 null
  role: 'creator' | 'admin' | 'member'
  joined_at: string
}

export type Expense = {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  payer_id: string | null           // 訪客付款時為 null
  payer_member_id: string | null    // 指向 trip_members.id（統一識別）
  expense_date: string
  category: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ExpenseSplit = {
  id: string
  expense_id: string
  user_id: string | null     // 訪客分攤時為 null
  member_id: string | null   // 指向 trip_members.id（統一識別）
  share_amount: number | null
  created_at: string
}

// 取得成員顯示名稱（相容登入成員與訪客）
export function getMemberDisplayName(member: TripMember & { profile?: any }): string {
  if (member.guest_name) return member.guest_name
  return member.profile?.full_name || member.profile?.email || '未知用戶'
}

export type ExchangeRate = {
  id: string
  trip_id: string
  from_currency: string
  to_currency: string
  rate: number
  created_at: string
  updated_at: string
}
