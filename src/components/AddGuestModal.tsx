'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, UserPlus } from 'lucide-react'
import { useToast } from './ToastProvider'

type Props = {
  tripId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddGuestModal({ tripId, isOpen, onClose, onSuccess }: Props) {
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = guestName.trim()
    if (!name) {
      showToast('請輸入訪客名稱', 'info')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: null,
          guest_name: name,
          role: 'member',
        })

      if (error) {
        if (error.code === '23505') {
          showToast(`「${name}」已在此帳本中`, 'info')
        } else {
          throw error
        }
        return
      }

      setGuestName('')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('新增訪客失敗:', error)
      showToast('新增失敗：' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setGuestName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent2/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-accent2" />
            </div>
            <h3 className="text-lg font-semibold">新增訪客成員</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-text3 mb-4">
          訪客不需要帳號即可加入分帳，輸入名稱後即可新增。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="訪客名稱（如：小明、媽媽）"
            maxLength={50}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border2)] bg-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
            autoFocus
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-surface2 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-accent2 hover:bg-accent2/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '新增中...' : '新增訪客'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
