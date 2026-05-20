'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Search, FileX, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'

type ExpenseRow = {
  id: string
  description: string
  amount: number
  currency: string
  expense_date: string
  category: string | null
  notes: string | null
  created_at: string
  trips: { id: string; title: string } | null
  profiles: { email: string; full_name: string | null } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  food: '餐飲',
  transport: '交通',
  accommodation: '住宿',
  activity: '活動',
  shopping: '購物',
  medical: '醫療',
  other: '其他',
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<ExpenseRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  const LIMIT = 20

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/expenses?page=${page}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExpenses(data.data)
      setTotal(data.total)
    } catch (e: any) {
      showToast(e.message ?? '載入失敗', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, showToast])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast('費用已刪除', 'success')
      setConfirmDelete(null)
      loadExpenses()
    } catch (e: any) {
      showToast(e.message ?? '刪除失敗', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = search
    ? expenses.filter((e) =>
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.trips?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.profiles?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : expenses

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">費用管理</h2>
          <p className="text-sm text-text3 mt-1">共 {total} 筆費用</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="搜尋說明、帳本或建立者"
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
            <FileX size={28} />
            <p className="text-sm">沒有符合的費用</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface2 bg-surface">
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider">說明</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden md:table-cell">帳本</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider">金額</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden lg:table-cell">類別</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden xl:table-cell">日期</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface2">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text">{e.description}</p>
                    {e.notes && <p className="text-xs text-text3 truncate max-w-[200px]">{e.notes}</p>}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {e.trips ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-text2">{e.trips.title}</span>
                        <Link
                          href={`/trip/${e.trips.id}`}
                          target="_blank"
                          className="text-text3 hover:text-accent transition-colors"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-text3">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-text">
                      {new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(e.amount)}
                    </span>
                    <span className="text-xs text-text3 ml-1">{e.currency}</span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {e.category ? (
                      <span className="text-xs bg-surface px-2 py-0.5 rounded-full text-text2">
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    ) : (
                      <span className="text-text3">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text3 hidden xl:table-cell">
                    {format(new Date(e.expense_date), 'yyyy/MM/dd', { locale: zhTW })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(e)}
                      className="p-1.5 rounded-lg text-text3 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="刪除費用"
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
            <h3 className="text-base font-semibold text-text mb-1">確定刪除費用？</h3>
            <p className="text-sm text-text3 mb-5">
              將刪除 <span className="font-medium text-text">「{confirmDelete.description}」</span>，此操作無法復原。
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
