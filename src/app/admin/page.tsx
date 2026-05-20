'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, MapPin, Receipt, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type Stats = {
  totalUsers: number
  totalTrips: number
  totalExpenses: number
  totalAmount: number
  recentTrips: { id: string; title: string; created_at: string }[]
  recentUsers: { id: string; email: string; full_name: string | null; created_at: string }[]
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-sm text-text2 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text3 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setStats(d)
      })
      .catch(() => setError('無法載入資料'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      </div>
    )
  }

  const totalAmountFormatted = new Intl.NumberFormat('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(stats!.totalAmount)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text">總覽</h2>
        <p className="text-sm text-text3 mt-1">J-Split 整體使用狀況</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="總使用者"
          value={stats!.totalUsers}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={MapPin}
          label="總帳本"
          value={stats!.totalTrips}
          color="bg-accent/10 text-accent"
        />
        <StatCard
          icon={Receipt}
          label="總費用筆數"
          value={stats!.totalExpenses}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={TrendingUp}
          label="總費用金額"
          value={totalAmountFormatted}
          sub="各幣別加總（未換算）"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Recent sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface2 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-text3" />
              <h3 className="text-sm font-semibold text-text">最近帳本</h3>
            </div>
            <Link href="/admin/trips" className="flex items-center gap-1 text-xs text-accent hover:underline">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-surface2">
            {stats!.recentTrips.length === 0 && (
              <li className="px-5 py-4 text-sm text-text3">尚無帳本</li>
            )}
            {stats!.recentTrips.map((trip) => (
              <li key={trip.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface transition-colors">
                <div>
                  <p className="text-sm font-medium text-text">{trip.title}</p>
                </div>
                <span className="text-xs text-text3">
                  {format(new Date(trip.created_at), 'MM/dd', { locale: zhTW })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface2 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-text3" />
              <h3 className="text-sm font-semibold text-text">最近新用戶</h3>
            </div>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs text-accent hover:underline">
              查看全部 <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-surface2">
            {stats!.recentUsers.length === 0 && (
              <li className="px-5 py-4 text-sm text-text3">尚無使用者</li>
            )}
            {stats!.recentUsers.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface transition-colors">
                <div>
                  <p className="text-sm font-medium text-text">{u.full_name ?? u.email}</p>
                  {u.full_name && <p className="text-xs text-text3">{u.email}</p>}
                </div>
                <span className="text-xs text-text3">
                  {format(new Date(u.created_at), 'MM/dd', { locale: zhTW })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
