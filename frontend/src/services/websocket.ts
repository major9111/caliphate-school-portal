/**
 * FUGUSAU Portal — WebSocket Service
 * Manages real-time connections for chat and notifications
 */
import { getAccessToken } from '@/utils'

type MessageHandler = (data: any) => void

export class WebSocketService {
  private socket: WebSocket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    const token = getAccessToken()
    const wsUrl = token ? `${this.url}?token=${token}` : this.url

    try {
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        console.log(`✅ WebSocket connected: ${this.url}`)
        this.reconnectAttempts = 0
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const msgType = data.type || 'message'
          const handlers = this.handlers.get(msgType) || []
          handlers.forEach(handler => handler(data))
          // Also call 'any' handlers
          const anyHandlers = this.handlers.get('*') || []
          anyHandlers.forEach(handler => handler(data))
        } catch (e) {
          console.error('WebSocket parse error:', e)
        }
      }

      this.socket.onclose = (event) => {
        console.log(`WebSocket closed (${event.code}):`, event.reason)
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (e) {
      console.error('WebSocket connection failed:', e)
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)
    setTimeout(() => this.connect(), delay)
  }

  send(data: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected. Message not sent:', data)
    }
  }

  on(eventType: string, handler: MessageHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }

  off(eventType: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(eventType) || []
    this.handlers.set(eventType, handlers.filter(h => h !== handler))
  }

  disconnect(): void {
    this.socket?.close(1000, 'Client disconnected')
    this.socket = null
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

// ─── Chat WebSocket Factory ───────────────────────────────────
// Always derive WS URL from window.location so it goes through nginx
// nginx routes /ws/ → daphne:8001 (ASGI)
const WS_BASE = import.meta.env.VITE_WS_URL || (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
})()

export function createChatWebSocket(roomName: string): WebSocketService {
  const service = new WebSocketService(`${WS_BASE}/chat/${roomName}/`)
  service.connect()
  return service
}

export function createNotificationWebSocket(): WebSocketService {
  const service = new WebSocketService(`${WS_BASE}/notifications/`)
  service.connect()
  return service
}
