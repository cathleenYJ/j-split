'use client'

import { useState } from 'react'
import { TripMember } from '@/lib/supabase'
import { Currency, formatCurrency, Balance, Settlement } from '@/lib/split-calc'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

type Props = {
  balances: Balance
  settlements: Settlement[]
  members: (TripMember & { profile: any })[]
  baseCurrency: Currency
  hasError: boolean
}

export function BalanceView({ balances, settlements, members, baseCurrency, hasError }: Props) {
  const [tab, setTab] = useState<'balance' | 'settlement'>('balance')

  function getMemberById(id: string) {
    return members.find(m => m.user_id === id)
  }

  if (hasError) {
    return (
      <div className="text-center py-8 text-red-600">
        ⚠️ 部分費用幣別缺少匯率設定，請聯繫管理員補充
      </div>
    )
  }

  if (Object.keys(balances).length === 0) {
    return <div className="text-center py-8 text-text3">新增費用後自動計算</div>
  }

  const threshold = baseCurrency === 'KRW' ? 50 : baseCurrency === 'JPY' ? 5 : 0.5

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setTab('balance')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            tab === 'balance'
              ? 'text-accent'
              : 'text-text3 hover:text-text2'
          }`}
        >
          個人餘額
          {tab === 'balance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"></div>
          )}
        </button>
        <button
          onClick={() => setTab('settlement')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            tab === 'settlement'
              ? 'text-accent'
              : 'text-text3 hover:text-text2'
          }`}
        >
          轉帳方案
          {tab === 'settlement' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"></div>
          )}
        </button>
      </div>

      {/* Balance View */}
      {tab === 'balance' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.filter(member => member.profile).map(member => {
            const balance = balances[member.user_id] || 0
            const isPositive = balance >= threshold
            const isNegative = balance <= -threshold

            return (
              <div key={member.id} className="bg-surface2 border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  {member.profile?.avatar_url && (
                    <Image
                      src={member.profile.avatar_url}
                      alt={member.profile.full_name || ''}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-medium text-sm">
                    {member.profile?.full_name || member.profile?.email || '未知用戶'}
                  </span>
                </div>
                <div className={`text-xl font-semibold ${
                  isPositive ? 'text-green' : isNegative ? 'text-red' : 'text-text'
                }`}>
                  {formatCurrency(balance, baseCurrency)}
                </div>
                <div className="text-xs text-text3 mt-1">
                  {isPositive ? '應收回' : isNegative ? '應付出' : '已結清'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Settlement View */}
      {tab === 'settlement' && (
        <div>
          {settlements.length === 0 ? (
            <div className="text-center py-8 text-green">
              ✓ 所有人帳目已平衡
            </div>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement, idx) => {
                const from = getMemberById(settlement.from)
                const to = getMemberById(settlement.to)

                return (
                  <div key={idx} className="flex items-center gap-3 py-3 px-4 bg-surface2 rounded-lg">
                    {/* From */}
                    <div className="flex items-center gap-2 flex-1">
                      {from?.profile.avatar_url && (
                        <Image
                          src={from.profile.avatar_url}
                          alt={from.profile.full_name || ''}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <span className="font-medium text-sm">
                        {from?.profile.full_name || from?.profile.email}
                      </span>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center gap-2 text-text3">
                      <div className="h-px flex-1 bg-[var(--border2)] min-w-[20px]"></div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      <div className="h-px flex-1 bg-[var(--border2)] min-w-[20px]"></div>
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-2 flex-1">
                      {to?.profile.avatar_url && (
                        <Image
                          src={to.profile.avatar_url}
                          alt={to.profile.full_name || ''}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <span className="font-medium text-sm">
                        {to?.profile.full_name || to?.profile.email}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="font-semibold text-red flex-shrink-0">
                      {formatCurrency(settlement.amount, baseCurrency)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
