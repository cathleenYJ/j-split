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
    .from('expenses')
    .select(
      `id, description, amount, currency, expense_date, category, notes, created_at,
       trips!expenses_trip_id_fkey(id, title),
       profiles!expenses_created_by_fkey(email, full_name)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createAdminClient()

  const { error } = await db.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
