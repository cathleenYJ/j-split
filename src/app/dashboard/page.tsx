'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase, Trip } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, LogOut, Calendar, Trash2 } from 'lucide-react'
import { CreateTripModal } from '@/components/CreateTripModal'
import { useToast } from '@/components/ToastProvider'

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }
    
    // 如果已登入，檢查是否有待處理的邀請
    if (!loading && user && typeof window !== 'undefined') {
      const pendingInvite = sessionStorage.getItem('pendingInvite')
      if (pendingInvite) {
        router.push(pendingInvite)
        return
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadTrips()
    }
  }, [user])

  async function handleDeleteTrip() {
    if (!tripToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete.id)

      if (error) throw error

      showToast('帳本已刪除', 'success')
      setTripToDelete(null)
      loadTrips()
    } catch (error) {
      console.error('刪除帳本失敗:', error)
      showToast('刪除失敗，請稍後再試', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function loadTrips() {
    try {
      // 查詢用戶參與的帳本 ID
      const { data: memberData, error: memberError } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user!.id)

      if (memberError) throw memberError

      const tripIds = memberData.map((m) => m.trip_id)

      // 查詢帳本：包含用戶創建的 + 被邀請加入的
      let query = supabase
        .from('trips')
        .select('*')

      if (tripIds.length > 0) {
        query = query.or(`id.in.(${tripIds.join(',')}),created_by.eq.${user!.id}`)
      } else {
        query = query.eq('created_by', user!.id)
      }

      const { data: tripsData, error: tripsError } = await query.order('created_at', { ascending: false })

      if (tripsError) throw tripsError
      setTrips(tripsData || [])
    } catch (error) {
      console.error('載入帳本失敗:', error)
    } finally {
      setLoadingTrips(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text3">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-0 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/logo_mini.PNG" 
              alt="Logo" 
              width={120} 
              height={120} 
              priority
              className="rounded-lg" 
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || '使用者'}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              )}
              <span className="text-sm font-medium hidden md:block">{profile?.full_name || profile?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 hover:bg-surface2 rounded-lg transition-colors"
              title="登出"
            >
              <LogOut className="w-5 h-5 text-text3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-accent mb-2">我的帳本</h1>
            <p className="text-text3">管理您的分帳記錄</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-4 sm:px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">建立帳本</span>
          </button>
        </div>

        {/* Trips Grid */}
        {loadingTrips ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text3">載入帳本中...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold mb-2">還沒有任何帳本</h3>
            <p className="text-text3 mb-6">建立您的第一個帳本，開始記錄美好回憶</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              建立第一個帳本
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div key={trip.id} className="relative group">
                <Link href={`/trip/${trip.id}`}>
                  <div className="card hover:shadow-md transition-shadow cursor-pointer h-full">
                    {trip.cover_image && (
                      <div className="w-full h-40 rounded-lg overflow-hidden mb-4 bg-surface2">
                        <Image
                          src={trip.cover_image}
                          alt={trip.title}
                          width={400}
                          height={160}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-lg mb-2 pr-8">{trip.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-text3">
                      {(trip.start_date || trip.end_date) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {trip.start_date && new Date(trip.start_date).toLocaleDateString('zh-TW')}
                            {trip.start_date && trip.end_date && ' - '}
                            {trip.end_date && new Date(trip.end_date).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                {trip.created_by === user?.id && (
                  <button
                    onClick={(e) => { e.preventDefault(); setTripToDelete(trip) }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                    title="刪除帳本"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Trip Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold">刪除帳本</h3>
            </div>
            <p className="text-text2 mb-2">
              確定要刪除「<span className="font-semibold text-accent">{tripToDelete.title}</span>」嗎？
            </p>
            <p className="text-sm text-red-500 mb-6">
              ⚠️ 此操作將永久刪除所有費用記錄、成員資料和結算資訊，且無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTripToDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-surface2 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteTrip}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadTrips()
          }}
        />
      )}
    </div>
  )
}
