// 分帳計算邏輯
export const CURRENCIES = [
  'AFN', 'ALL', 'DZD', 'AOA', 'ARS', 'AMD', 'AWG', 'AUD', 'AZN', 'BSD',
  'BHD', 'BDT', 'BBD', 'BYR', 'BZD', 'BMD', 'BTN', 'BOB', 'BAM', 'BWP',
  'BRL', 'BND', 'BGN', 'BIF', 'KHR', 'CAD', 'CVE', 'KYD', 'XOF', 'XAF',
  'XPF', 'CLP', 'CNY', 'COP', 'KMF', 'CDF', 'CRC', 'HRK', 'CUC', 'CUP',
  'CZK', 'DKK', 'DJF', 'DOP', 'XCD', 'EGP', 'ERN', 'ETB', 'EUR', 'FKP',
  'FJD', 'GMD', 'GEL', 'GHS', 'GIP', 'GTQ', 'GNF', 'GYD', 'HTG', 'HNL',
  'HKD', 'HUF', 'ISK', 'INR', 'IDR', 'IRR', 'IQD', 'ILS', 'JMD', 'JPY',
  'JOD', 'KZT', 'KES', 'KWD', 'KGS', 'LAK', 'LVL', 'LBP', 'LSL', 'LRD',
  'LYD', 'LTL', 'MOP', 'MKD', 'MGA', 'MWK', 'MYR', 'MVR', 'MRO', 'MUR',
  'MXN', 'MDL', 'MNT', 'MAD', 'MZN', 'MMK', 'NAD', 'NPR', 'ANG', 'TWD',
  'NZD', 'NIO', 'NGN', 'KPW', 'NOK', 'OMR', 'PKR', 'PAB', 'PGK', 'PYG',
  'PEN', 'PHP', 'PLN', 'GBP', 'QAR', 'RON', 'RUB', 'RWF', 'SHP', 'WST',
  'STD', 'SAR', 'RSD', 'SCR', 'SLL', 'SGD', 'SBD', 'SOS', 'ZAR', 'KRW',
  'SSP', 'LKR', 'SDG', 'SRD', 'SZL', 'SEK', 'CHF', 'SYP', 'TJS', 'TZS',
  'THB', 'TOP', 'TTD', 'TND', 'TRY', 'TMT', 'UGX', 'UAH', 'AED', 'USD',
  'UYU', 'UZS', 'VUV', 'VEF', 'VND', 'YER', 'ZMK', 'ZWL'
] as const

export type Currency = typeof CURRENCIES[number]

export type RateRow = {
  from: Currency
  to: Currency
  rate: number
}

// 建立完整匯率對照表（使用 Floyd-Warshall 演算法）
export function buildRateMap(rates: RateRow[]): Record<Currency, Record<Currency, number | null>> {
  const map: Record<string, Record<string, number | null>> = {}
  
  // 初始化
  CURRENCIES.forEach(a => {
    map[a] = {}
    CURRENCIES.forEach(b => {
      map[a][b] = a === b ? 1 : null
    })
  })

  // 填入已知匯率
  rates.forEach(r => {
    if (r.rate > 0) {
      map[r.from][r.to] = r.rate
      map[r.to][r.from] = 1 / r.rate
    }
  })

  // 推算其他匯率（3次迭代通常足夠）
  for (let k = 0; k < 3; k++) {
    CURRENCIES.forEach(a => {
      CURRENCIES.forEach(b => {
        if (map[a][b] === null) {
          CURRENCIES.forEach(c => {
            if (map[a][c] !== null && map[c][b] !== null) {
              map[a][b] = map[a][c]! * map[c][b]!
            }
          })
        }
      })
    })
  }

  return map as Record<Currency, Record<Currency, number | null>>
}

// 匯率轉換
export function convert(amount: number, from: Currency, to: Currency, rateMap: ReturnType<typeof buildRateMap>): number | null {
  const rate = rateMap[from][to]
  if (rate === null) return null
  return amount * rate
}

// 格式化金額（使用國際標準 Intl API）
export function formatCurrency(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
  } catch (error) {
    // 如果貨幣代碼無效，回退到簡單格式
    return `${currency} ${Math.abs(amount).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
}

// 計算餘額和轉帳方案
export type Balance = Record<string, number>
export type Settlement = {
  from: string
  to: string
  amount: number
}

export function calculateBalances(
  expenses: Array<{ amount: number; currency: Currency; payer_id: string; splitWith: string[] }>,
  baseCurrency: Currency,
  rateMap: ReturnType<typeof buildRateMap>
): { balances: Balance; hasError: boolean } {
  const balance: Balance = {}
  let hasError = false

  expenses.forEach(exp => {
    const baseAmount = convert(exp.amount, exp.currency, baseCurrency, rateMap)
    if (baseAmount === null) {
      hasError = true
      return
    }

    const share = baseAmount / exp.splitWith.length

    exp.splitWith.forEach(userId => {
      if (!balance[userId]) balance[userId] = 0
      balance[userId] -= share
    })

    if (!balance[exp.payer_id]) balance[exp.payer_id] = 0
    balance[exp.payer_id] += baseAmount
  })

  return { balances: balance, hasError }
}

export function calculateSettlements(balances: Balance, baseCurrency: Currency): Settlement[] {
  const threshold = baseCurrency === 'KRW' ? 50 : baseCurrency === 'JPY' ? 5 : 0.5

  // 應付的人
  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < -threshold)
    .map(([userId, bal]) => ({ userId, amount: -bal }))
    .sort((a, b) => a.amount - b.amount)

  // 應收的人
  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > threshold)
    .map(([userId, bal]) => ({ userId, amount: bal }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let di = 0, ci = 0

  while (di < debtors.length && ci < creditors.length) {
    const amt = Math.min(debtors[di].amount, creditors[ci].amount)
    if (amt > threshold) {
      settlements.push({
        from: debtors[di].userId,
        to: creditors[ci].userId,
        amount: amt,
      })
    }
    debtors[di].amount -= amt
    creditors[ci].amount -= amt
    if (debtors[di].amount < threshold) di++
    if (creditors[ci].amount < threshold) ci++
  }

  return settlements
}
