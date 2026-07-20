import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Hook ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Global toast function (works outside React tree via event) ─────────────

// eslint-disable-next-line react-refresh/only-export-components
export const toast = (message: string, type: ToastType = 'info', duration?: number) => {
  window.dispatchEvent(new CustomEvent('__toast__', { detail: { message, type, duration } }))
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type, duration }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Listen for global toast events
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type, duration } = (e as CustomEvent).detail
      addToast(message, type, duration)
    }
    window.addEventListener('__toast__', handler)
    return () => window.removeEventListener('__toast__', handler)
  }, [addToast])

  const icons: Record<ToastType, typeof CheckCircle2> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const styles: Record<ToastType, string> = {
    success: 'bg-green-50/70 backdrop-blur-xl border-green-200/60 text-green-800',
    error:   'bg-red-50/70 backdrop-blur-xl border-red-200/60 text-red-800',
    info:    'bg-blue-50/70 backdrop-blur-xl border-blue-200/60 text-blue-800',
    warning: 'bg-yellow-50/70 backdrop-blur-xl border-yellow-200/60 text-yellow-800',
  }

  const iconStyles: Record<ToastType, string> = {
    success: 'text-green-500',
    error:   'text-red-500',
    info:    'text-blue-500',
    warning: 'text-yellow-500',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto',
                'animate-in slide-in-from-right-4 fade-in duration-200',
                styles[t.type]
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[t.type])} />
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/** Legacy no-op — ToastProvider now handles rendering. */
export function ToastContainer() {
  return null
}
