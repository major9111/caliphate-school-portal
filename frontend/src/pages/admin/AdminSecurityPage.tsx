/**
 * FUGUSAU Admin — Security Dashboard
 * Security events log, blocked IPs management, active sessions, login attempts.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

// ── API shim (security endpoints) ────────────────────────────────────────────
const securityAPI = {
  getStats:        () => api.get('/security/stats/'),
  getEvents:       (p?: object) => api.get('/security/events/', { params: p }),
  getBlockedIPs:   () => api.get('/security/blocked-ips/'),
  unblockIP:       (id: string) => api.post(`/security/blocked-ips/${id}/unblock/`),
  getSessions:     () => api.get('/security/sessions/'),
  terminateSession:(id: string) => api.post(`/security/sessions/${id}/terminate/`),
  getLoginAttempts:() => api.get('/security/login-attempts/'),
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconShield(p: any) {
  return (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IconBan(p: any) {
  return (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}
function IconUnlock(p: any) {
  return (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}
function IconTerminate(p: any) {
  return (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}
function IconSearch(p: any) {
  return (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

const EVENT_SEVERITY: Record<string, string> = {
  critical: 'bg-red-600/15 text-red-300 border-red-600/25',
  high:     'bg-red-500/15 text-red-400 border-red-500/25',
  medium:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  low:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  info:     'bg-white/10 text-white/50 border-white/15',
}

type Tab = 'events' | 'blocked' | 'sessions' | 'attempts'

export default function AdminSecurityPage() {
  const [tab, setTab]               = useState<Tab>('events')
  const [search, setSearch]         = useState('')
  const [severityFilter, setSeverity] = useState('')
  const qc = useQueryClient()

  const { data: statsData }   = useQuery<any, any>({ queryKey: ['sec-stats'],    queryFn: securityAPI.getStats })
  const { data: eventsData,  isLoading: eventsLoading  } = useQuery<any, any>({
    queryKey: ['sec-events', severityFilter],
    queryFn:  () => securityAPI.getEvents({ severity: severityFilter || undefined }),
    enabled: tab === 'events',
  })
  const { data: blockedData, isLoading: blockedLoading } = useQuery<any, any>({
    queryKey: ['sec-blocked'],
    queryFn:  securityAPI.getBlockedIPs,
    enabled: tab === 'blocked',
  })
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<any, any>({
    queryKey: ['sec-sessions'],
    queryFn:  securityAPI.getSessions,
    enabled: tab === 'sessions',
  })
  const { data: attemptsData, isLoading: attemptsLoading } = useQuery<any, any>({
    queryKey: ['sec-attempts'],
    queryFn:  securityAPI.getLoginAttempts,
    enabled: tab === 'attempts',
  })

  const stats    = statsData?.data ?? {}
  const events: any[]   = eventsData?.data?.results   ?? eventsData?.data   ?? []
  const blocked: any[]  = blockedData?.data?.results  ?? blockedData?.data  ?? []
  const sessions: any[] = sessionsData?.data?.results ?? sessionsData?.data ?? []
  const attempts: any[] = attemptsData?.data?.results ?? attemptsData?.data ?? []

  const unblockMutation = useMutation({
    mutationFn: (id: string) => securityAPI.unblockIP(id),
    onSuccess: () => {
      toast.success('IP unblocked')
      qc.invalidateQueries({ queryKey: ['sec-blocked'] })
    },
    onError: () => toast.error('Failed to unblock IP'),
  })

  const terminateMutation = useMutation({
    mutationFn: (id: string) => securityAPI.terminateSession(id),
    onSuccess: () => {
      toast.success('Session terminated')
      qc.invalidateQueries({ queryKey: ['sec-sessions'] })
    },
    onError: () => toast.error('Failed to terminate session'),
  })

  const filteredEvents = events.filter(e =>
    !search ||
    (e.event_type ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.ip_address ?? '').includes(search) ||
    (e.description ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredAttempts = attempts.filter(a =>
    !search ||
    (a.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.ip_address ?? '').includes(search)
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'events',   label: 'Events' },
    { key: 'blocked',  label: 'Blocked IPs' },
    { key: 'sessions', label: 'Active Sessions' },
    { key: 'attempts', label: 'Login Attempts' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#991B1B,#EF4444)' }}>
          <IconShield size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-xs text-white/40">Monitor threats, blocked IPs, and active sessions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Events Today',    value: stats.events_today    ?? 0, accent: '#3B82F6' },
          { label: 'Blocked IPs',     value: stats.blocked_ips     ?? 0, accent: '#EF4444' },
          { label: 'Active Sessions', value: stats.active_sessions ?? 0, accent: '#00A85A' },
          { label: 'Failed Logins',   value: stats.failed_logins   ?? 0, accent: '#D4A017' },
        ].map(s => (
          <div key={s.label} className="glass border border-white/[0.07] rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-extrabold" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-white/50 hover:text-white/80'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar (for events + attempts) */}
      {(tab === 'events' || tab === 'attempts') && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'events' ? 'Search events, IP...' : 'Search email, IP...'}
              className="glass-input w-full pl-8 pr-4 py-2 text-sm rounded-xl" />
          </div>
          {tab === 'events' && (
            <select value={severityFilter} onChange={e => setSeverity(e.target.value)}
              className="glass-input px-3 py-2 text-sm rounded-xl bg-transparent text-white">
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          )}
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-2">
          {eventsLoading ? (
            [1,2,3,4].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-10">
              <IconShield size={32} className="mx-auto mb-2 text-white/20" />
              <p className="text-sm text-white/40">No security events found.</p>
            </div>
          ) : (
            filteredEvents.map((e: any) => (
              <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${EVENT_SEVERITY[e.severity] ?? EVENT_SEVERITY.info}`}>
                      {e.severity}
                    </span>
                    <p className="text-sm font-medium text-white">{e.event_type?.replace(/_/g,' ')}</p>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5">{e.description}</p>
                  <p className="text-[11px] text-white/25 mt-0.5 font-mono">{e.ip_address}</p>
                </div>
                <p className="text-[11px] text-white/30 flex-shrink-0">{e.timestamp?.slice(0,16).replace('T',' ')}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blocked IPs */}
      {tab === 'blocked' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-2">
          {blockedLoading ? (
            [1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)
          ) : blocked.length === 0 ? (
            <div className="text-center py-10">
              <IconBan size={32} className="mx-auto mb-2 text-white/20" />
              <p className="text-sm text-white/40">No IPs currently blocked.</p>
            </div>
          ) : (
            blocked.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/[0.05] border border-red-500/15">
                <div>
                  <p className="text-sm font-bold text-white font-mono">{b.ip_address}</p>
                  <p className="text-[11px] text-white/40">{b.reason} &nbsp;&bull;&nbsp; {b.blocked_at?.slice(0,10)}</p>
                  {b.expires_at && (
                    <p className="text-[11px] text-white/30">Expires: {b.expires_at?.slice(0,10)}</p>
                  )}
                </div>
                <button
                  onClick={() => unblockMutation.mutate(b.id)}
                  disabled={unblockMutation.isPending}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-primary/15 text-primary-light border border-primary/25 hover:bg-primary/25 transition-colors disabled:opacity-50">
                  <IconUnlock /> Unblock
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Active Sessions */}
      {tab === 'sessions' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-2">
          {sessionsLoading ? (
            [1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)
          ) : sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-white/40">No active sessions found.</p>
            </div>
          ) : (
            sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-white">{s.user_email ?? s.user}</p>
                  <p className="text-[11px] text-white/40 font-mono">{s.ip_address} &nbsp;&bull;&nbsp; {s.device ?? 'Unknown device'}</p>
                  <p className="text-[11px] text-white/30">Last active: {s.last_activity?.slice(0,16).replace('T',' ')}</p>
                </div>
                <button
                  onClick={() => terminateMutation.mutate(s.id)}
                  disabled={terminateMutation.isPending}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                  <IconTerminate /> Terminate
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Login Attempts */}
      {tab === 'attempts' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-2">
          {attemptsLoading ? (
            [1,2,3,4].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)
          ) : attempts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-white/40">No login attempts logged.</p>
            </div>
          ) : (
            filteredAttempts.map((a: any, i: number) => (
              <div key={a.id ?? i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                a.successful
                  ? 'bg-primary/[0.04] border-primary/15'
                  : 'bg-red-500/[0.04] border-red-500/15'
              }`}>
                <div>
                  <p className="text-sm font-medium text-white">{a.email}</p>
                  <p className="text-[11px] text-white/40 font-mono">{a.ip_address} &nbsp;&bull;&nbsp; {a.timestamp?.slice(0,16).replace('T',' ')}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  a.successful
                    ? 'bg-primary/15 text-primary-light border-primary/25'
                    : 'bg-red-500/15 text-red-400 border-red-500/25'
                }`}>
                  {a.successful ? 'Success' : 'Failed'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
