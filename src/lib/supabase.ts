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
  created_by: string
  created_at: string
  updated_at: string
}

export type TripMember = {
  id: string
  trip_id: string
  user_id: string
  role: 'creator' | 'admin' | 'member'
  joined_at: string
}

export type Expense = {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  payer_id: string
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
  user_id: string
  share_amount: number | null
  created_at: string
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
