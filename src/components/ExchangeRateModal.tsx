'use client'

import { useState, useEffect } from 'react'
import { supabase, ExchangeRate } from '@/lib/supabase'
import { Currency } from '@/lib/split-calc'
import { X, Plus, Trash2, DollarSign, ArrowLeftRight } from 'lucide-react'
import { CurrencySelector } from './CurrencySelector'

type Props = {
  tripId: string
  baseCurrency: Currency
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function ExchangeRateModal({ tripId, baseCurrency, isOpen, onClose, onUpdate }: Props) {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 新增匯率表單
  const [newFrom, setNewFrom] = useState<Currency>(baseCurrency)
  const [newTo, setNewTo] = useState<Currency>('USD')
  const [newRate, setNewRate] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadRates()
    }
  }, [isOpen, tripId])

  async function loadRates() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRates(data || [])
    } catch (error) {
      console.error('載入匯率失敗:', error)
      alert('載入匯率失敗')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRate() {
    if (!newRate || parseFloat(newRate) <= 0) {
      alert('請輸入有效的匯率')
      return
    }

    if (newFrom === newTo) {
      alert('來源和目標貨幣不能相同')
      return
    }

    // 檢查是否已存在相同或反向的匯率設定
    const existingSameDirection = rates.find(
      r => r.from_currency === newFrom && r.to_currency === newTo
    )
    const existingReverse = rates.find(
      r => r.from_currency === newTo && r.to_currency === newFrom
    )

    if (existingSameDirection) {
      const confirmUpdate = confirm(
        `已存在 ${newFrom} → ${newTo} 的匯率設定（${Number(existingSameDirection.rate).toFixed(8)}）\n是否要更新為新的匯率（${parseFloat(newRate).toFixed(8)}）？`
      )
      if (!confirmUpdate) return

      // 更新現有匯率
      setSaving(true)
      try {
        const { error } = await supabase
          .from('exchange_rates')
          .update({ rate: parseFloat(newRate) })
          .eq('id', existingSameDirection.id)

        if (error) throw error

        setNewRate('')
        loadRates()
        onUpdate()
      } catch (error) {
        console.error('更新匯率失敗:', error)
        alert('更新匯率失敗')
      } finally {
        setSaving(false)
      }
      return
    }

    if (existingReverse) {
      alert(
        `已存在反向匯率設定：${existingReverse.from_currency} → ${existingReverse.to_currency}\n請刪除現有設定後再新增，或使用「對調」按鈕`
      )
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          trip_id: tripId,
          from_currency: newFrom,
          to_currency: newTo,
          rate: parseFloat(newRate)
        })

      if (error) throw error

      setNewRate('')
      loadRates()
      onUpdate()
    } catch (error) {
      console.error('新增匯率失敗:', error)
      alert('新增匯率失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRate(rateId: string) {
    if (!confirm('確定要刪除此匯率設定嗎？')) return

    try {
      const { error } = await supabase
        .from('exchange_rates')
        .delete()
        .eq('id', rateId)

      if (error) throw error

      loadRates()
      onUpdate()
    } catch (error) {
      console.error('刪除匯率失敗:', error)
      alert('刪除匯率失敗')
    }
  }

  function handleSwapCurrencies() {
    const temp = newFrom
    setNewFrom(newTo)
    setNewTo(temp)
    // 如果已經有輸入匯率，計算反向匯率
    if (newRate && parseFloat(newRate) > 0) {
      setNewRate((1 / parseFloat(newRate)).toFixed(8))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">匯率管理</h3>
              <p className="text-sm text-text3">基準貨幣：{baseCurrency}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Rate Form */}
          <div className="bg-surface2 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-4">新增匯率</h4>
            <div className="flex flex-col gap-3">
              {/* 貨幣選擇行 */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
                <span className="text-text2 font-medium">1</span>
                <CurrencySelector
                  value={newFrom}
                  onChange={setNewFrom}
                />

                <button
                  onClick={handleSwapCurrencies}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  title="對調貨幣"
                >
                  <ArrowLeftRight className="w-4 h-4 text-accent" />
                </button>
                
                <CurrencySelector
                  value={newTo}
                  onChange={setNewTo}
                />
              </div>

              {/* 匯率輸入和新增按鈕行 */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  step="0.00000001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="輸入匯率（例：0.025）"
                  className="px-3 py-2 bg-surface rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-accent focus:border-transparent"
                />

                <button
                  onClick={handleAddRate}
                  disabled={saving}
                  className="btn-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              </div>
            </div>
          </div>

          {/* Current Rates List */}
          <div>
            <h4 className="font-semibold mb-3">目前匯率設定</h4>
            {loading ? (
              <p className="text-center text-text3 py-8">載入中...</p>
            ) : rates.length === 0 ? (
              <div className="text-center py-8 bg-surface2 rounded-lg">
                <p className="text-text3">尚未設定任何匯率</p>
                <p className="text-sm text-text3 mt-2">請新增匯率以進行多幣別換算</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rates.map(rate => (
                  <div
                    key={rate.id}
                    className="flex items-center justify-between p-4 bg-surface2 rounded-lg hover:bg-surface2/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm">
                        <span className="font-semibold text-accent">{rate.from_currency}</span>
                        <span className="mx-2 text-text3">→</span>
                        <span className="font-semibold text-accent">{rate.to_currency}</span>
                      </div>
                      <div className="text-text3">
                        1 {rate.from_currency} = <span className="font-semibold text-text1">{Number(rate.rate).toFixed(8)}</span> {rate.to_currency}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRate(rate.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-surface2 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
