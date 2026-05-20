'use client'

import { useState, useEffect } from 'react'
import { supabase, TripMember, getMemberDisplayName } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Currency } from '@/lib/split-calc'
import { Plus, Users, ChevronDown } from 'lucide-react'
import { useToast } from './ToastProvider'
import { CurrencySelector } from './CurrencySelector'
import { MemberSelector } from './MemberSelector'
import { CATEGORIES, CategoryKey, getCategoryByKey } from '@/lib/categories'

type Props = {
  tripId: string
  members: (TripMember & { profile: any })[]
  baseCurrency: Currency
  onSuccess: () => void
}

export function ExpenseForm({ tripId, members, baseCurrency, onSuccess }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showSplitPicker, setShowSplitPicker] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    currency: baseCurrency,
    payerMemberId: '',   // 改用 trip_members.id
    expense_date: new Date().toISOString().split('T')[0],
    splitWith: [] as string[],  // trip_members.id 陣列
    category: '' as CategoryKey | '',
  })

  // 成員載入後預設付款人為當前使用者
  useEffect(() => {
    if (members.length > 0 && !form.payerMemberId && user) {
      const myMember = members.find(m => m.user_id === user.id)
      if (myMember) {
        setForm(prev => ({ ...prev, payerMemberId: myMember.id }))
      }
    }
  }, [members, user?.id])

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
      // 如果沒選分攤對象，預設所有人
      const splitWith = form.splitWith.length > 0 ? form.splitWith : members.map(m => m.id)

      // 建立費用（payer_id 僅對登入成員有值，訪客為 null）
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          description: form.description,
          amount,
          currency: form.currency,
          payer_id: payerMember?.user_id || null,
          payer_member_id: form.payerMemberId,
          expense_date: form.expense_date,
          category: form.category || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // 建立分攤記錄
      const shareAmount = amount / splitWith.length
      const splits = splitWith.map(memberId => {
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
        .insert(splits)

      if (splitError) throw splitError

      // 重置表單（保留付款人）
      setForm(prev => ({
        description: '',
        amount: '',
        currency: baseCurrency,
        payerMemberId: prev.payerMemberId,
        expense_date: new Date().toISOString().split('T')[0],
        splitWith: [],
        category: '' as CategoryKey | '',
      }))

      onSuccess()
    } catch (error: any) {
      console.error('新增費用失敗:', error)
      showToast('新增失敗：' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function toggleSplit(memberId: string) {
    setForm(prev => ({
      ...prev,
      splitWith: prev.splitWith.includes(memberId)
        ? prev.splitWith.filter(id => id !== memberId)
        : [...prev.splitWith, memberId]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category Picker */}
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

      <div>
        <input
          type="text"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="費用描述（如：黑豬肉烤肉、城山日出峰門票）"
          className="w-full px-4 py-3 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="number"
          required
          step="any"
          min="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="金額"
          className="px-4 py-3 rounded-lg"
        />
        <CurrencySelector
          value={form.currency}
          onChange={(currency) => setForm({ ...form, currency })}
        />
        <MemberSelector
          members={members}
          value={form.payerMemberId}
          onChange={(memberId) => setForm({ ...form, payerMemberId: memberId })}
          placeholder="誰付款？"
        />
      </div>

      <div>
        <input
          type="date"
          value={form.expense_date}
          onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          className="w-full px-4 py-3 rounded-lg"
        />
      </div>

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
                : `已選 ${form.splitWith.length}\u00a0/\u00a0${members.length} 人`}
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
              {members.map((m) => {
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
                    {m.guest_name && (
                      <span className="ml-1 text-xs opacity-60">訪</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        {loading ? '新增中...' : '新增費用'}
      </button>
    </form>
  )
}
