'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastCtx = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const styles: Record<ToastType, string> = {
    success: 'border-green-700 bg-green-700 text-white',
    error: 'border-red-700 bg-red-700 text-white',
    info: 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]',
  }

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-200 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--bg)] flex-shrink-0" />,
  }

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-0 right-0 flex flex-col items-center gap-2 z-[9999] pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-toast flex items-center gap-3 w-full max-w-sm px-4 py-3 rounded-xl border shadow-lg pointer-events-auto ${styles[t.type]}`}
          >
            {icons[t.type]}
            <p className="text-sm font-medium flex-1">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
