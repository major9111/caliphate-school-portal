import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

  // Neutral glass surface with a colored left accent + icon — reads calmer
  // and more premium than a fully-tinted background per type.
  const accentBorder: Record<ToastType, string> = {
    success: 'border-l-success-500',
    error: 'border-l-red-500',
    info: 'border-l-primary-500',
    warning: 'border-l-warn-500',
  }

  const iconStyles: Record<ToastType, string> = {
    success: 'text-success-600 dark:text-success-300',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-primary-600 dark:text-primary-300',
    warning: 'text-warn-600 dark:text-warn-300',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className={cn(
                  'glass-panel flex items-start gap-3 p-4 rounded-xl border-l-4 pointer-events-auto',
                  accentBorder[t.type]
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[t.type])} />
                <span className="text-sm font-medium flex-1 text-[var(--text)]">{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss notification"
                  className="flex-shrink-0 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/** Legacy no-op — ToastProvider now handles rendering. */
export function ToastContainer() {
  return null
}
