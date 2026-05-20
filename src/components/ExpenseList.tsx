'use client'

import { Expense, ExpenseSplit, TripMember, supabase, getMemberDisplayName } from '@/lib/supabase'
import { Currency, formatCurrency, convert } from '@/lib/split-calc'
import { Trash2, Pencil, User, ChevronDown, Users } from 'lucide-react'
import { useToast } from './ToastProvider'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import { getCategoryByKey } from '@/lib/categories'
import { useState } from 'react'
import { EditExpenseModal } from './EditExpenseModal'

type Props = {
  expenses: Expense[]
  splits: ExpenseSplit[]
  members: (TripMember & { profile: any })[]
  baseCurrency: Currency
  rateMap: Record<Currency, Record<Currency, number | null>>
  onDelete: () => void
  onEdit: () => void
}

export function ExpenseList({ expenses, splits, members, baseCurrency, rateMap, onDelete, onEdit }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set())

  function toggleSplits(expId: string) {
    setExpandedSplits(prev => {
      const next = new Set(prev)
      if (next.has(expId)) next.delete(expId)
      else next.add(expId)
      return next
    })
  }

  // 建立每筆費用的分擔成員 Map
  const splitMap = new Map<string, string[]>()
  for (const s of splits) {
    if (!s.expense_id || !s.member_id) continue
    if (!splitMap.has(s.expense_id)) splitMap.set(s.expense_id, [])
    splitMap.get(s.expense_id)!.push(s.member_id)
  }

  // 改用 trip_members.id 查找（相容登入與訪客成員）
  function getMemberById(id: string) {
    return members.find(m => m.id === id)
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
      showToast('刪除失敗：' + error.message, 'error')
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
          // payer_member_id 優先（新資料），fallback 至舊欄位查詢
          const payerId = exp.payer_member_id || ''
          const payer = payerId ? getMemberById(payerId) : null
          const converted = convert(Number(exp.amount), exp.currency as Currency, baseCurrency, rateMap)
          const category = getCategoryByKey(exp.category)
          const CategoryIcon = category.icon
          const splitMemberIds = splitMap.get(exp.id) || []
          const splitMembers = splitMemberIds.map(id => getMemberById(id)).filter(Boolean) as (TripMember & { profile: any })[]

          return (
            <div key={exp.id} className="flex items-center gap-2 sm:gap-3 py-3 border-b border-[var(--border)] last:border-0">
              {/* Payer Avatar */}
              {payer?.guest_name ? (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent2/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-accent2" />
                </div>
              ) : payer?.profile?.avatar_url ? (
                <Image
                  src={payer.profile.avatar_url}
                  alt={getMemberDisplayName(payer)}
                  width={36}
                  height={36}
                  className="rounded-full flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base">{exp.description}</div>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-xs px-0 sm:px-1.5 py-0.5 rounded-full flex-shrink-0 ${category.color} ${category.textColor}`}>
                    <CategoryIcon className="w-3 h-3" />
                    {category.label}
                  </span>
                  <span className="hidden sm:inline text-xs text-text3 mx-1">·</span>
                  <span className="block sm:inline text-xs text-text3 mt-0.5 sm:mt-0">
                    {payer ? getMemberDisplayName(payer) : '未知用戶'} 付款
                    {exp.expense_date && ` · ${new Date(exp.expense_date).toLocaleDateString('zh-TW')}`}
                  </span>
                </div>
                {splitMembers.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => toggleSplits(exp.id)}
                      className="flex items-center gap-1 text-xs text-text3 hover:text-text2 transition-colors"
                    >
                      <Users className="w-3 h-3" />
                      <span>共 {splitMembers.length} 人分擔</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedSplits.has(exp.id) ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSplits.has(exp.id) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {splitMembers.map(m => (
                          <span
                            key={m.id}
                            className="text-xs bg-surface2 border border-[var(--border)] text-text2 px-1.5 py-0.5 rounded-full"
                          >
                            {getMemberDisplayName(m)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount + Currency */}
              <div className="text-right flex-shrink-0">
                <div className="font-medium text-sm md:text-base">
                  {formatCurrency(Number(exp.amount), exp.currency as Currency)}
                  <span className="ml-1 text-xs font-normal text-accent2">{exp.currency}</span>
                </div>
                {converted !== null && exp.currency !== baseCurrency && (
                  <div className="text-xs text-text3">
                    ≈ {formatCurrency(converted, baseCurrency)} {baseCurrency}
                  </div>
                )}
              </div>

              {/* Action Buttons: stack on mobile, row on sm+ */}
              <div className="flex flex-col sm:flex-row gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setEditingExpense(exp)}
                  className="p-2 hover:bg-surface2 rounded-lg transition-colors"
                  title="編輯"
                >
                  <Pencil className="w-4 h-4 text-text3" />
                </button>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="刪除"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="flex justify-between items-baseline pt-4 mt-4 border-t-2 border-[var(--border2)]">
        <span className="text-sm text-text2">總計（{baseCurrency} 換算）</span>
        <strong className="text-lg">{formatCurrency(total, baseCurrency)}</strong>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          splits={splits}
          members={members}
          onClose={() => setEditingExpense(null)}
          onSuccess={onEdit}
        />
      )}
    </div>
  )
}
