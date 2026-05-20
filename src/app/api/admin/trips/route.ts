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
    .from('trips')
    .select(
      `id, title, start_date, end_date, base_currency, display_currency, created_at,
       profiles!trips_created_by_fkey(email, full_name)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 取每個帳本的成員數與費用數
  const tripIds = (data ?? []).map((t: any) => t.id)

  const [memberCounts, expenseCounts] = await Promise.all([
    db.from('trip_members').select('trip_id').in('trip_id', tripIds),
    db.from('expenses').select('trip_id').in('trip_id', tripIds),
  ])

  const memberMap: Record<string, number> = {}
  const expenseMap: Record<string, number> = {}
  ;(memberCounts.data ?? []).forEach((m: any) => {
    memberMap[m.trip_id] = (memberMap[m.trip_id] ?? 0) + 1
  })
  ;(expenseCounts.data ?? []).forEach((e: any) => {
    expenseMap[e.trip_id] = (expenseMap[e.trip_id] ?? 0) + 1
  })

  const enriched = (data ?? []).map((t: any) => ({
    ...t,
    member_count: memberMap[t.id] ?? 0,
    expense_count: expenseMap[t.id] ?? 0,
  }))

  return NextResponse.json({ data: enriched, total: count ?? 0 })
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createAdminClient()

  const { error } = await db.from('trips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
