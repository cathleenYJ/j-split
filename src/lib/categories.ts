import {
  UtensilsCrossed,
  Car,
  Hotel,
  Ticket,
  ShoppingBag,
  Plane,
  HeartPulse,
  PartyPopper,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react'

export type CategoryKey =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'sightseeing'
  | 'shopping'
  | 'flight'
  | 'health'
  | 'entertainment'
  | 'others'

export type Category = {
  key: CategoryKey
  label: string
  icon: LucideIcon
  color: string        // Tailwind bg color
  textColor: string    // Tailwind text color
  hex: string          // For SVG chart
}

export const CATEGORIES: Category[] = [
  { key: 'food',          label: '餐飲',  icon: UtensilsCrossed, color: 'bg-orange-100',  textColor: 'text-orange-600',  hex: '#f97316' },
  { key: 'transport',     label: '交通',  icon: Car,             color: 'bg-blue-100',    textColor: 'text-blue-600',    hex: '#3b82f6' },
  { key: 'accommodation', label: '住宿',  icon: Hotel,           color: 'bg-purple-100',  textColor: 'text-purple-600',  hex: '#a855f7' },
  { key: 'sightseeing',   label: '景點',  icon: Ticket,          color: 'bg-green-100',   textColor: 'text-green-600',   hex: '#22c55e' },
  { key: 'shopping',      label: '購物',  icon: ShoppingBag,     color: 'bg-pink-100',    textColor: 'text-pink-600',    hex: '#ec4899' },
  { key: 'flight',        label: '機票',  icon: Plane,           color: 'bg-sky-100',     textColor: 'text-sky-600',     hex: '#0ea5e9' },
  { key: 'health',        label: '醫療',  icon: HeartPulse,      color: 'bg-red-100',     textColor: 'text-red-600',     hex: '#ef4444' },
  { key: 'entertainment', label: '娛樂',  icon: PartyPopper,     color: 'bg-yellow-100',  textColor: 'text-yellow-600',  hex: '#eab308' },
  { key: 'others',        label: '其他',  icon: MoreHorizontal,  color: 'bg-gray-100',    textColor: 'text-gray-500',    hex: '#9ca3af' },
]

export const CATEGORY_MAP: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c])
) as Record<CategoryKey, Category>

export function getCategoryByKey(key: string | null | undefined): Category {
  return CATEGORY_MAP[key as CategoryKey] ?? CATEGORY_MAP['others']
}
