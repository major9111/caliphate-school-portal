/**
 * FUGUSAU — Security Dashboard
 * Tabs: Overview · Live Scan · Firewall Rules · Events · Blocked IPs · Sessions
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityAPI } from '@/services/api'
import { useChartTheme } from '@/hooks/useChartTheme'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import { MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

/* ── Icons ──────────────────────────────────────────────────── */
const Ic = {
  Shield:  (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap:     (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Block:   (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  Plus:    (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Upload:  (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  Trash:   (p:any)=><svg width={p.size||13} height={p.size||13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Edit:    (p:any)=><svg width={p.size||13} height={p.size||13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  X:       (p:any)=><svg width={p.size||13} height={p.size||13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Wifi:    (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  Cpu:     (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Warn:    (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Check:   (p:any)=><svg width={p.size||13} height={p.size||13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>,
  File:    (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
}

const inputCls  = "glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
const selectCls = inputCls + " bg-transparent"

const ACTION_COLOR: Record<string,string> = {
  allow: '#00A85A', deny: '#EF4444', log: '#D4A017'
}
const ACTION_CLS: Record<string,string> = {
  allow: 'bg-primary/15 text-primary-light border-primary/25',
  deny:  'bg-red-500/15 text-red-400 border-red-500/25',
  log:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

/* ── Modal ────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}>
      <div className="glass border border-white/[0.1] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h3 className="font-extrabold text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/10 text-white/60"><Ic.X/></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const EMPTY_RULE = { name:'', description:'', action:'deny', protocol:'any', direction:'inbound', source_ip:'', dest_ip:'', source_port:'', dest_port:'', priority:'100' }

/* ════════════════════════════════════════════════════════════ */
export default function SecurityDashboardPage() {
  const chart = useChartTheme()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'overview'|'livescan'|'firewall'|'events'|'blocked'|'sessions'>('overview')
  const [ruleModal, setRuleModal]     = useState<null|'add'|any>(null)
  const [importModal, setImportModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<null|{id:string;name:string}>(null)
  const [rForm, setRForm]             = useState({...EMPTY_RULE})
  const [importText, setImportText]   = useState('')
  const [importFile, setImportFile]   = useState<File|null>(null)
  const [liveData, setLiveData]       = useState<any[]>([])
  const [liveLatest, setLiveLatest]   = useState<any>(null)
  const [liveRunning, setLiveRunning] = useState(false)
  const intervalRef = useRef<any>(null)

  /* ── Queries ────────────────────────────────────────────── */
  const { data: statsData }   = useQuery<any, any>({ queryKey:['security-stats'],   queryFn: securityAPI.getStats,        refetchInterval: 30000 })
  const { data: eventsData }  = useQuery<any, any>({ queryKey:['security-events'],  queryFn: ()=>securityAPI.getEvents(), enabled: tab==='events' })
  const { data: blockedData } = useQuery<any, any>({ queryKey:['blocked-ips'],      queryFn: securityAPI.getBlockedIPs,   enabled: tab==='blocked' })
  const { data: sessionsData }= useQuery<any, any>({ queryKey:['user-sessions'],    queryFn: securityAPI.getSessions,     enabled: tab==='sessions' })
  const { data: firewallData, isLoading: fwLoad } = useQuery<any, any>({
    queryKey:['firewall-rules'], queryFn: securityAPI.getFirewallRules, enabled: tab==='firewall'
  })

  const stats    = statsData?.data    || {}
  const events   = eventsData?.data?.results  || eventsData?.data  || []
  const blocked  = blockedData?.data?.results || blockedData?.data || []
  const sessions = sessionsData?.data?.results|| sessionsData?.data|| []
  const rules    = firewallData?.data?.results|| firewallData?.data|| []

  /* ── Live Scan polling ──────────────────────────────────── */
  const fetchLive = useCallback(async () => {
    try {
      const res = await securityAPI.getLiveScan()
      const d   = res.data
      setLiveLatest(d)
      setLiveData(prev => {
        const next = [...(prev.length > 30 ? prev.slice(-29) : prev), {
          time:    new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit',second:'2-digit'}),
          cpu:     d.system?.cpu_percent    || 0,
          memory:  d.system?.memory_percent || 0,
          threats: d.threats?.events_last_60s || 0,
          disk:    d.system?.disk_percent   || 0,
        }]
        return next
      })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (tab === 'livescan' && liveRunning) {
      fetchLive()
      intervalRef.current = setInterval(fetchLive, 3000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [tab, liveRunning, fetchLive])

  useEffect(() => {
    if (tab === 'livescan') { setLiveRunning(true); setLiveData([]) }
    else setLiveRunning(false)
  }, [tab])

  /* ── Firewall mutations ─────────────────────────────────── */
  const inv = () => qc.invalidateQueries({ queryKey:['firewall-rules'] })

  const createRule = useMutation({
    mutationFn: (d:any) => securityAPI.createFirewallRule(d),
    onSuccess: () => { toast.success('Rule created!'); inv(); setRuleModal(null) },
    onError:   (e:any) => toast.error(e?.response?.data?.name?.[0]||'Failed to create rule.'),
  })
  const updateRule = useMutation({
    mutationFn: ({id,...d}:any) => securityAPI.updateFirewallRule(id,d),
    onSuccess: () => { toast.success('Rule updated!'); inv(); setRuleModal(null) },
    onError:   () => toast.error('Failed to update rule.'),
  })
  const deleteRule = useMutation({
    mutationFn: (id:string) => securityAPI.deleteFirewallRule(id),
    onSuccess: () => { toast.success('Rule deleted.'); inv(); setDeleteConfirm(null) },
    onError:   () => toast.error('Failed to delete rule.'),
  })
  const toggleRule = useMutation({
    mutationFn: (id:string) => securityAPI.toggleFirewallRule(id),
    onSuccess: () => inv(),
    onError:   () => toast.error('Toggle failed.'),
  })
  const importRules = useMutation({
    mutationFn: (rules:any[]) => securityAPI.importFirewallRules(rules),
    onSuccess: (res:any) => {
      toast.success(`${res.data.created} rule${res.data.created!==1?'s':''} imported!`)
      inv(); setImportModal(false); setImportText(''); setImportFile(null)
    },
    onError: () => toast.error('Import failed — check JSON format.'),
  })

  const unblockMut = useMutation({
    mutationFn: (id:string) => securityAPI.unblockIP(id),
    onSuccess: () => { toast.success('IP unblocked.'); qc.invalidateQueries({queryKey:['blocked-ips']}) },
  })

  /* ── Rule form helpers ──────────────────────────────────── */
  const openAdd  = () => { setRForm({...EMPTY_RULE}); setRuleModal('add') }
  const openEdit = (r:any) => {
    setRForm({ name:r.name, description:r.description||'', action:r.action, protocol:r.protocol,
      direction:r.direction, source_ip:r.source_ip||'', dest_ip:r.dest_ip||'',
      source_port:r.source_port||'', dest_port:r.dest_port||'', priority:String(r.priority) })
    setRuleModal(r)
  }
  const submitRule = () => {
    const payload = {...rForm, priority: parseInt(rForm.priority)||100}
    if (ruleModal==='add') createRule.mutate(payload)
    else updateRule.mutate({id:ruleModal.id,...payload})
  }

  /* ── JSON/CSV Import handler ────────────────────────────── */
  const handleImport = async () => {
    let rules: any[] = []
    try {
      if (importFile) {
        const text = await importFile.text()
        if (importFile.name.endsWith('.csv')) {
          const lines  = text.split('\n').filter(Boolean)
          const header = lines[0].split(',').map(h => h.trim().toLowerCase())
          rules = lines.slice(1).map(line => {
            const vals = line.split(',')
            return Object.fromEntries(header.map((h,i) => [h, vals[i]?.trim()]))
          })
        } else {
          const parsed = JSON.parse(text)
          rules = Array.isArray(parsed) ? parsed : parsed.rules || []
        }
      } else {
        const parsed = JSON.parse(importText)
        rules = Array.isArray(parsed) ? parsed : parsed.rules || []
      }
      if (!rules.length) { toast.error('No rules found in file.'); return }
      importRules.mutate(rules)
    } catch {
      toast.error('Invalid JSON or CSV format.')
    }
  }

  /* ── Gauge component ────────────────────────────────────── */
  const Gauge = ({ value, label, color, unit='%' }: any) => {
    const pct = Math.min(100, Math.max(0, value))
    return (
      <div className="glass border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/40">{label}</span>
          <span className="font-extrabold text-lg" style={{color}}>{pct.toFixed(1)}{unit}</span>
        </div>
        <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{width:`${pct}%`, background:`linear-gradient(90deg,${color}88,${color})`}}/>
        </div>
        <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
          <div className="h-full rounded-full animate-pulse"
            style={{width:`${pct}%`, background:color, opacity:0.3}}/>
        </div>
      </div>
    )
  }

  const TABS = [
    { id:'overview', label:'Overview' },
    { id:'livescan', label:'Live Scan' },
    { id:'firewall', label:'Firewall Rules' },
    { id:'events',   label:'Events' },
    { id:'blocked',  label:'Blocked IPs' },
    { id:'sessions', label:'Sessions' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Ic.Shield size={20} className="text-red-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Security Dashboard</h2>
            <p className="text-xs text-white/40">Real-time threat monitoring & firewall management</p>
          </div>
        </div>
        {tab==='firewall' && (
          <div className="flex gap-2">
            <button onClick={() => setImportModal(true)}
              className="glass border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm font-bold text-white/60 hover:text-white flex items-center gap-2 transition-colors">
              <Ic.Upload size={14}/> Import Rules
            </button>
            <button onClick={openAdd}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2">
              <Ic.Plus size={14}/> Add Rule
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab===t.id ? 'bg-primary text-white' : 'text-white/45 hover:text-white/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────── */}
      {tab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:'Total Events',     value: stats.total_events     || 0, accent:'#EF4444' },
              { label:'Blocked IPs',      value: stats.blocked_ips      || 0, accent:'#F97316' },
              { label:'Active Sessions',  value: stats.active_sessions  || 0, accent:'#3B82F6' },
              { label:'Failed Logins 24h',value: stats.failed_logins_24h|| 0, accent:'#D4A017' },
            ].map(({label,value,accent}) => (
              <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
                <div className="text-xs text-white/40 mb-1">{label}</div>
                <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
              </div>
            ))}
          </div>
          {stats.events_by_hour && (
            <div className="glass border border-white/[0.07] rounded-2xl p-5">
              <h3 className="font-bold text-sm text-white mb-4">Security Events (Last 24h)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.events_by_hour}>
                  <defs>
                    <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                  <XAxis dataKey="hour" stroke={chart.axis} tick={{fontSize:11}}/>
                  <YAxis stroke={chart.axis} tick={{fontSize:11}}/>
                  <Tooltip contentStyle={{background:chart.tooltipBg,border:`1px solid ${chart.tooltipBorder}`,borderRadius:12}}/>
                  <Area type="monotone" dataKey="count" stroke="#EF4444" fill="url(#evGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── LIVE SCAN ────────────────────────────────────────── */}
      {tab==='livescan' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${liveRunning ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`}/>
            <span className="text-sm text-white/60">{liveRunning ? 'Live — updating every 3s' : 'Paused'}</span>
            <button onClick={() => setLiveRunning(v => !v)}
              className={`ml-auto rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
                liveRunning
                  ? 'glass border border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'btn-primary text-white'
              }`}>
              {liveRunning ? 'Pause' : 'Start Live Scan'}
            </button>
          </div>

          {/* Gauges */}
          {liveLatest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Gauge value={liveLatest.system?.cpu_percent}    label="CPU Usage"    color="#3B82F6"/>
              <Gauge value={liveLatest.system?.memory_percent} label="Memory"       color="#8B5CF6"/>
              <Gauge value={liveLatest.system?.disk_percent}   label="Disk Usage"   color="#D4A017"/>
              <Gauge value={Math.min(100,(liveLatest.threats?.events_last_60s||0)*10)} label="Threat Level" color="#EF4444"/>
            </div>
          )}

          {/* Threat stat cards */}
          {liveLatest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Events (60s)',   value: liveLatest.threats?.events_last_60s || 0, color:'#EF4444' },
                { label:'Blocked IPs',    value: liveLatest.threats?.blocked_ips     || 0, color:'#F97316' },
                { label:'Failed Logins/h',value: liveLatest.threats?.failed_logins_1h|| 0, color:'#D4A017' },
                { label:'Active Sessions',value: liveLatest.threats?.active_sessions || 0, color:'#3B82F6' },
              ].map(({label,value,color}) => (
                <div key={label} className="glass border border-white/[0.07] rounded-xl p-4">
                  <p className="text-xs text-white/40 mb-1">{label}</p>
                  <p className="text-2xl font-extrabold" style={{color}}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Live chart */}
          {liveData.length > 1 && (
            <div className="glass border border-white/[0.07] rounded-2xl p-5">
              <h3 className="font-bold text-sm text-white mb-4">Real-time System Metrics</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={liveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                  <XAxis dataKey="time" stroke={chart.axis} tick={{fontSize:10}}/>
                  <YAxis stroke={chart.axis} tick={{fontSize:10}} domain={[0,100]}/>
                  <Tooltip contentStyle={{background:chart.tooltipBg,border:`1px solid ${chart.tooltipBorder}`,borderRadius:12,fontSize:12}}/>
                  <Legend wrapperStyle={{fontSize:12,color: chart.legend}}/>
                  <Line type="monotone" dataKey="cpu"     stroke="#3B82F6" strokeWidth={2} dot={false} name="CPU %"/>
                  <Line type="monotone" dataKey="memory"  stroke="#8B5CF6" strokeWidth={2} dot={false} name="Memory %"/>
                  <Line type="monotone" dataKey="disk"    stroke="#D4A017" strokeWidth={2} dot={false} name="Disk %"/>
                  <Line type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2.5} dot={false} name="Threats/min" yAxisId={0}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {liveData.length === 0 && liveRunning && (
            <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
              <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-white/40 text-sm">Collecting data…</p>
            </div>
          )}

          {!liveRunning && liveData.length === 0 && (
            <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
              <Ic.Cpu size={40} className="text-white/10 mx-auto mb-4"/>
              <p className="text-white/40 mb-4">Click Start Live Scan to begin real-time monitoring</p>
            </div>
          )}

          {/* System info */}
          {liveLatest && (
            <div className="glass border border-white/[0.07] rounded-2xl p-5">
              <h3 className="font-bold text-sm text-white mb-3">System Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['Memory Used',    `${liveLatest.system?.memory_used_gb} / ${liveLatest.system?.memory_total_gb} GB`],
                  ['Disk Free',      `${liveLatest.system?.disk_free_gb} GB`],
                  ['Processes',      liveLatest.system?.process_count],
                  ['Net Sent',       `${((liveLatest.system?.net_bytes_sent||0)/1e6).toFixed(1)} MB`],
                  ['Net Received',   `${((liveLatest.system?.net_bytes_recv||0)/1e6).toFixed(1)} MB`],
                  ['Open Events',    liveLatest.threats?.open_events],
                ].map(([label,value]) => (
                  <div key={String(label)} className="glass rounded-xl px-4 py-3">
                    <p className="text-white/35">{label}</p>
                    <p className="font-bold text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIREWALL RULES ───────────────────────────────────── */}
      {tab==='firewall' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label:'Total Rules', value: rules.length,                                   color:'#8B5CF6' },
              { label:'Active',      value: rules.filter((r:any) => r.is_active).length,   color:'#00A85A' },
              { label:'Deny Rules',  value: rules.filter((r:any) => r.action==='deny').length, color:'#EF4444' },
            ].map(({label,value,color}) => (
              <div key={label} className="glass border border-white/[0.07] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${color},transparent)`}}/>
                <p className="text-xs text-white/40">{label}</p>
                <p className="text-2xl font-extrabold mt-1" style={{color}}>{value}</p>
              </div>
            ))}
          </div>

          {/* Rules list */}
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            {fwLoad ? (
              <div className="p-8 space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
            ) : rules.length === 0 ? (
              <div className="p-16 text-center">
                <Ic.Shield size={40} className="text-white/10 mx-auto mb-4"/>
                <p className="text-white/40 mb-4">No firewall rules yet.</p>
                <button onClick={openAdd} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2">
                  <Ic.Plus/> Add First Rule
                </button>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden p-3 flex flex-col gap-2.5">
                  <MobileListMeta>{rules.length} rules</MobileListMeta>
                  {rules.map((r:any) => (
                    <MobileRow
                      key={r.id}
                      chevron={false}
                      leading={r.priority}
                      leadingClassName="bg-white/[0.06] font-mono text-xs"
                      title={r.name}
                      subtitle={`${r.source_ip||'any'}${r.source_port?`:${r.source_port}`:''} → ${r.dest_ip||'any'}${r.dest_port?`:${r.dest_port}`:''}`}
                      caption={`${r.protocol.toUpperCase()} · ${r.direction} · ${r.hit_count.toLocaleString()} hits${!r.is_active ? ' · Inactive' : ''}`}
                      badge={{ label: r.action, className: `capitalize ${ACTION_CLS[r.action]||''}` }}
                      footer={
                        <>
                          <MobileMiniAction
                            label={r.is_active ? 'Disable' : 'Enable'}
                            className={r.is_active ? 'bg-white/[0.06] text-white/60' : 'bg-primary/15 text-primary-light'}
                            onClick={() => toggleRule.mutate(r.id)}
                          />
                          <MobileMiniAction label="Edit" icon={<Ic.Edit size={11}/>} className="bg-white/[0.06] text-white/60" onClick={() => openEdit(r)} />
                          <MobileMiniAction label="Delete" icon={<Ic.Trash size={11}/>} className="bg-red-500/15 text-red-400" onClick={() => setDeleteConfirm({id:r.id, name:r.name})} />
                        </>
                      }
                    />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                      {['Priority','Name','Action','Protocol','Direction','Source','Destination','Hits','Active',''].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rules.map((r:any) => (
                      <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${!r.is_active?'opacity-50':''}`}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-white/60">{r.priority}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-xs text-white">{r.name}</p>
                          {r.description && <p className="text-[10px] text-white/30 mt-0.5">{r.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${ACTION_CLS[r.action]||''}`}>{r.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/60 uppercase">{r.protocol}</td>
                        <td className="px-4 py-3 text-xs text-white/60 capitalize">{r.direction}</td>
                        <td className="px-4 py-3 font-mono text-xs text-white/50">{r.source_ip||'any'}{r.source_port?`:${r.source_port}`:''}</td>
                        <td className="px-4 py-3 font-mono text-xs text-white/50">{r.dest_ip||'any'}{r.dest_port?`:${r.dest_port}`:''}</td>
                        <td className="px-4 py-3 text-xs font-bold text-white/40">{r.hit_count.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleRule.mutate(r.id)}
                            className={`w-9 h-5 rounded-full transition-colors relative ${r.is_active?'bg-primary':'bg-white/20'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${r.is_active?'left-4':'left-0.5'}`}/>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => openEdit(r)}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-primary/20 flex items-center justify-center transition-colors group">
                              <Ic.Edit className="text-white/40 group-hover:text-primary-light"/>
                            </button>
                            <button onClick={() => setDeleteConfirm({id:r.id, name:r.name})}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center transition-colors group">
                              <Ic.Trash className="text-white/40 group-hover:text-red-400"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EVENTS ───────────────────────────────────────────── */}
      {tab==='events' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden p-3 flex flex-col gap-2.5">
            {events.length === 0 ? (
              <div className="p-14 text-center"><p className="text-white/40 text-sm">No events found.</p></div>
            ) : (
              <>
                <MobileListMeta>{Math.min(events.length,50)} events</MobileListMeta>
                {events.slice(0,50).map((e:any) => {
                  const sevCls =
                    e.severity==='critical' ? 'bg-red-500/15 text-red-400' :
                    e.severity==='high'     ? 'bg-orange-500/15 text-orange-400' :
                    e.severity==='medium'   ? 'bg-amber-500/15 text-amber-400' :
                                                'bg-white/10 text-white/40'
                  return (
                    <MobileRow
                      key={e.id}
                      chevron={false}
                      leading={<Ic.Warn size={16} />}
                      leadingClassName={sevCls}
                      title={(e.event_type||'').replace(/_/g,' ')}
                      subtitle={e.user_name||e.ip_address||'—'}
                      caption={`${new Date(e.timestamp).toLocaleString()} · ${e.status}`}
                      badge={{ label: e.severity, className: `capitalize ${sevCls}` }}
                    />
                  )
                })}
              </>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['Time','Type','Severity','IP Address','User','Status'].map(h=><th key={h} className="px-5 py-3.5 font-semibold text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {events.slice(0,50).map((e:any) => (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-xs text-white/40 font-mono">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-white capitalize">{e.event_type?.replace(/_/g,' ')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                        e.severity==='critical'?'bg-red-500/15 text-red-400 border-red-500/25':
                        e.severity==='high'?'bg-orange-500/15 text-orange-400 border-orange-500/25':
                        e.severity==='medium'?'bg-amber-500/15 text-amber-400 border-amber-500/25':
                        'bg-white/10 text-white/40 border-white/15'}`}>{e.severity}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-white/50">{e.ip_address||'—'}</td>
                    <td className="px-5 py-3 text-xs text-white/60">{e.user_name||'—'}</td>
                    <td className="px-5 py-3 text-xs capitalize text-white/50">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length===0&&<div className="p-16 text-center"><p className="text-white/40">No events found.</p></div>}
          </div>
        </div>
      )}

      {/* ── BLOCKED IPs ──────────────────────────────────────── */}
      {tab==='blocked' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden p-3 flex flex-col gap-2.5">
            {blocked.length === 0 ? (
              <div className="p-14 text-center"><p className="text-white/40 text-sm">No blocked IPs.</p></div>
            ) : (
              <>
                <MobileListMeta>{blocked.length} blocked</MobileListMeta>
                {blocked.map((b:any) => (
                  <MobileRow
                    key={b.id}
                    chevron={false}
                    leading={<Ic.Block size={16} />}
                    leadingClassName="bg-red-500/15 text-red-400"
                    title={b.ip_address}
                    subtitle={b.reason}
                    caption={`Blocked ${new Date(b.created_at).toLocaleDateString()} · ${b.expires_at ? `Expires ${new Date(b.expires_at).toLocaleDateString()}` : 'Permanent'}`}
                    footer={
                      <MobileMiniAction label="Unblock" icon={<Ic.Check size={11}/>} onClick={() => unblockMut.mutate(b.id)} />
                    }
                  />
                ))}
              </>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['IP Address','Reason','Blocked At','Expires','Actions'].map(h=><th key={h} className="px-5 py-3.5 font-semibold text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {blocked.map((b:any) => (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono font-bold text-xs text-white">{b.ip_address}</td>
                    <td className="px-5 py-3 text-xs text-white/60">{b.reason}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{b.expires_at ? new Date(b.expires_at).toLocaleString() : 'Permanent'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => unblockMut.mutate(b.id)}
                        className="text-xs text-primary-light font-semibold hover:text-white transition-colors flex items-center gap-1">
                        <Ic.Check/> Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {blocked.length===0&&<div className="p-16 text-center"><p className="text-white/40">No blocked IPs.</p></div>}
          </div>
        </div>
      )}

      {/* ── SESSIONS ─────────────────────────────────────────── */}
      {tab==='sessions' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden p-3 flex flex-col gap-2.5">
            {sessions.length === 0 ? (
              <div className="p-14 text-center"><p className="text-white/40 text-sm">No sessions found.</p></div>
            ) : (
              <>
                <MobileListMeta>{sessions.length} sessions</MobileListMeta>
                {sessions.map((s:any) => (
                  <MobileRow
                    key={s.id}
                    chevron={false}
                    leading={<Ic.Wifi size={16} />}
                    leadingClassName={s.is_active ? 'bg-primary/15 text-primary-light' : 'bg-white/10 text-white/40'}
                    title={s.user_name||'—'}
                    subtitle={s.user_agent||s.ip_address||'—'}
                    caption={`Started ${new Date(s.created_at).toLocaleDateString()} · Active ${new Date(s.last_activity).toLocaleString()}`}
                    badge={{
                      label: s.is_active ? 'Active' : 'Expired',
                      className: s.is_active ? 'bg-primary/15 text-primary-light' : 'bg-white/10 text-white/40',
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['User','IP Address','Device','Started','Last Active','Status'].map(h=><th key={h} className="px-5 py-3.5 font-semibold text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sessions.map((s:any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-xs font-semibold text-white">{s.user_name||'—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-white/50">{s.ip_address}</td>
                    <td className="px-5 py-3 text-xs text-white/40 max-w-[160px] truncate">{s.user_agent||'—'}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{new Date(s.last_activity).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.is_active?'bg-primary/15 text-primary-light border-primary/25':'bg-white/10 text-white/40 border-white/15'}`}>
                        {s.is_active?'Active':'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length===0&&<div className="p-16 text-center"><p className="text-white/40">No sessions found.</p></div>}
          </div>
        </div>
      )}

      {/* ════ MODALS ════════════════════════════════════════════ */}

      {/* Add / Edit Rule */}
      {ruleModal!==null && (
        <Modal title={ruleModal==='add'?'Add Firewall Rule':'Edit Firewall Rule'} onClose={()=>setRuleModal(null)}>
          <div className="space-y-3">
            <Field label="Rule Name *">
              <input value={rForm.name} onChange={e=>setRForm(f=>({...f,name:e.target.value}))} className={inputCls} placeholder="e.g. Block SSH Brute Force"/>
            </Field>
            <Field label="Description">
              <input value={rForm.description} onChange={e=>setRForm(f=>({...f,description:e.target.value}))} className={inputCls} placeholder="Optional description"/>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Action">
                <select value={rForm.action} onChange={e=>setRForm(f=>({...f,action:e.target.value}))} className={selectCls}>
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                  <option value="log">Log Only</option>
                </select>
              </Field>
              <Field label="Protocol">
                <select value={rForm.protocol} onChange={e=>setRForm(f=>({...f,protocol:e.target.value}))} className={selectCls}>
                  <option value="any">Any</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                </select>
              </Field>
              <Field label="Direction">
                <select value={rForm.direction} onChange={e=>setRForm(f=>({...f,direction:e.target.value}))} className={selectCls}>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="both">Both</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source IP / CIDR">
                <input value={rForm.source_ip} onChange={e=>setRForm(f=>({...f,source_ip:e.target.value}))} className={inputCls} placeholder="0.0.0.0/0 or blank = any"/>
              </Field>
              <Field label="Source Port">
                <input value={rForm.source_port} onChange={e=>setRForm(f=>({...f,source_port:e.target.value}))} className={inputCls} placeholder="80 or 8000-9000"/>
              </Field>
              <Field label="Destination IP / CIDR">
                <input value={rForm.dest_ip} onChange={e=>setRForm(f=>({...f,dest_ip:e.target.value}))} className={inputCls} placeholder="0.0.0.0/0 or blank = any"/>
              </Field>
              <Field label="Destination Port">
                <input value={rForm.dest_port} onChange={e=>setRForm(f=>({...f,dest_port:e.target.value}))} className={inputCls} placeholder="443 or 3000-4000"/>
              </Field>
            </div>
            <Field label="Priority (lower = higher priority)">
              <input type="number" min="1" max="9999" value={rForm.priority} onChange={e=>setRForm(f=>({...f,priority:e.target.value}))} className={inputCls}/>
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setRuleModal(null)} className="flex-1 glass border border-white/[0.07] rounded-xl py-2.5 text-sm font-semibold text-white/50 hover:bg-white/[0.05] transition-colors">Cancel</button>
              <button onClick={submitRule} disabled={!rForm.name||(createRule.isPending||updateRule.isPending)}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {(createRule.isPending||updateRule.isPending)?'Saving…':ruleModal==='add'?'Create Rule':'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Rules */}
      {importModal && (
        <Modal title="Import Firewall Rules" onClose={()=>{setImportModal(false);setImportText('');setImportFile(null)}}>
          <div className="space-y-4">
            <div className="glass border border-white/[0.07] rounded-xl p-4 text-xs text-white/50 space-y-1">
              <p className="font-semibold text-white/70">Supported formats:</p>
              <p>• <span className="text-primary-light">JSON array</span>: <code className="text-white/40">[{"{"}name, action, protocol, source_ip, dest_port, priority{"}"}]</code></p>
              <p>• <span className="text-primary-light">CSV</span>: columns — name, action, protocol, direction, source_ip, dest_ip, source_port, dest_port, priority</p>
            </div>
            <Field label="Upload File (JSON or CSV)">
              <input type="file" accept=".json,.csv"
                onChange={e=>{ setImportFile(e.target.files?.[0]||null); setImportText('') }}
                className="text-xs text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 cursor-pointer w-full"/>
            </Field>
            {!importFile && (
              <>
                <div className="flex items-center gap-3 text-white/20 text-[11px]">
                  <div className="flex-1 h-px bg-white/[0.07]"/>or paste JSON<div className="flex-1 h-px bg-white/[0.07]"/>
                </div>
                <Field label="Paste JSON">
                  <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={6}
                    className={inputCls+' resize-none font-mono text-xs'}
                    placeholder='[{"name":"Block Telnet","action":"deny","protocol":"tcp","dest_port":"23","priority":10}]'/>
                </Field>
              </>
            )}
            {importFile && <p className="text-xs text-primary-light">✓ {importFile.name} selected</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={()=>{setImportModal(false);setImportText('');setImportFile(null)}}
                className="flex-1 glass border border-white/[0.07] rounded-xl py-2.5 text-sm font-semibold text-white/50 hover:bg-white/[0.05] transition-colors">Cancel</button>
              <button onClick={handleImport} disabled={(!importText.trim()&&!importFile)||importRules.isPending}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                <Ic.Upload size={13}/>{importRules.isPending?'Importing…':'Import Rules'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Delete Rule" onClose={()=>setDeleteConfirm(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20">
              <Ic.Warn className="text-red-400 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-white/70">Delete rule <span className="font-bold text-white">"{deleteConfirm.name}"</span>? This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 glass border border-white/[0.07] rounded-xl py-2.5 text-sm font-semibold text-white/50">Cancel</button>
              <button onClick={()=>deleteRule.mutate(deleteConfirm.id)} disabled={deleteRule.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-red-500/80 hover:bg-red-500 disabled:opacity-50 transition-colors">
                {deleteRule.isPending?'Deleting…':'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
