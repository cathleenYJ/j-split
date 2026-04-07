'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { X } from 'lucide-react'
import { Currency } from '@/lib/split-calc'
import { CurrencySelector } from './CurrencySelector'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function CreateTripModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    base_currency: 'TWD' as Currency,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // 1. 建立旅程
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          ...form,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (tripError) throw tripError

      // 2. 將建立者加入成員
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'creator',
        })

      if (memberError) throw memberError

      // 3. 建立預設匯率（如果需要）
      const defaultRates = [
        { from: 'KRW', to: 'TWD', rate: 0.025 },
        { from: 'USD', to: 'TWD', rate: 32.5 },
        { from: 'JPY', to: 'TWD', rate: 0.215 },
        { from: 'EUR', to: 'TWD', rate: 35.2 },
        { from: 'HKD', to: 'TWD', rate: 4.16 },
      ]

      const rateInserts = defaultRates.map(rate => ({
        trip_id: trip.id,
        ...rate,
      }))

      await supabase.from('exchange_rates').insert(rateInserts)

      onSuccess()
    } catch (error: any) {
      console.error('建立旅程失敗:', error)
      alert('建立失敗：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-semibold text-accent">建立新旅程</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">旅程名稱 *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例：2025 濟州島之旅"
              className="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">開始日期</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-3 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">結束日期</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-4 py-3 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">結算幣別</label>
            <CurrencySelector
              value={form.base_currency}
              onChange={(currency) => setForm({ ...form, base_currency: currency })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg btn-outline"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg btn-primary"
              disabled={loading}
            >
              {loading ? '建立中...' : '建立旅程'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
