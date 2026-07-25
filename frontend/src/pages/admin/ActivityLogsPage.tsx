/**
 * FUGUSAU Admin — Activity & Audit Logs
 * Shows all system activity: logins, creates, updates, deletes, security events
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditAPI, securityAPI } from '@/services/api'
import { downloadBlob } from '@/utils'
import toast from 'react-hot-toast'
import { IconSearch, IconDownload, IconFilter } from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta, MobilePager } from '@/components/mobile'

function IconActivity(p: any) {
  return <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconShield(p: any) {
  return <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}

function relativeTime(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' })
}

const ACTION_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  login:    { bg:'bg-primary/15',    text:'text-primary-light', label:'Login'    },
  logout:   { bg:'bg-white/10',      text:'text-white/50',      label:'Logout'   },
  create:   { bg:'bg-blue-500/15',   text:'text-blue-400',      label:'Create'   },
  update:   { bg:'bg-amber-500/15',  text:'text-amber-400',     label:'Update'   },
  delete:   { bg:'bg-red-500/15',    text:'text-red-400',       label:'Delete'   },
  upload:   { bg:'bg-purple-500/15', text:'text-purple-400',    label:'Upload'   },
  download: { bg:'bg-cyan-500/15',   text:'text-cyan-400',      label:'Download' },
  security: { bg:'bg-red-500/15',    text:'text-red-400',       label:'Security' },
  payment:  { bg:'bg-green-500/15',  text:'text-green-400',     label:'Payment'  },
}

function actionStyleFor(action: string) {
  const key = Object.keys(ACTION_STYLE).find(k => action?.toLowerCase().includes(k)) || 'update'
  return ACTION_STYLE[key]
}

function ActionBadge({ action }: { action: string }) {
  const style = actionStyleFor(action)
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} border-current/30 capitalize`}>
      {style.label}
    </span>
  )
}

type LogTab = 'audit' | 'security' | 'logins'

export default function ActivityLogsPage() {
  const [tab, setTab]           = useState<LogTab>('audit')
  const [search, setSearch]     = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage]         = useState(1)

  const { data: auditData, isLoading: loadingAudit } = useQuery<any, any>({
    queryKey: ['audit-logs', search, actionFilter, page],
    queryFn:  () => auditAPI.getLogs({ search: search||undefined, action: actionFilter||undefined, page }),
    enabled:  tab === 'audit',
    refetchInterval: 30000,
  })
  const { data: secData, isLoading: loadingSec } = useQuery<any, any>({
    queryKey: ['security-events-log'],
    queryFn:  () => securityAPI.getEvents({ limit: 100 }),
    enabled:  tab === 'security',
    refetchInterval: 30000,
  })
  const { data: loginData, isLoading: loadingLogins } = useQuery<any, any>({
    queryKey: ['login-attempts-log'],
    queryFn:  securityAPI.getLoginAttempts,
    enabled:  tab === 'logins',
    refetchInterval: 30000,
  })

  const auditLogs  = Array.isArray(auditData?.data) ? auditData.data : (auditData?.data?.results || [])
  const secEvents  = Array.isArray(secData?.data)   ? secData.data   : (secData?.data?.results   || [])
  const loginLogs  = Array.isArray(loginData?.data) ? loginData.data : (loginData?.data?.results  || [])
  const totalPages = auditData?.data?.total_pages || 1

  async function handleExport() {
    try {
      const res = await auditAPI.getLogs({ export: 'csv', search: search||undefined })
      downloadBlob(new Blob([res.data]), 'audit-logs.csv')
    } catch { toast.error('Export not available — configure backend export endpoint') }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <IconActivity size={20} className="text-purple-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Activity & Audit Logs</h2>
            <p className="text-xs text-white/40">All system activity, security events, and login history</p>
          </div>
        </div>
        <button onClick={handleExport}
          className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-all">
          <IconDownload size={14}/> Export CSV
        </button>
      </div>

      {/* Log type tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-full sm:w-fit overflow-x-auto hide-scrollbar">
        {([
          { key: 'audit',    label: 'Audit Log',       count: auditLogs.length  },
          { key: 'security', label: 'Security Events', count: secEvents.length  },
          { key: 'logins',   label: 'Login History',   count: loginLogs.length  },
        ] as { key: LogTab; label: string; count: number }[]).map(t=>(
          <button key={t.key} onClick={()=>{ setTab(t.key); setPage(1) }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
              tab===t.key ? 'bg-purple-500/80 text-white' : 'text-white/45 hover:text-white/70'
            }`}>
            {t.label}
            {t.count > 0 && <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'audit' && (
        <>
          <div className="md:hidden">
            <MobileToolbar
              search={search}
              onSearchChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search user, action, resource…"
              chips={[
                { value: '', label: 'All Actions' },
                ...['login','logout','create','update','delete','upload','download','payment'].map(a => ({ value: a, label: a })),
              ]}
              activeChip={actionFilter}
              onChipChange={(v) => { setActionFilter(v); setPage(1) }}
            />
          </div>
          <div className="hidden md:flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
              <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}
                placeholder="Search by user, action, resource…"
                className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
            </div>
            <select value={actionFilter} onChange={e=>{ setActionFilter(e.target.value); setPage(1) }}
              className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
              <option value="">All Actions</option>
              {['login','logout','create','update','delete','upload','download','payment'].map(a=>(
                <option key={a} value={a} className="capitalize">{a.charAt(0).toUpperCase()+a.slice(1)}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* ── Audit Log ── */}
      {tab === 'audit' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden md:overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden">
            {loadingAudit ? (
              <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-14 text-center">
                <IconActivity size={40} className="text-white/15 mx-auto mb-3"/>
                <p className="text-white/40 text-sm">No audit log entries yet.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2.5">
                <MobileListMeta>{auditLogs.length} entries</MobileListMeta>
                {auditLogs.map((log: any, i: number) => {
                  const style = actionStyleFor(log.action||log.event_type||'')
                  return (
                    <MobileRow
                      key={log.id||i}
                      chevron={false}
                      leading={<IconActivity size={16} />}
                      leadingClassName="bg-purple-500/15 text-purple-400"
                      title={log.user_name||log.user_email||'System'}
                      subtitle={log.resource||log.model||'—'}
                      caption={`${relativeTime(log.timestamp||log.created_at)}${log.ip_address ? ' · '+log.ip_address : ''}`}
                      badge={{ label: style.label, className: `${style.bg} ${style.text}` }}
                    />
                  )
                })}
                <MobilePager page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            {loadingAudit ? (
              <div className="p-8 space-y-3">{Array.from({length:8}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-20 text-center">
                <IconActivity size={48} className="text-white/15 mx-auto mb-4"/>
                <p className="text-white/40">No audit log entries yet.</p>
                <p className="text-white/25 text-xs mt-1">Actions will appear here as users interact with the system.</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                      {['Time','User','Action','Resource','Details','IP'].map(h=>(
                        <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Details','IP'].includes(h)?'hidden lg:table-cell':''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {auditLogs.map((log: any, i: number) => (
                      <tr key={log.id||i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 text-xs text-white/40 whitespace-nowrap">{relativeTime(log.timestamp||log.created_at)}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-semibold text-white truncate max-w-[120px]">{log.user_name||log.user_email||'System'}</p>
                          <p className="text-[10px] text-white/35">{log.user_role||''}</p>
                        </td>
                        <td className="px-5 py-3.5"><ActionBadge action={log.action||log.event_type||''}/></td>
                        <td className="px-5 py-3.5 text-xs text-white/60 truncate max-w-[140px]">{log.resource||log.model||'—'}</td>
                        <td className="px-5 py-3.5 text-xs text-white/40 hidden lg:table-cell truncate max-w-[200px]">{log.details||log.description||'—'}</td>
                        <td className="px-5 py-3.5 text-xs font-mono text-white/30 hidden lg:table-cell">{log.ip_address||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                      className="glass border border-white/[0.1] rounded-lg px-4 py-2 text-xs text-white/60 hover:text-white disabled:opacity-30">← Prev</button>
                    <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
                    <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                      className="glass border border-white/[0.1] rounded-lg px-4 py-2 text-xs text-white/60 hover:text-white disabled:opacity-30">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Security Events ── */}
      {tab === 'security' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden">
            {loadingSec ? (
              <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
            ) : secEvents.length === 0 ? (
              <div className="p-14 text-center">
                <IconShield size={40} className="text-white/15 mx-auto mb-3"/>
                <p className="text-white/40 text-sm">No security events recorded. System is clean.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2.5">
                <MobileListMeta>{secEvents.length} events</MobileListMeta>
                {secEvents.map((e: any, i: number) => {
                  const sev = e.severity || 'low'
                  const sevCls =
                    sev==='critical' ? 'bg-red-500/20 text-red-300' :
                    sev==='high'     ? 'bg-orange-500/20 text-orange-300' :
                    sev==='medium'   ? 'bg-amber-500/20 text-amber-300' :
                                        'bg-white/10 text-white/40'
                  return (
                    <MobileRow
                      key={e.id||i}
                      chevron={false}
                      leading={<IconShield size={16} />}
                      leadingClassName={sevCls}
                      title={e.event_type||e.type||'—'}
                      subtitle={e.description||e.details||e.user_email||e.username||'—'}
                      caption={`${relativeTime(e.timestamp||e.created_at)}${e.ip_address ? ' · '+e.ip_address : ''}`}
                      badge={{ label: sev, className: `capitalize ${sevCls}` }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            {loadingSec ? (
              <div className="p-8 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
            ) : secEvents.length === 0 ? (
              <div className="p-20 text-center">
                <IconShield size={48} className="text-white/15 mx-auto mb-4"/>
                <p className="text-white/40">No security events recorded. System is clean.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    {['Time','Event Type','Severity','IP Address','User','Details'].map(h=>(
                      <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['User','Details'].includes(h)?'hidden lg:table-cell':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {secEvents.map((e: any, i: number) => (
                    <tr key={e.id||i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-xs text-white/40 whitespace-nowrap">{relativeTime(e.timestamp||e.created_at)}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-white">{e.event_type||e.type||'—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          e.severity==='critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          e.severity==='high'     ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                          e.severity==='medium'   ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                                    'bg-white/10 text-white/40 border-white/15'
                        }`}>{e.severity||'low'}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/50">{e.ip_address||'—'}</td>
                      <td className="px-5 py-3.5 text-xs text-white/50 hidden lg:table-cell">{e.user_email||e.username||'—'}</td>
                      <td className="px-5 py-3.5 text-xs text-white/35 hidden lg:table-cell truncate max-w-[200px]">{e.description||e.details||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Login History ── */}
      {tab === 'logins' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden">
            {loadingLogins ? (
              <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
            ) : loginLogs.length === 0 ? (
              <div className="p-14 text-center">
                <IconActivity size={40} className="text-white/15 mx-auto mb-3"/>
                <p className="text-white/40 text-sm">No login history recorded yet.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2.5">
                <MobileListMeta>{loginLogs.length} attempts</MobileListMeta>
                {loginLogs.map((l: any, i: number) => {
                  const success = l.success||l.status==='success'
                  return (
                    <MobileRow
                      key={l.id||i}
                      chevron={false}
                      leading={<IconShield size={16} />}
                      leadingClassName={success ? 'bg-primary/15 text-primary-light' : 'bg-red-500/15 text-red-400'}
                      title={l.user_email||l.email||'—'}
                      subtitle={l.city ? `${l.city}, ${l.country}` : (l.location || l.ip_address || '—')}
                      caption={`${relativeTime(l.timestamp||l.created_at)}${l.user_role||l.role ? ' · '+(l.user_role||l.role) : ''}`}
                      badge={{ label: success ? 'Success' : 'Failed', className: success ? 'bg-primary/15 text-primary-light' : 'bg-red-500/15 text-red-400' }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            {loadingLogins ? (
              <div className="p-8 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
            ) : loginLogs.length === 0 ? (
              <div className="p-20 text-center">
                <IconActivity size={48} className="text-white/15 mx-auto mb-4"/>
                <p className="text-white/40">No login history recorded yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    {['Time','User','IP Address','Location','Device','Status'].map(h=>(
                      <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Location','Device'].includes(h)?'hidden lg:table-cell':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loginLogs.map((l: any, i: number) => (
                    <tr key={l.id||i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-xs text-white/40 whitespace-nowrap">{relativeTime(l.timestamp||l.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold text-white">{l.user_email||l.email||'—'}</p>
                        <p className="text-[10px] text-white/35 capitalize">{l.user_role||l.role||''}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/50">{l.ip_address||'—'}</td>
                      <td className="px-5 py-3.5 text-xs text-white/40 hidden lg:table-cell">{l.city ? `${l.city}, ${l.country}` : l.location || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-white/40 hidden lg:table-cell truncate max-w-[140px]">{l.user_agent||l.device||'—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          l.success||l.status==='success'
                            ? 'bg-primary/15 text-primary-light border-primary/25'
                            : 'bg-red-500/15 text-red-400 border-red-500/25'
                        }`}>
                          {l.success||l.status==='success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
