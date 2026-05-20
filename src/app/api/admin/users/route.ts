import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

async function verifyAdmin() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) return null

  return user
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const from = (page - 1) * limit

  const db = createAdminClient()

  const { data, error, count } = await db
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0 })
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createAdminClient()

  // 刪除 Supabase Auth 使用者（會串聯刪除 profile）
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
