import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ isAdmin: false })

  const adminEmail = process.env.ADMIN_EMAIL
  return NextResponse.json({ isAdmin: !!adminEmail && user.email === adminEmail })
}
