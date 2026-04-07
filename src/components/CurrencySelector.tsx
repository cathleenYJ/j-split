'use client'

import { useState, useRef, useEffect } from 'react'
import { CURRENCIES, Currency } from '@/lib/split-calc'
import { Search, X } from 'lucide-react'

type Props = {
  value: Currency
  onChange: (currency: Currency) => void
  className?: string
}

export function CurrencySelector({ value, onChange, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 點擊外部關閉
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 開啟時自動聚焦搜尋框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // 過濾貨幣
  const filteredCurrencies = CURRENCIES.filter(cur => 
    cur.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(currency: Currency) {
    onChange(currency)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 選擇按鈕 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg border border-[var(--border2)] bg-surface text-left flex items-center justify-between hover:border-accent transition-colors"
      >
        <span className="font-medium">{value}</span>
        <svg className="w-4 h-4 text-text3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-surface border border-[var(--border2)] rounded-lg shadow-lg max-h-[400px] overflow-hidden flex flex-col">
          {/* 搜尋框 */}
          <div className="p-3 border-b border-[var(--border)] sticky top-0 bg-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text3" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋貨幣代碼..."
                className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface2 rounded"
                >
                  <X className="w-3 h-3 text-text3" />
                </button>
              )}
            </div>
          </div>

          {/* 貨幣列表 */}
          <div className="overflow-y-auto">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => handleSelect(cur)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface2 transition-colors ${
                    cur === value ? 'bg-accent/10 text-accent font-medium' : ''
                  }`}
                >
                  {cur}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-text3">
                找不到「{search}」
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
