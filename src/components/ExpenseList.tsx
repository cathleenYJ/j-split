'use client'

import { Expense, TripMember, supabase } from '@/lib/supabase'
import { Currency, formatCurrency, convert } from '@/lib/split-calc'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from './AuthProvider'

type Props = {
  expenses: Expense[]
  members: (TripMember & { profile: any })[]
  baseCurrency: Currency
  rateMap: Record<Currency, Record<Currency, number | null>>
  onDelete: () => void
}

export function ExpenseList({ expenses, members, baseCurrency, rateMap, onDelete }: Props) {
  const { user } = useAuth()

  function getMemberById(id: string) {
    return members.find(m => m.user_id === id)
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('確定要刪除此筆費用嗎？')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      onDelete()
    } catch (error: any) {
      console.error('刪除失敗:', error)
      alert('刪除失敗：' + error.message)
    }
  }

  if (expenses.length === 0) {
    return <div className="text-center py-8 text-text3">尚無費用記錄</div>
  }

  let total = 0
  expenses.forEach(exp => {
    const converted = convert(Number(exp.amount), exp.currency as Currency, baseCurrency, rateMap)
    if (converted !== null) total += converted
  })

  return (
    <div>
      <div className="space-y-3">
        {expenses.map(exp => {
          const payer = getMemberById(exp.payer_id)
          const converted = convert(Number(exp.amount), exp.currency as Currency, baseCurrency, rateMap)

          return (
            <div key={exp.id} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
              {/* Payer Avatar */}
              {payer?.profile?.avatar_url && (
                <Image
                  src={payer.profile.avatar_url}
                  alt={payer.profile.full_name || ''}
                  width={36}
                  height={36}
                  className="rounded-full flex-shrink-0"
                />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base">{exp.description}</div>
                <div className="text-xs md:text-sm text-text3">
                  {payer?.profile?.full_name || payer?.profile?.email || '未知用戶'} 付款
                  {exp.expense_date && ` · ${new Date(exp.expense_date).toLocaleDateString('zh-TW')}`}
                </div>
              </div>

              {/* Currency Badge */}
              <div className="text-xs font-medium px-2 py-1 rounded-md bg-accent2/10 text-accent2 flex-shrink-0">
                {exp.currency}
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div className="font-medium text-sm md:text-base">
                  {formatCurrency(Number(exp.amount), exp.currency as Currency)}
                </div>
                {converted !== null && exp.currency !== baseCurrency && (
                  <div className="text-xs text-text3">
                    ≈ {formatCurrency(converted, baseCurrency)}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(exp.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="刪除"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="flex justify-between items-baseline pt-4 mt-4 border-t-2 border-[var(--border2)]">
        <span className="text-sm text-text2">總計（{baseCurrency} 換算）</span>
        <strong className="text-lg">{formatCurrency(total, baseCurrency)}</strong>
      </div>
    </div>
  )
}
