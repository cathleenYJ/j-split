'use client'

import { useState, useEffect } from 'react'
import { supabase, Expense, ExpenseSplit, TripMember, getMemberDisplayName } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Currency } from '@/lib/split-calc'
import { X, Save, Users, ChevronDown } from 'lucide-react'
import { useToast } from './ToastProvider'
import { CurrencySelector } from './CurrencySelector'
import { MemberSelector } from './MemberSelector'
import { CATEGORIES, CategoryKey, getCategoryByKey } from '@/lib/categories'

type Props = {
  expense: Expense
  splits: ExpenseSplit[]
  members: (TripMember & { profile: any })[]
  onClose: () => void
  onSuccess: () => void
}

export function EditExpenseModal({ expense, splits, members, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showSplitPicker, setShowSplitPicker] = useState(false)

  const initialSplitWith = splits
    .filter(s => s.expense_id === expense.id && s.member_id)
    .map(s => s.member_id!)

  const [form, setForm] = useState({
    description: expense.description,
    amount: String(expense.amount),
    currency: expense.currency as Currency,
    payerMemberId: expense.payer_member_id || '',
    expense_date: expense.expense_date,
    splitWith: initialSplitWith,
    category: (expense.category || '') as CategoryKey | '',
  })

  // Lock scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const amount = parseFloat(form.amount)
      if (isNaN(amount) || amount <= 0) {
        showToast('請輸入有效金額', 'info')
        return
      }
      if (!form.payerMemberId) {
        showToast('請選擇付款人', 'info')
        return
      }

      const payerMember = members.find(m => m.id === form.payerMemberId)
      const splitWith = form.splitWith.length > 0 ? form.splitWith : members.map(m => m.id)

      // 1. 更新費用主記錄
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description: form.description,
          amount,
          currency: form.currency,
          payer_id: payerMember?.user_id || null,
          payer_member_id: form.payerMemberId,
          expense_date: form.expense_date,
          category: form.category || null,
        })
        .eq('id', expense.id)

      if (expenseError) throw expenseError

      // 2. 刪除舊分攤記錄，重新建立
      const { error: deleteError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expense.id)

      if (deleteError) throw deleteError

      const shareAmount = amount / splitWith.length
      const newSplits = splitWith.map(memberId => {
        const m = members.find(mm => mm.id === memberId)
        return {
          expense_id: expense.id,
          user_id: m?.user_id || null,
          member_id: memberId,
          share_amount: shareAmount,
        }
      })

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(newSplits)

      if (splitError) throw splitError

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('更新費用失敗:', error)
      showToast('更新失敗：' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function toggleSplit(memberId: string) {
    setForm(prev => ({
      ...prev,
      splitWith: prev.splitWith.includes(memberId)
        ? prev.splitWith.filter(id => id !== memberId)
        : [...prev.splitWith, memberId],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-base">編輯費用</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Category */}
          <div>
            <label className="text-sm text-text3 mb-2 block">費用類別</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border2)] bg-surface hover:border-accent transition-colors text-left"
            >
              {form.category ? (() => {
                const cat = getCategoryByKey(form.category)
                const Icon = cat.icon
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color} ${cat.textColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </span>
                )
              })() : (
                <span className="text-sm text-text3">未分類</span>
              )}
              <ChevronDown className={`w-4 h-4 text-text3 transition-transform flex-shrink-0 ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryPicker && (
              <div className="mt-2 border border-[var(--border2)] rounded-lg p-3 bg-surface">
                <div className="flex flex-wrap gap-2">
                  {form.category && (
                    <button
                      type="button"
                      onClick={() => { setForm(prev => ({ ...prev, category: '' })); setShowCategoryPicker(false) }}
                      className="self-center text-xs text-text3 hover:underline px-1"
                    >
                      清除
                    </button>
                  )}
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isSelected = form.category === cat.key
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => { setForm(prev => ({ ...prev, category: isSelected ? '' : cat.key })); setShowCategoryPicker(false) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all border-2 ${
                          isSelected
                            ? `${cat.color} ${cat.textColor} border-current font-medium`
                            : 'bg-surface2 text-text3 border-[var(--border)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <input
            type="text"
            required
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="費用描述"
            className="w-full px-4 py-3 rounded-lg"
          />

          {/* Amount / Currency / Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="number"
              required
              step="any"
              min="0"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="金額"
              className="px-4 py-3 rounded-lg"
            />
            <CurrencySelector
              value={form.currency}
              onChange={currency => setForm({ ...form, currency })}
            />
            <MemberSelector
              members={members}
              value={form.payerMemberId}
              onChange={memberId => setForm({ ...form, payerMemberId: memberId })}
              placeholder="誰付款？"
            />
          </div>

          {/* Date */}
          <input
            type="date"
            value={form.expense_date}
            onChange={e => setForm({ ...form, expense_date: e.target.value })}
            className="w-full px-4 py-3 rounded-lg"
          />

          {/* Split */}
          <div>
            <label className="text-sm text-text3 mb-2 block">分擔對象</label>
            <button
              type="button"
              onClick={() => setShowSplitPicker(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border2)] bg-surface hover:border-accent transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text3 flex-shrink-0" />
                <span className="text-sm text-text2">
                  {form.splitWith.length === 0
                    ? `全員分擔（${members.length} 人）`
                    : `已選 ${form.splitWith.length} / ${members.length} 人`}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-text3 transition-transform ${showSplitPicker ? 'rotate-180' : ''}`} />
            </button>
            {showSplitPicker && (
              <div className="mt-2 border border-[var(--border2)] rounded-lg p-3 bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text3">
                    {form.splitWith.length === 0
                      ? `未選（預設全 ${members.length} 人）`
                      : `已選 ${form.splitWith.length} / ${members.length} 人`}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, splitWith: members.map(m => m.id) }))}
                      className="text-xs text-accent hover:underline"
                    >
                      全選
                    </button>
                    {form.splitWith.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, splitWith: [] }))}
                        className="text-xs text-text3 hover:underline"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {members.map(m => {
                    const isSelected = form.splitWith.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleSplit(m.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-accent/10 border-2 border-accent text-accent font-medium'
                            : 'bg-surface2 border-2 border-[var(--border)] text-text2'
                        }`}
                      >
                        {getMemberDisplayName(m)}
                        {m.guest_name && <span className="ml-1 text-xs opacity-60">訪</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? '儲存中...' : '儲存變更'}
          </button>
        </form>
      </div>
    </div>
  )
}
