/**
 * FUGUSAU Portal — Utility Helpers
 * Centralises all shared helpers so every page can import from '@/utils'
 */

// ── Date / Time ──────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined, short = false): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    if (short) {
      return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return d.toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return '—' }
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—'
  try {
    // timeStr may be "14:30:00" or "14:30"
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  } catch { return timeStr }
}

export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const now  = Date.now()
    const then = new Date(dateStr).getTime()
    if (isNaN(then)) return '—'
    const diff = now - then
    const sec  = Math.floor(diff / 1000)
    const min  = Math.floor(sec / 60)
    const hr   = Math.floor(min / 60)
    const day  = Math.floor(hr / 24)
    if (sec < 60)   return 'just now'
    if (min < 60)   return `${min}m ago`
    if (hr < 24)    return `${hr}h ago`
    if (day < 7)    return `${day}d ago`
    return formatDate(dateStr, true)
  } catch { return '—' }
}

/** How many days until a date (negative = past) */
export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  try {
    const now    = new Date(); now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - now.getTime()) / 86400000)
  } catch { return 0 }
}

// ── String helpers ───────────────────────────────────────────────────────────

/** Get initials from a full name, e.g. "Amina Ibrahim" → "AI" */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0].toUpperCase())
    .slice(0, max)
    .join('')
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Truncate a string to maxLen characters */
export function truncate(str: string, maxLen = 50): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ── Grade helpers ─────────────────────────────────────────────────────────────

const GRADE_COLOR_MAP: Record<string, string> = {
  A:    'text-green-400',
  'A-': 'text-green-400',
  'B+': 'text-blue-400',
  B:    'text-blue-400',
  'B-': 'text-blue-400',
  'C+': 'text-yellow-400',
  C:    'text-yellow-400',
  'C-': 'text-yellow-400',
  D:    'text-orange-400',
  E:    'text-red-400',
  F:    'text-red-500',
}

export function gradeColor(grade: string): string {
  return GRADE_COLOR_MAP[grade] || 'text-white/50'
}

export function gradeHex(grade: string): string {
  const map: Record<string, string> = {
    A: '#00A85A', 'A-': '#00A85A',
    'B+': '#3B82F6', B: '#3B82F6', 'B-': '#3B82F6',
    'C+': '#D4A017', C: '#D4A017', 'C-': '#D4A017',
    D: '#F97316', E: '#EF4444', F: '#EF4444',
  }
  return map[grade] || '#888'
}

// ── Number / currency helpers ─────────────────────────────────────────────────

export function formatNaira(amount: number | string | null | undefined): string {
  if (amount == null) return '₦0'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(n)) return '₦0'
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0'
  return n.toLocaleString('en-NG')
}

// ── Token helpers (for auth interceptor) ─────────────────────────────────────

const STORAGE_KEY = 'fugusau-auth'

function getPersistedState(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)?.state || {}
  } catch { return {} }
}

export function getAccessToken(): string | null {
  return getPersistedState().accessToken || null
}

export function getRefreshToken(): string | null {
  return getPersistedState().refreshToken || null
}

export function patchPersistedAccessToken(newToken: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.state) {
      parsed.state.accessToken = newToken
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch { /* silent */ }
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Download a blob response as a file */
export function downloadBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/** Safe JSON parse — returns null on failure */
export function safeJSON<T = any>(str: string | null | undefined): T | null {
  if (!str) return null
  try { return JSON.parse(str) as T } catch { return null }
}
