import { useState, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const event = new CustomEvent('toast', { detail: { message, type } })
  window.dispatchEvent(event)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail
      const id = Math.random().toString(36).substr(2, 9)
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    }
    window.addEventListener('toast', handler)
    return () => window.removeEventListener('toast', handler)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg min-w-[300px] ${
              t.type === 'success' ? 'bg-green-50 border border-green-200' :
              t.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
            <span className={`text-sm font-medium ${
              t.type === 'success' ? 'text-green-800' :
              t.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>{t.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function ToastContainer() {
  return null
}
