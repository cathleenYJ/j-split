'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, MapPin, Receipt, LogOut, ChevronRight } from 'lucide-react'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

const navItems = [
  { href: '/admin', label: '總覽', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: '使用者', icon: Users },
  { href: '/admin/trips', label: '帳本', icon: MapPin },
  { href: '/admin/expenses', label: '費用', icon: Receipt },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-surface2 flex flex-col">
        {/* Logo area */}
        <div className="px-6 py-5 border-b border-surface2">
          <p className="text-xs font-semibold uppercase tracking-widest text-text3 mb-1">J-Split</p>
          <h1 className="text-lg font-semibold text-accent">Admin 後台</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-text2 hover:bg-surface hover:text-text'
                }`}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div className="px-4 py-4 border-t border-surface2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-xs font-bold text-accent">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text truncate">{user.email}</p>
              <p className="text-[10px] text-accent font-semibold">Administrator</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-text3 hover:bg-surface hover:text-text transition-colors"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
