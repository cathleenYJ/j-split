'use client'

import { useState, useEffect } from 'react'
import { supabase, Trip } from '@/lib/supabase'
import { X } from 'lucide-react'

type Props = {
  trip: Trip
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditTripModal({ trip, isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: trip.title,
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
  })

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: trip.title,
        start_date: trip.start_date || '',
        end_date: trip.end_date || '',
      })
    }
  }, [isOpen, trip])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          title: form.title,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        })
        .eq('id', trip.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('更新帳本失敗:', error)
      alert('更新失敗：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-semibold text-accent">編輯帳本資訊</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">帳本名稱 *</label>
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
              {loading ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
