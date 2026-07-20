/**
 * Real-time notifications via Server-Sent Events (SSE).
 *
 * The backend streams events on /api/v1/system/stream.
 * Falls back silently if the connection fails (dev without streaming).
 */
import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export interface RealtimeEvent {
  type: 'notification' | 'attendance_update' | 'payment' | 'announcement' | 'ping'
  data: Record<string, unknown>
}

export function useRealtime(enabled = true) {
  const qc = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token || !enabled) return

    try {
      const url = `${API_BASE}/system/stream?token=${encodeURIComponent(token)}`
      const es = new EventSource(url)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data)
          handleEvent(event, qc)
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Reconnect after 10 seconds
        reconnectTimer.current = setTimeout(connect, 10_000)
      }
    } catch {
      // SSE not supported or blocked — silent fallback
    }
  }, [enabled, qc])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [connect])
}

function handleEvent(event: RealtimeEvent, qc: ReturnType<typeof useQueryClient>) {
  switch (event.type) {
    case 'notification':
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast(String(event.data.message || 'New notification'), 'info')
      break
    case 'attendance_update':
      qc.invalidateQueries({ queryKey: ['attendance-records'] })
      qc.invalidateQueries({ queryKey: ['attendance-stats'] })
      break
    case 'payment':
      qc.invalidateQueries({ queryKey: ['finance-stats'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      break
    case 'announcement':
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast(String(event.data.title || 'New announcement'), 'info')
      break
    case 'ping':
      break
  }
}
