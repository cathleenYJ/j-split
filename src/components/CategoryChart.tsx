'use client'

import { useMemo } from 'react'
import { Expense, ExpenseSplit, TripMember, getMemberDisplayName } from '@/lib/supabase'
import { Currency, formatCurrency, convert } from '@/lib/split-calc'
import { getCategoryByKey } from '@/lib/categories'
import { useAuth } from './AuthProvider'
import Image from 'next/image'
import { User } from 'lucide-react'

type Props = {
  expenses: Expense[]
  splits: ExpenseSplit[]
  members: (TripMember & { profile: any })[]
  baseCurrency: Currency
  rateMap: Record<Currency, Record<Currency, number | null>>
}

type Slice = {
  key: string
  label: string
  hex: string
  total: number
  percent: number
  startAngle: number
  endAngle: number
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Clamp to avoid full-circle issues
  const clampedEnd = Math.min(endAngle, startAngle + 359.999)
  const start = polarToXY(cx, cy, r, startAngle)
  const end = polarToXY(cx, cy, r, clampedEnd)
  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export function CategoryChart({ expenses, splits, members, baseCurrency, rateMap }: Props) {
  const { user } = useAuth()

  const myMemberId = useMemo(
    () => user ? (members.find(m => m.user_id === user.id)?.id ?? null) : null,
    [user, members]
  )

  const myMember = useMemo(
    () => myMemberId ? members.find(m => m.id === myMemberId) ?? null : null,
    [myMemberId, members]
  )

  // 建立 expense_id → Expense 對照表
  const expenseMap = useMemo(() => {
    const map = new Map<string, Expense>()
    for (const exp of expenses) map.set(exp.id, exp)
    return map
  }, [expenses])

  const slices = useMemo<Slice[]>(() => {
    if (!myMemberId) return []

    const totals: Record<string, number> = {}
    for (const s of splits) {
      if (s.member_id !== myMemberId || s.share_amount === null) continue
      const exp = expenseMap.get(s.expense_id)
      if (!exp) continue
      const key = exp.category || 'others'
      const amount = convert(Number(s.share_amount), exp.currency as Currency, baseCurrency, rateMap)
      if (amount !== null) totals[key] = (totals[key] ?? 0) + amount
    }

    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
    if (grandTotal === 0) return []

    // Build slices sorted descending
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
    let angle = 0
    return entries.map(([key, total]) => {
      const cat = getCategoryByKey(key)
      const percent = total / grandTotal
      const span = percent * 360
      const slice: Slice = {
        key,
        label: cat.label,
        hex: cat.hex,
        total,
        percent,
        startAngle: angle,
        endAngle: angle + span,
      }
      angle += span
      return slice
    })
  }, [myMemberId, splits, expenseMap, baseCurrency, rateMap])

  if (slices.length === 0) {
    return <div className="text-center py-8 text-text3">新增費用後自動顯示分類統計</div>
  }

  const cx = 80, cy = 80, r = 70
  const grandTotal = slices.reduce((s, v) => s + v.total, 0)

  return (
    <div className="space-y-5">
      {/* Identity header */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
        {myMember?.profile?.avatar_url ? (
          <Image
            src={myMember.profile.avatar_url}
            alt={getMemberDisplayName(myMember)}
            width={40}
            height={40}
            className="rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-accent" />
          </div>
        )}
        <div>
          <div className="text-xs text-text3">我的花費分析</div>
          <div className="font-semibold text-sm">
            {myMember ? getMemberDisplayName(myMember) : '我'}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-text3">分擔總計</div>
          <div className="font-bold text-accent">{formatCurrency(grandTotal, baseCurrency)}</div>
        </div>
      </div>
      {/* Pie */}
      <div className="flex justify-center">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {slices.length === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill={slices[0].hex} />
          ) : (
            slices.map(s => (
              <path
                key={s.key}
                d={describeArc(cx, cy, r, s.startAngle, s.endAngle)}
                fill={s.hex}
                stroke="var(--background)"
                strokeWidth={1.5}
              />
            ))
          )}
          <circle cx={cx} cy={cy} r={28} fill="var(--surface)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slices.map(s => {
          const cat = getCategoryByKey(s.key)
          const Icon = cat.icon
          return (
            <div key={s.key} className="flex items-center gap-3 p-3 bg-surface2 rounded-lg border border-[var(--border)]">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.hex }} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                <Icon className={`w-4 h-4 ${cat.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-text3">{formatCurrency(s.total, baseCurrency)}</div>
              </div>
              <div className="text-sm font-semibold text-text2 flex-shrink-0">
                {(s.percent * 100).toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
