import { createClient } from '@supabase/supabase-js'

/**
 * 服務端管理員 Supabase Client（使用 Service Role Key，可繞過 RLS）
 * 只能在 Server-Side（API Routes / Server Components）使用，絕不暴露至瀏覽器
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
