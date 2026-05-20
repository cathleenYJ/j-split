import { NextResponse } from 'next/server'
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

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalTrips },
    { count: totalExpenses },
    { data: expenseAmounts },
    { data: recentTrips },
    { data: recentUsers },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('trips').select('*', { count: 'exact', head: true }),
    db.from('expenses').select('*', { count: 'exact', head: true }),
    db.from('expenses').select('amount'),
    db.from('trips').select('id, title, created_at, created_by').order('created_at', { ascending: false }).limit(5),
    db.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const totalAmount = (expenseAmounts ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalTrips: totalTrips ?? 0,
    totalExpenses: totalExpenses ?? 0,
    totalAmount,
    recentTrips: recentTrips ?? [],
    recentUsers: recentUsers ?? [],
  })
}
