import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: NotificationItem[]
}

const TYPE_ICON: Record<string, React.ElementType> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
}

const TYPE_COLOR: Record<string, string> = {
  success: 'text-success-600 dark:text-success-300 bg-success-500/10',
  warning: 'text-warn-600 dark:text-warn-300 bg-warn-500/10',
  danger: 'text-red-600 dark:text-red-400 bg-red-500/10',
  info: 'text-primary-600 dark:text-primary-300 bg-primary-500/10',
}

/** Glass dropdown fed by the same notifications data already queried in the
 * layout — read-only preview + link to the full page, since no
 * mark-as-read endpoint exists on the backend yet. */
export function NotificationPanel({ open, onOpenChange, items }: NotificationPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass-panel absolute right-0 top-[calc(100%+8px)] z-[70] w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="font-display font-semibold text-sm text-[var(--text)]">Notifications</p>
              <Link
                to="/app/notifications"
                onClick={() => onOpenChange(false)}
                className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="py-10 text-center">
                  <Bell className="h-6 w-6 mx-auto text-[var(--text-3)] mb-2" />
                  <p className="text-sm text-[var(--text-3)]">You're all caught up</p>
                </div>
              )}
              {items.slice(0, 6).map((n) => {
                const Icon = TYPE_ICON[n.type] || Info
                return (
                  <Link
                    key={n.id}
                    to="/app/notifications"
                    onClick={() => onOpenChange(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', TYPE_COLOR[n.type] || TYPE_COLOR.info)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13px] leading-snug truncate', n.read ? 'text-[var(--text-2)] font-medium' : 'text-[var(--text)] font-semibold')}>
                        {n.title}
                      </p>
                      <p className="text-[12px] text-[var(--text-3)] truncate mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-[var(--text-3)] mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default NotificationPanel