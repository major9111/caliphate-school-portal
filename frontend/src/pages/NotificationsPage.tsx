/**
 * FUGUSAU Portal — Notifications Page (Redesigned)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '@/services/api'
import { relativeTime } from '@/utils'
import type { Notification } from '@/types'
import toast from 'react-hot-toast'
import {
  IconNotifications, IconWarning, IconCheck, IconResults,
  IconFees, IconCalendar, IconAI, IconX,
} from '@/components/icons'

// Map notification type → SVG icon + accent color
const TYPE_META: Record<string, { Icon: React.FC<any>; color: string; bg: string; border: string }> = {
  info:    { Icon: IconNotifications, color: '#3B82F6', bg: 'bg-blue-500/15',   border: 'border-blue-500/20'   },
  warning: { Icon: IconWarning,       color: '#D4A017', bg: 'bg-amber-500/15',  border: 'border-amber-500/20'  },
  success: { Icon: IconCheck,         color: '#00A85A', bg: 'bg-primary/15',    border: 'border-primary/20'    },
  danger:  { Icon: IconX,             color: '#EF4444', bg: 'bg-red-500/15',    border: 'border-red-500/20'    },
}

// Determine icon from notification title keywords
function resolveIcon(n: Notification) {
  const t = (n.title + n.message).toLowerCase()
  if (t.includes('result') || t.includes('grade'))   return IconResults
  if (t.includes('fee') || t.includes('payment'))    return IconFees
  if (t.includes('exam') || t.includes('timetable')) return IconCalendar
  if (t.includes('ai') || t.includes('advisor'))     return IconAI
  return TYPE_META[n.notif_type]?.Icon || IconNotifications
}

function NotifCard({ n, onRead, onNavigate }: {
  n: Notification
  onRead: (id: string) => void
  onNavigate: (url?: string) => void
}) {
  const meta  = TYPE_META[n.notif_type] || TYPE_META.info
  const DynIcon = resolveIcon(n)

  return (
    <div
      onClick={() => { if (!n.is_read) onRead(n.id); onNavigate(n.action_url) }}
      className={`
        glass glass-hover border rounded-2xl p-5 cursor-pointer flex gap-4
        ${n.is_read ? 'opacity-55' : ''} ${meta.border}
      `}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} border ${meta.border}`}>
        <DynIcon size={18} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold leading-snug ${n.is_read ? 'text-white/60' : 'text-white'}`}>
            {n.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!n.is_read && <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: meta.color }} />}
            <p className="text-[11px] text-white/30 whitespace-nowrap">{relativeTime(n.created_at)}</p>
          </div>
        </div>
        <p className="text-xs text-white/45 mt-1 leading-relaxed">{n.message}</p>
        <p className="text-[10px] text-white/25 mt-2">From: {n.created_by_name}</p>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['notifications'],
    queryFn: notificationsAPI.getAll,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: notificationsAPI.markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read.')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications: Notification[] = data?.data?.results || data?.data || []
  const unread = notifications.filter(n => !n.is_read).length

  function handleNavigate(url?: string) {
    if (!url) return
    try {
      const u = new URL(url, window.location.origin)
      if (u.origin === window.location.origin) navigate(u.pathname + u.search)
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch { navigate(url) }
  }

  // Group: today / earlier
  const now      = new Date()
  const isToday  = (d: string) => new Date(d).toDateString() === now.toDateString()
  const today    = notifications.filter(n => isToday(n.created_at))
  const earlier  = notifications.filter(n => !isToday(n.created_at))

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <IconNotifications size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Notifications</h2>
            <p className="text-xs text-white/40">
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </p>
          </div>
        </div>

        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-2 text-sm text-primary-light/70 hover:text-primary-light transition-colors disabled:opacity-40 font-semibold"
          >
            <IconCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Unread count pill */}
      {unread > 0 && (
        <div className="glass border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse" />
          <span className="text-sm text-white/60">
            You have <span className="font-bold text-white">{unread}</span> unread {unread === 1 ? 'notification' : 'notifications'}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-24 skeleton" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-24 text-center">
          <IconNotifications size={48} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40">No notifications yet. You are all caught up!</p>
        </div>
      ) : (
        <>
          {today.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 px-1">Today</div>
              {today.map(n => (
                <NotifCard key={n.id} n={n} onRead={markRead.mutate} onNavigate={handleNavigate} />
              ))}
            </div>
          )}
          {earlier.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 px-1">Earlier</div>
              {earlier.map(n => (
                <NotifCard key={n.id} n={n} onRead={markRead.mutate} onNavigate={handleNavigate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
