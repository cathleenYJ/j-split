'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Users, Check, ArrowRight } from 'lucide-react'

type PageProps = {
  params: { id: string }
}

export default function JoinTripPage({ params }: PageProps) {
  const tripId = params.id
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // 未登入，保存目標 URL 後導向首頁
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingInvite', `/trip/${tripId}/join`)
        }
        router.push('/')
        return
      }
      loadTripInfo()
    }
  }, [user, authLoading, tripId])

  async function loadTripInfo() {
    try {
      setLoading(true)
      // 載入旅程資料
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripError) {
        console.error('Trip not found:', tripError)
        alert('找不到此旅程')
        router.push('/dashboard')
        return
      }

      setTrip(tripData)

      // 檢查是否已經是成員
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', user!.id)
        .single()

      if (memberData) {
        setAlreadyMember(true)
      }

    } catch (error) {
      console.error('Error loading trip:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinTrip() {
    if (!user || !trip) return

    setJoining(true)
    try {
      // 加入旅程
      const { error } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          role: 'member'
        })

      if (error) {
        console.error('加入失敗錯誤:', error)
        throw error
      }

      console.log('成功加入旅程:', tripId)
      
      // 清除 pending invite
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingInvite')
      }
      
      // 成功後導向旅程頁面
      router.push(`/trip/${tripId}`)
    } catch (error: any) {
      console.error('Failed to join trip:', error)
      alert(`加入旅程失敗：${error.message || '請稍後再試'}`)
    } finally {
      setJoining(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text3">載入中...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return null
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">你已經是成員了！</h1>
            <p className="text-text3 mb-6">你已經在「{trip.title}」的旅程中</p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/trip/${tripId}`)}
                className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                前往旅程
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 text-text3 hover:text-text1 transition-colors text-sm"
              >
                返回我的旅程
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold mb-2">邀請你加入旅程</h2>
            <p className="text-2xl font-serif text-accent">{trip.title}</p>
            {trip.start_date && trip.end_date && (
              <p className="text-sm text-text3 mt-2">
                {new Date(trip.start_date).toLocaleDateString('zh-TW')} - {new Date(trip.end_date).toLocaleDateString('zh-TW')}
              </p>
            )}
          </div>

          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <p className="text-sm text-text3">
              加入後，你可以：
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>✓ 查看所有費用明細</li>
              <li>✓ 新增旅程費用</li>
              <li>✓ 即時查看結算結果</li>
              <li>✓ 與成員即時協作</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleJoinTrip}
              disabled={joining}
              className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              {joining ? '加入中...' : '加入旅程'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 text-text3 hover:text-text1 transition-colors text-sm"
            >
              返回我的旅程
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
