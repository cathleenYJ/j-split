'use client'

import { useState } from 'react'
import { supabase, TripMember } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { Currency } from '@/lib/split-calc'
import { Plus } from 'lucide-react'
import { CurrencySelector } from './CurrencySelector'
import { MemberSelector } from './MemberSelector'

type Props = {
  tripId: string
  members: (TripMember & { profile: any })[]
  onSuccess: () => void
}

export function ExpenseForm({ tripId, members, onSuccess }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    currency: 'TWD' as Currency,
    payer_id: user?.id || '',
    expense_date: new Date().toISOString().split('T')[0],
    splitWith: [] as string[],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const amount = parseFloat(form.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('請輸入有效金額')
        return
      }

      if (!form.payer_id) {
        alert('請選擇付款人')
        return
      }

      // 如果沒選分攤對象，預設所有人
      const splitWith = form.splitWith.length > 0 ? form.splitWith : members.map(m => m.user_id)

      // 建立費用
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          description: form.description,
          amount,
          currency: form.currency,
          payer_id: form.payer_id,
          expense_date: form.expense_date,
          created_by: user.id,
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // 建立分攤記錄
      const shareAmount = amount / splitWith.length
      const splits = splitWith.map(userId => ({
        expense_id: expense.id,
        user_id: userId,
        share_amount: shareAmount,
      }))

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splits)

      if (splitError) throw splitError

      // 重置表單
      setForm({
        description: '',
        amount: '',
        currency: 'TWD',
        payer_id: user.id,
        expense_date: new Date().toISOString().split('T')[0],
        splitWith: [],
      })

      onSuccess()
    } catch (error: any) {
      console.error('新增費用失敗:', error)
      alert('新增失敗：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleSplit(userId: string) {
    setForm(prev => ({
      ...prev,
      splitWith: prev.splitWith.includes(userId)
        ? prev.splitWith.filter(id => id !== userId)
        : [...prev.splitWith, userId]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          value={form.payer_id}
          onChange={(userId) => setForm({ ...form, payer_id: userId })}
          placeholder="誰付款？"
        />
      </div>

      <div>
        <label className="text-sm text-text3 mb-2 block">分攤對象（不選則平均分給所有人）</label>
        <div className="flex flex-wrap gap-2">
          {members.filter(m => m.profile).map((m) => {
            const isSelected = form.splitWith.includes(m.user_id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleSplit(m.user_id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  isSelected
                    ? 'bg-accent/10 border-2 border-accent text-accent font-medium'
                    : 'bg-surface2 border-2 border-[var(--border)] text-text2'
                }`}
              >
                {m.profile?.full_name || m.profile?.email || '未知用戶'}
              </button>
            )
          })}
        </div>
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
