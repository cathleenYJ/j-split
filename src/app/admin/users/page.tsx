'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Search, UserX } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useToast } from '@/components/ToastProvider'

type UserRow = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  const LIMIT = 20

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${page}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUsers(data.data)
      setTotal(data.total)
    } catch (e: any) {
      showToast(e.message ?? '載入失敗', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, showToast])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast('使用者已刪除', 'success')
      setConfirmDelete(null)
      loadUsers()
    } catch (e: any) {
      showToast(e.message ?? '刪除失敗', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : users

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">使用者管理</h2>
          <p className="text-sm text-text3 mt-1">共 {total} 位使用者</p>
        </div>
        {/* Search */}
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="搜尋名稱或 Email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface2 bg-white text-sm text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-surface2 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-text3">
            <UserX size={28} />
            <p className="text-sm">沒有符合的使用者</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface2 bg-surface">
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider">使用者</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-text3 uppercase tracking-wider hidden lg:table-cell">加入時間</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface2">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget
                            el.style.display = 'none'
                            const fallback = el.nextElementSibling as HTMLElement | null
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="w-8 h-8 rounded-full bg-accent/10 items-center justify-center shrink-0"
                        style={{ display: u.avatar_url ? 'none' : 'flex' }}
                      >
                        <span className="text-xs font-bold text-accent">{u.email[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-text3 truncate md:hidden">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text2 hidden md:table-cell">{u.email}</td>
                  <td className="px-5 py-3 text-text3 hidden lg:table-cell">
                    {format(new Date(u.created_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="p-1.5 rounded-lg text-text3 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="刪除使用者"
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

      {/* Pagination */}
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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-text mb-1">確定刪除使用者？</h3>
            <p className="text-sm text-text3 mb-5">
              將刪除 <span className="font-medium text-text">{confirmDelete.email}</span> 及其所有資料，此操作無法復原。
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
