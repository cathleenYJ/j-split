'use client'

import { useState, useEffect } from 'react'
import { supabase, ExchangeRate } from '@/lib/supabase'
import { Currency } from '@/lib/split-calc'
import { X, Trash2, DollarSign, ArrowLeftRight, Check } from 'lucide-react'
import { useToast } from './ToastProvider'

type Props = {
  tripId: string
  displayCurrency: Currency
  usedCurrencies: Currency[]
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function ExchangeRateModal({ tripId, displayCurrency, usedCurrencies, isOpen, onClose, onUpdate }: Props) {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rateToDelete, setRateToDelete] = useState<string | null>(null)
  const { showToast } = useToast()

  // 用於缺失匯率的輸入框
  const [missingRateInputs, setMissingRateInputs] = useState<Record<string, string>>({})
  // 追蹤每個缺失匯率是否被交換方向
  const [swappedRates, setSwappedRates] = useState<Record<string, boolean>>({})

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
      showToast('載入匯率失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRate(fromCurrency: Currency, toCurrency: Currency, rateValue: string) {
    if (!rateValue || parseFloat(rateValue) <= 0) {
      showToast('請輸入有效的匯率', 'info')
      return
    }

    if (fromCurrency === toCurrency) {
      showToast('來源和目標貨幣不能相同', 'info')
      return
    }

    // 檢查是否已存在相同或反向的匯率設定
    const existingSameDirection = rates.find(
      r => r.from_currency === fromCurrency && r.to_currency === toCurrency
    )
    const existingReverse = rates.find(
      r => r.from_currency === toCurrency && r.to_currency === fromCurrency
    )

    if (existingSameDirection) {
      // 直接更新現有匯率
      setSaving(true)
      try {
        const { error } = await supabase
          .from('exchange_rates')
          .update({ rate: parseFloat(rateValue) })
          .eq('id', existingSameDirection.id)

        if (error) throw error

        const key = `${fromCurrency}-${toCurrency}`
        setMissingRateInputs(prev => ({ ...prev, [key]: '' }))
        showToast('匯率已更新', 'success')
        loadRates()
        onUpdate()
      } catch (error) {
        console.error('更新匯率失敗:', error)
        showToast('更新匯率失敗', 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    if (existingReverse) {
      showToast(`已存在反向匯率 ${existingReverse.from_currency} → ${existingReverse.to_currency}，請先刪除再新增`, 'info')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          trip_id: tripId,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: parseFloat(rateValue)
        })

      if (error) throw error

      // 清除輸入
      const key = `${fromCurrency}-${toCurrency}`
      setMissingRateInputs(prev => ({ ...prev, [key]: '' }))
      loadRates()
      onUpdate()
    } catch (error) {
      console.error('新增匯率失敗:', error)
      showToast('新增匯率失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRate() {
    if (!rateToDelete) return
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .delete()
        .eq('id', rateToDelete)

      if (error) throw error

      showToast('匯率已刪除', 'success')
      setRateToDelete(null)
      loadRates()
      onUpdate()
    } catch (error) {
      console.error('刪除匯率失敗:', error)
      showToast('刪除匯率失敗', 'error')
    }
  }

  if (!isOpen) return null

  // 計算需要的匯率配對
  const requiredRates: Array<{ from: Currency; to: Currency; hasRate: boolean; rate?: ExchangeRate }> = []
  
  // 收集所有不同於顯示幣別的費用幣別
  const uniqueCurrencies = Array.from(new Set(usedCurrencies)).filter(c => c !== displayCurrency)
  
  uniqueCurrencies.forEach(currency => {
    // 檢查是否有直接匯率 (currency -> displayCurrency)
    const directRate = rates.find(
      r => r.from_currency === currency && r.to_currency === displayCurrency
    )
    // 檢查是否有反向匯率 (displayCurrency -> currency)
    const reverseRate = rates.find(
      r => r.from_currency === displayCurrency && r.to_currency === currency
    )
    
    requiredRates.push({
      from: currency,
      to: displayCurrency,
      hasRate: !!(directRate || reverseRate),
      rate: directRate || reverseRate,
    })
  })

  const missingRatesCount = requiredRates.filter(r => !r.hasRate).length

  // 找出不在必要列表中的額外匯率
  const requiredRateIds = new Set(requiredRates.filter(r => r.rate).map(r => r.rate!.id))
  const extraRates = rates.filter(r => !requiredRateIds.has(r.id))

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
              <p className="text-sm text-text3">設定各幣別間的兌換匯率</p>
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

          {/* Required Rates Section */}
          {requiredRates.length > 0 ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">必要的匯率設定</h4>
                {missingRatesCount > 0 ? (
                  <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                    缺少 {missingRatesCount} 個
                  </span>
                ) : (
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已完成
                  </span>
                )}
              </div>
              <p className="text-sm text-text3 mb-3">
                根據費用明細的幣別，計算結算結果需要以下匯率
              </p>
              <div className="space-y-2">
                {requiredRates.map((req,idx) => {
                  const key = `${req.from}-${req.to}`
                  const isSwapped = swappedRates[key] || false
                  const inputKey = isSwapped ? `${req.to}-${req.from}` : key
                  const inputValue = missingRateInputs[inputKey] || ''
                  
                  // 根據交換狀態決定顯示的方向
                  const displayFrom = isSwapped ? req.to : req.from
                  const displayTo = isSwapped ? req.from : req.to
                  
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${
                        req.hasRate
                          ? 'bg-surface border-[var(--border)]'
                          : 'bg-orange-500/5 border-orange-500/20'
                      }`}
                    >
                      {req.hasRate && req.rate ? (
                        // 已設定的匯率 - 顯示數值和刪除按鈕（不需要交換功能）
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-4 h-4 text-white" />
                            </span>
                            <div>
                              <div className="font-mono text-sm font-semibold">
                                <span className="text-accent">{req.rate.from_currency}</span>
                                <span className="mx-1.5 text-text3">→</span>
                                <span className="text-accent">{req.rate.to_currency}</span>
                              </div>
                              <div className="text-xs text-text2 mt-0.5">
                                1 {req.rate.from_currency} = <span className="font-semibold text-text1">{Number(req.rate.rate).toFixed(8)}</span> {req.rate.to_currency}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setRateToDelete(req.rate!.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        // 缺失的匯率 - 顯示輸入框
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              !
                            </span>
                            <div className="font-mono text-sm font-semibold">
                              <span className="text-accent">{displayFrom}</span>
                              <span className="mx-1.5 text-text3">→</span>
                              <span className="text-accent">{displayTo}</span>
                            </div>
                            <button
                              onClick={() => {
                                setSwappedRates(prev => ({ ...prev, [key]: !isSwapped }))
                                if (inputValue && parseFloat(inputValue) > 0) {
                                  const reversedRate = (1 / parseFloat(inputValue)).toFixed(8)
                                  const newInputKey = isSwapped ? key : `${req.to}-${req.from}`
                                  setMissingRateInputs(prev => ({
                                    ...prev,
                                    [inputKey]: '',
                                    [newInputKey]: reversedRate
                                  }))
                                }
                              }}
                              className="ml-auto p-1.5 hover:bg-accent/20 rounded transition-colors"
                              title="交換幣別方向"
                            >
                              <ArrowLeftRight className="w-4 h-4 text-accent" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text3 flex-shrink-0">1 {displayFrom} =</span>
                            <input
                              type="number"
                              step="0.00000001"
                              value={inputValue}
                              onChange={(e) => setMissingRateInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                              placeholder="輸入匯率"
                              className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-surface rounded border border-[var(--border)] focus:ring-2 focus:ring-accent focus:border-transparent"
                            />
                            <span className="text-sm text-text3 flex-shrink-0">{displayTo}</span>
                            <button
                              onClick={() => handleAddRate(displayFrom, displayTo, inputValue)}
                              disabled={saving || !inputValue || parseFloat(inputValue) <= 0}
                              className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/90 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              新增
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center py-8 bg-surface2 rounded-lg">
              <p className="text-text3">目前沒有費用記錄</p>
              <p className="text-sm text-text3 mt-2">新增費用後將顯示必要的匯率設定</p>
            </div>
          )}

          {/* Extra Rates Section */}
          {extraRates.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 text-text3">其他匯率</h4>
              <div className="space-y-2">
                {extraRates.map(rate => (
                  <div
                    key={rate.id}
                    className="flex items-start justify-between p-3 bg-surface2 rounded-lg border border-[var(--border)]"
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        <span className="text-text2">{rate.from_currency}</span>
                        <span className="mx-1.5 text-text3">→</span>
                        <span className="text-text2">{rate.to_currency}</span>
                      </div>
                      <div className="text-xs text-text3 mt-0.5">
                        1 {rate.from_currency} = <span className="font-semibold text-text2">{Number(rate.rate).toFixed(8)}</span> {rate.to_currency}
                      </div>
                    </div>
                    <button
                      onClick={() => setRateToDelete(rate.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Delete Rate Confirmation */}
      {rateToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold">刪除匯率設定</h3>
            </div>
            <p className="text-sm text-text2 mb-6">確定要刪除此匯率設定嗎？此操作無法復原。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRateToDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-surface2 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteRate}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
