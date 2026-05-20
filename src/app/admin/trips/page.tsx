'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Search, MapPinOff, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'

type TripRow = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  base_currency: string
  display_currency: string | null
  created_at: string
  profiles: { email: string; full_name: string | null } | null
  member_count: number
  expense_count: number
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<TripRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  const LIMIT = 20

  const loadTrips = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/trips?page=${page}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTrips(data.data)
      setTotal(data.total)
    } catch (e: any) {
      showToast(e.message ?? '載入失敗', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, showToast])

  useEffect(() => { loadTrips() }, [loadTrips])

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/trips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast('帳本已刪除', 'success')
      setConfirmDelete(null)
      loadTrips()
    } catch (e: any) {
      showToast(e.message ?? '刪除失敗', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = search
    ? trips.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.profiles?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : trips

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">帳本管理</h2>
          <p className="text-sm text-text3 mt-1">共 {total} 個帳本</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="搜尋帳本名稱或創建者"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface2 bg-white text-sm text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-surface2 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-text3">
            <MapPinOff size={28} />
            <p className="text-sm">沒有符合的帳本</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface2 bg-surface">
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider">帳本名稱</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden md:table-cell">創建者</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden lg:table-cell">成員 / 費用</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden lg:table-cell">幣別</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden xl:table-cell">建立時間</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface2">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text">{t.title}</p>
                      <Link
                        href={`/trip/${t.id}`}
                        target="_blank"
                        className="text-text3 hover:text-accent transition-colors"
                        title="前往帳本"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                    {t.start_date && (
                      <p className="text-xs text-text3 mt-0.5">
                        {format(new Date(t.start_date), 'yyyy/MM/dd', { locale: zhTW })}
                        {t.end_date && ` – ${format(new Date(t.end_date), 'yyyy/MM/dd', { locale: zhTW })}`}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text2 hidden md:table-cell">
                    <p>{t.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-text3">{t.profiles?.email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3 text-text2 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">{t.member_count}</span>
                      <span className="text-text3">人</span>
                      <span className="text-text3 mx-1">/</span>
                      <span className="font-medium">{t.expense_count}</span>
                      <span className="text-text3">筆</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text3 hidden lg:table-cell">
                    <span className="text-xs bg-surface px-2 py-0.5 rounded-full">{t.base_currency}</span>
                  </td>
                  <td className="px-5 py-3 text-text3 hidden xl:table-cell">
                    {format(new Date(t.created_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="p-1.5 rounded-lg text-text3 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="刪除帳本"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-text3">第 {page} / {totalPages} 頁</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-xl border border-surface2 bg-white text-text2 disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-xl border border-surface2 bg-white text-text2 disabled:opacity-40 hover:bg-surface transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-text mb-1">確定刪除帳本？</h3>
            <p className="text-sm text-text3 mb-5">
              將刪除 <span className="font-medium text-text">「{confirmDelete.title}」</span> 及其所有費用資料，此操作無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-surface2 text-sm text-text2 hover:bg-surface transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? '刪除中...' : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
