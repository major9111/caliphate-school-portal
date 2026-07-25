/**
 * FUGUSAU Admin — Fee Management
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feesAPI, reportsAPI } from '@/services/api'
import { formatDate } from '@/utils'
import { useChartTheme } from '@/hooks/useChartTheme'
import toast from 'react-hot-toast'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { IconFees, IconCheck, IconClock, IconWarning, IconDownload, IconSearch, IconPlus } from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta } from '@/components/mobile'

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] text-xs space-y-1">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value==='number' ? `₦${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

const STATUS_STYLE: Record<string,string> = {
  paid:    'bg-primary/15 text-primary-light border-primary/25',
  partial: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  pending: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/25',
}

const MONTHLY = [
  { month:'Oct', collected:12400000, outstanding:4200000 },
  { month:'Nov', collected:18700000, outstanding:3800000 },
  { month:'Dec', collected:9200000,  outstanding:5100000 },
  { month:'Jan', collected:42000000, outstanding:12000000 },
  { month:'Feb', collected:58000000, outstanding:8500000 },
  { month:'Mar', collected:38000000, outstanding:6200000 },
  { month:'Apr', collected:29000000, outstanding:5800000 },
]

export default function AdminFeesPage() {
  const chart = useChartTheme()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-invoices', search, statusFilter],
    queryFn: () => feesAPI.getInvoices(),
  })
  const { data: reportData } = useQuery<any, any>({
    queryKey: ['fee-report-admin'],
    queryFn: () => reportsAPI.getFeeReport(),
  })

  const invoices: any[] = data?.data?.results || data?.data || []
  const report = reportData?.data

  const total      = report?.total_collected    || 158400000
  const outstanding = report?.total_outstanding || 34200000
  const rate        = report?.collection_rate   || 82

  const filtered = invoices.filter(inv =>
    (!statusFilter || inv.status === statusFilter) &&
    (!search || (inv.student_name||'').toLowerCase().includes(search.toLowerCase()) ||
                (inv.matric_number||'').toLowerCase().includes(search.toLowerCase()))
  )

  const PIE = [
    { name: 'Collected',   value: total,       fill: '#00A85A' },
    { name: 'Outstanding', value: outstanding, fill: '#EF4444' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <IconFees size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Fee Management</h2>
            <p className="text-xs text-white/40">2025/2026 Academic Session</p>
          </div>
        </div>
        <button className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
          <IconDownload size={14} /> Export Report
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Collected',  value:`₦${(total/1000000).toFixed(1)}M`,       accent:'#00A85A' },
          { label:'Outstanding',      value:`₦${(outstanding/1000000).toFixed(1)}M`, accent:'#EF4444' },
          { label:'Collection Rate',  value:`${rate}%`,                               accent:'#D4A017' },
          { label:'Total Invoices',   value:invoices.length || 12230,                 accent:'#3B82F6' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-2xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Line chart */}
        <div className="lg:col-span-2 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm text-white">Monthly Collection Trend</h3>
          </div>
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                <XAxis dataKey="month" tick={{fill: chart.tick,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`₦${(v/1000000).toFixed(0)}M`} tick={{fill: chart.tick,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<GlassTooltip/>}/>
                <Legend formatter={v=><span style={{color: chart.legend,fontSize:11}}>{v}</span>}/>
                <Line type="monotone" dataKey="collected"   name="Collected"   stroke="#00A85A" strokeWidth={2.5} dot={{fill:'#00A85A',r:4}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#EF4444" strokeWidth={2} dot={{fill:'#EF4444',r:3}} strokeDasharray="4 3"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm text-white">Collection Split</h3>
          </div>
          <div className="p-5 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE} cx="50%" cy="50%" innerRadius={48} outerRadius={68}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {PIE.map((e,i)=><Cell key={i} fill={e.fill} opacity={0.85}/>)}
                </Pie>
                <Tooltip content={<GlassTooltip/>} formatter={(v:any)=>`₦${(v/1000000).toFixed(1)}M`}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {PIE.map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:d.fill}}/>
                  <span className="text-white/50">{d.name}</span>
                </div>
                <span className="font-bold" style={{color:d.fill}}>₦{(d.value/1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="md:hidden">
        <MobileToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search student/matric…"
          chips={[
            { value: '', label: 'All Status' },
            ...['paid', 'partial', 'pending', 'overdue'].map(s => ({ value: s, label: s })),
          ]}
          activeChip={statusFilter}
          onChipChange={setStatusFilter}
        />
      </div>

      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student/matric…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {['paid','partial','pending','overdue'].map(s=>(
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <IconFees size={40} className="text-white/15 mx-auto mb-3"/>
            <p className="text-white/40 text-sm">No invoices found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{filtered.length} invoices</MobileListMeta>
            {filtered.map((inv: any) => (
              <MobileRow
                key={inv.id}
                chevron={false}
                leading={<IconFees size={16} />}
                leadingClassName="bg-amber-500/15 text-amber-400"
                title={inv.student_name || '—'}
                subtitle={`Balance: ₦${parseFloat(inv.balance || 0).toLocaleString()}`}
                caption={`${inv.matric_number || '—'} · Due ${formatDate(inv.due_date, true)}`}
                badge={{ label: inv.status, className: STATUS_STYLE[inv.status] || STATUS_STYLE.pending }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : filtered.length===0 ? (
          <div className="p-20 text-center"><IconFees size={48} className="text-white/15 mx-auto mb-4"/><p className="text-white/40">No invoices found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['Student','Invoice No.','Total','Paid','Balance','Status','Due Date'].map(h=>(
                    <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Total','Paid','Balance'].includes(h)?'text-right':''} ${['Paid','Due Date'].includes(h)?'hidden md:table-cell':''} ${h==='Status'?'text-center':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((inv:any)=>(
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-xs text-white">{inv.student_name||'—'}</div>
                      <div className="text-[11px] text-white/40 font-mono">{inv.matric_number||'—'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-white/60">{inv.invoice_no}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-white">₦{parseFloat(inv.total_amount||0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-primary-light hidden md:table-cell">₦{parseFloat(inv.amount_paid||0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-bold" style={{color:parseFloat(inv.balance)>0?'#EF4444':'#00A85A'}}>
                      ₦{parseFloat(inv.balance||0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[inv.status]||STATUS_STYLE.pending}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40 hidden md:table-cell">{formatDate(inv.due_date,true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
