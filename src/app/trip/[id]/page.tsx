'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase, Trip, Expense, Profile, TripMember, ExchangeRate } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Users, Plus, Settings, UserPlus, Trash2, UserMinus, DollarSign, Edit2 } from 'lucide-react'
import { ExpenseForm } from '@/components/ExpenseForm'
import { ExpenseList } from '@/components/ExpenseList'
import { BalanceView } from '@/components/BalanceView'
import { InviteModal } from '@/components/InviteModal'
import { ExchangeRateModal } from '@/components/ExchangeRateModal'
import { EditTripModal } from '@/components/EditTripModal'
import { AddGuestModal } from '@/components/AddGuestModal'
import { buildRateMap, calculateBalances, calculateSettlements, Currency } from '@/lib/split-calc'
import { getMemberDisplayName } from '@/lib/supabase'

type PageProps = {
  params: { id: string }
}

export default function TripDetailPage({ params }: PageProps) {
  const tripId = params.id
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<(TripMember & { profile: Profile })[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<(TripMember & { profile: Profile | null }) | null>(null)
  const [removingMember, setRemovingMember] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }

    if (user && tripId) {
      loadTripData()
      return subscribeToChanges()
    }
  }, [user, authLoading, tripId])

  async function loadTripData() {
    try {
      // 1. 載入帳本資料
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripError) throw tripError
      setTrip(tripData)
      
      // 初始化顯示幣別（從資料庫讀取，如無則使用基礎幣別）
      if (!displayCurrency) {
        setDisplayCurrency((tripData.display_currency || tripData.base_currency) as Currency)
      }

      // 2. 檢查是否為成員
      const { data: memberCheck } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', user!.id)
        .single()

      if (!memberCheck) {
        alert('您不是此帳本的成員')
        router.push('/dashboard')
        return
      }
      setIsMember(true)

      // 3. 載入所有成員
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select('*, profile:profiles(*)')
        .eq('trip_id', tripId)

      if (membersError) throw membersError
      setMembers(membersData as any)

      // 4. 載入費用
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('expense_date', { ascending: false })

      if (expensesError) throw expensesError
      setExpenses(expensesData || [])

      // 5. 載入匯率
      const { data: ratesData, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('trip_id', tripId)

      if (ratesError) throw ratesError
      setExchangeRates(ratesData || [])

    } catch (error) {
      console.error('載入帳本資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  function subscribeToChanges() {
    // 訂閱費用變更
    const expenseChannel = supabase
      .channel(`trip-${tripId}-expenses`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () => {
          loadTripData()
        }
      )
      .subscribe()

    // 訂閱成員變更
    const memberChannel = supabase
      .channel(`trip-${tripId}-members`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        () => {
          loadTripData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(expenseChannel)
      supabase.removeChannel(memberChannel)
    }
  }

  async function handleDeleteTrip() {
    if (!trip || trip.created_by !== user?.id) {
      alert('只有帳本創建者可以刪除帳本')
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      alert('帳本已刪除')
      router.push('/dashboard')
    } catch (error) {
      console.error('刪除帳本失敗:', error)
      alert('刪除失敗，請稍後再試')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove || !trip || trip.created_by !== user?.id) {
      alert('只有帳本創建者可以移除成員')
      return
    }

    if (memberToRemove.user_id === user?.id) {
      alert('無法移除自己')
      return
    }

    setRemovingMember(true)
    try {
      // 1. 獲取該帳本的所有費用 ID
      const { data: tripExpenses, error: fetchError } = await supabase
        .from('expenses')
        .select('id')
        .eq('trip_id', tripId)

      if (fetchError) throw fetchError

      // 2. 刪除該成員在這些費用中的分攤記錄（用 member_id 統一處理登入與訪客）
      if (tripExpenses && tripExpenses.length > 0) {
        const expenseIds = tripExpenses.map(e => e.id)
        const { error: splitError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('member_id', memberToRemove.id)
          .in('expense_id', expenseIds)

        if (splitError) throw splitError
      }

      // 3. 刪除該成員作為付款人的所有費用（CASCADE 會自動刪除剩餘的 expense_splits）
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('trip_id', tripId)
        .eq('payer_member_id', memberToRemove.id)

      if (expenseError) throw expenseError

      // 4. 刪除成員記錄
      const { error: memberError } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberToRemove.id)

      if (memberError) throw memberError

      alert('成員已移除，相關費用記錄已清除')
      setMemberToRemove(null)
      loadTripData()
    } catch (error) {
      console.error('移除成員失敗:', error)
      alert('移除失敗，請稍後再試')
    } finally {
      setRemovingMember(false)
    }
  }

  async function handleDisplayCurrencyChange(currency: Currency) {
    setDisplayCurrency(currency)
    
    // 保存到資料庫
    try {
      const { error } = await supabase
        .from('trips')
        .update({ display_currency: currency })
        .eq('id', tripId)

      if (error) throw error
    } catch (error) {
      console.error('保存顯示幣別失敗:', error)
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

  if (!trip || !isMember) {
    return null
  }

  // 計算餘額和轉帳方案
  const rateMap = buildRateMap(
    exchangeRates.map(r => ({ from: r.from_currency as Currency, to: r.to_currency as Currency, rate: Number(r.rate) }))
  )

  // 收集費用中使用的所有幣別
  const usedCurrencies = Array.from(new Set(expenses.map(e => e.currency as Currency)))

  // 使用 trip_members.id 作為統一成員識別鍵（相容登入與訪客成員）
  const expensesWithSplits = expenses.map(exp => ({
    ...exp,
    splitWith: members.map(m => m.id),
  }))

  const { balances, hasError } = calculateBalances(
    expensesWithSplits.map(e => ({
      amount: Number(e.amount),
      currency: e.currency as Currency,
      payer_id: e.payer_member_id || '',
      splitWith: e.splitWith,
    })),
    displayCurrency || trip.base_currency as Currency,
    rateMap
  )

  const settlements = hasError ? [] : calculateSettlements(balances, displayCurrency || trip.base_currency as Currency)

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Link href="/dashboard" className="p-2 hover:bg-surface2 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-xl font-semibold text-accent">{trip.title}</h1>
              {(trip.start_date || trip.end_date) && (
                <p className="text-xs text-text3 mt-1">
                  {trip.start_date && new Date(trip.start_date).toLocaleDateString('zh-TW')}
                  {trip.start_date && trip.end_date && ' - '}
                  {trip.end_date && new Date(trip.end_date).toLocaleDateString('zh-TW')}
                </p>
              )}
            </div>
            {trip.created_by === user?.id && (
              <button 
                onClick={() => setShowEditModal(true)}
                className="p-2 hover:bg-surface2 rounded-lg transition-colors"
                title="編輯帳本"
              >
                <Edit2 className="w-5 h-5 text-accent" />
              </button>
            )}
            <button 
              onClick={() => setShowRateModal(true)}
              className="p-2 hover:bg-surface2 rounded-lg transition-colors"
              title="匯率管理"
            >
              <DollarSign className="w-5 h-5 text-accent" />
            </button>
            {trip.created_by === user?.id && (
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                title="刪除帳本"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            )}
          </div>

          {/* Members Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Users className="w-4 h-4 text-text3 flex-shrink-0" />
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full text-sm transition-colors flex-shrink-0"
              title="邀請成員"
            >
              <UserPlus className="w-4 h-4 text-accent" />
              <span className="text-accent font-medium">邀請</span>
            </button>
            <button
              onClick={() => setShowAddGuestModal(true)}
              className="flex items-center gap-1.5 bg-accent2/10 hover:bg-accent2/20 px-3 py-1.5 rounded-full text-sm transition-colors flex-shrink-0"
              title="新增訪客成員"
            >
              <UserPlus className="w-4 h-4 text-accent2" />
              <span className="text-accent2 font-medium">訪客</span>
            </button>
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-2 bg-surface2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap group">
                {member.guest_name ? (
                  <div className="w-5 h-5 rounded-full bg-accent2/20 flex items-center justify-center">
                    <span className="text-[10px] text-accent2 font-bold">訪</span>
                  </div>
                ) : member.profile?.avatar_url ? (
                  <Image
                    src={member.profile.avatar_url}
                    alt={getMemberDisplayName(member)}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : null}
                <span>{getMemberDisplayName(member)}</span>
                {trip.created_by === user?.id && member.user_id !== user?.id && (
                  <button
                    onClick={() => setMemberToRemove(member)}
                    className="ml-1 p-0.5 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="移除成員"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Add Expense Card */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">新增費用</h2>
          <ExpenseForm 
            tripId={tripId} 
            members={members} 
            onSuccess={loadTripData}
          />
        </div>

        {/* Expense List */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            費用明細
            <span className="ml-2 text-sm font-normal text-text3">({expenses.length} 筆)</span>
          </h2>
          <ExpenseList 
            expenses={expenses} 
            members={members}
            baseCurrency={displayCurrency || trip.base_currency as Currency}
            rateMap={rateMap}
            onDelete={loadTripData}
          />
        </div>

        {/* Balance & Settlement */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">結算結果</h2>
          {hasError ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-text2 mb-2">部分費用幣別缺少匯率設定</p>
              <p className="text-sm text-text3 mb-6">
                請設定匯率以進行多幣別換算
              </p>
              <button
                onClick={() => setShowRateModal(true)}
                className="btn-primary px-6 py-2 rounded-lg inline-flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                設定匯率
              </button>
            </div>
          ) : (
            <BalanceView
              balances={balances}
              settlements={settlements}
              members={members}
              baseCurrency={displayCurrency || trip.base_currency as Currency}
              hasError={hasError}
            />
          )}
        </div>
      </main>

      {/* Add Guest Modal */}
      <AddGuestModal
        tripId={tripId}
        isOpen={showAddGuestModal}
        onClose={() => setShowAddGuestModal(false)}
        onSuccess={loadTripData}
      />

      {/* Invite Modal */}
      <InviteModal
        tripId={tripId}
        tripTitle={trip.title}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Edit Trip Modal */}
      <EditTripModal
        trip={trip}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={loadTripData}
      />

      {/* Exchange Rate Modal */}
      <ExchangeRateModal
        tripId={tripId}
        displayCurrency={displayCurrency || trip.base_currency as Currency}
        usedCurrencies={usedCurrencies}
        onDisplayCurrencyChange={handleDisplayCurrencyChange}
        isOpen={showRateModal}
        onClose={() => setShowRateModal(false)}
        onUpdate={loadTripData}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold">刪除帳本</h3>
            </div>
            
            <p className="text-text2 mb-2">
              確定要刪除「<span className="font-semibold text-accent">{trip.title}</span>」嗎？
            </p>
            <p className="text-sm text-red-500 mb-6">
              ⚠️ 此操作將永久刪除所有費用記錄、成員資料和結算資訊，且無法復原。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold">移除成員</h3>
            </div>
            
            <p className="text-text2 mb-2">
              確定要將「<span className="font-semibold text-accent">{getMemberDisplayName(memberToRemove)}</span>」移除嗎？
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-600 font-medium mb-2">
                ⚠️ 此操作將會刪除：
              </p>
              <ul className="text-sm text-red-600 space-y-1 ml-4">
                <li>• 該成員的所有付款記錄</li>
                <li>• 該成員的所有費用分攤記錄</li>
                <li>• 該成員的帳本存取權限</li>
              </ul>
              <p className="text-sm text-red-600 mt-2 font-medium">
                此操作無法復原！
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={removingMember}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-surface2 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removingMember}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingMember ? '移除中...' : '確認移除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
