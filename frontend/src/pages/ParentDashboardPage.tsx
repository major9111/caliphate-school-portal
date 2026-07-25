/**
 * FUGUSAU Portal — Parent Dashboard
 * Consumes: /auth/parent/students/ and /auth/parent/students/:id/results/
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { parentAPI } from '@/services/api'
import { useChartTheme } from '@/hooks/useChartTheme'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  IconResults, IconFees, IconWarning, IconCheck, IconClock,
  IconGradCap, IconUser, IconChevronRight, IconTarget,
} from '@/components/icons'
import { MobileRow, MobileListMeta } from '@/components/mobile'

function IconStudents(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] text-xs space-y-1">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color || '#00A85A' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

const GRADE_COLOR: Record<string, string> = {
  A:'#00A85A','A-':'#00A85A','B+':'#3B82F6',B:'#3B82F6','B-':'#3B82F6',
  'C+':'#D4A017',C:'#D4A017','C-':'#D4A017',D:'#F97316',E:'#EF4444',F:'#EF4444',
}

export default function ParentDashboardPage() {
  const chart = useChartTheme()
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null)

  const { data: wardsData, isLoading: loadingWards } = useQuery<any, any>({
    queryKey: ['parent-wards'],
    queryFn:  parentAPI.getWards,
  })

  const wards: any[] = wardsData?.data?.results || wardsData?.data || []

  // Auto-select first ward
  const activeWardId = selectedWardId || wards[0]?.id

  const { data: resultsData, isLoading: loadingResults } = useQuery<any, any>({
    queryKey: ['ward-results', activeWardId],
    queryFn:  () => parentAPI.getWardResults(activeWardId),
    enabled:  !!activeWardId,
  })

  const wardResults: any[] = resultsData?.data?.results || resultsData?.data || []
  const activeWard = wards.find(w => w.id === activeWardId)

  // Compute GPA trend from results grouped by session/semester
  const sessionMap: Record<string, any[]> = {}
  wardResults.forEach((r: any) => {
    const key = `${r.session} ${r.semester}`
    if (!sessionMap[key]) sessionMap[key] = []
    sessionMap[key].push(r)
  })
  const gpaTrend = Object.entries(sessionMap).map(([sem, results]) => {
    const totalUnits = results.reduce((s, r) => s + (r.credit_units || 0), 0)
    const totalGP    = results.reduce((s, r) => s + (r.grade_point * (r.credit_units || 0)), 0)
    return { sem: sem.replace(/20\d\d\/20\d\d /, ''), gpa: totalUnits > 0 ? parseFloat((totalGP / totalUnits).toFixed(2)) : 0 }
  })

  // Score chart (latest 8 courses)
  const scoreChart = wardResults.slice(0, 8).map((r: any) => ({
    code:  r.course_code,
    score: r.total_score,
    grade: r.grade,
  }))

  // CGPA
  const totalUnits = wardResults.reduce((s, r) => s + (r.credit_units || 0), 0)
  const totalGP    = wardResults.reduce((s, r) => s + (r.grade_point * (r.credit_units || 0)), 0)
  const cgpa       = totalUnits > 0 ? (totalGP / totalUnits).toFixed(2) : '—'

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px]">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">
          Parent <span className="text-gradient-green">Portal</span>
        </h2>
        <p className="text-white/40 text-sm mt-1">Monitor your ward's academic progress</p>
      </div>

      {/* Ward selector */}
      {loadingWards ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:2}).map((_,i)=><div key={i} className="glass rounded-2xl h-28 skeleton"/>)}
        </div>
      ) : wards.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
          <IconStudents size={48} className="text-white/15 mx-auto mb-4"/>
          <p className="text-white/40 text-sm">No wards linked to your account.</p>
          <p className="text-white/25 text-xs mt-1">Contact the registry to link your ward's matric number.</p>
        </div>
      ) : (
        <>
          {/* Ward cards */}
          {wards.length > 1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">Select Ward</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wards.map((w: any) => (
                  <button key={w.id} onClick={() => setSelectedWardId(w.id)}
                    className={`text-left glass border rounded-2xl p-5 transition-all ${
                      w.id === activeWardId
                        ? 'border-primary-light bg-primary/10'
                        : 'border-white/[0.07] hover:border-primary/40'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                        {(w.full_name||w.name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{w.full_name||w.name}</p>
                        <p className="text-xs text-white/40 font-mono mt-0.5">{w.matric_number}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-3 text-xs text-white/40">
                      <span>{w.department_name}</span>
                      <span>·</span>
                      <span>{w.level} Level</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active ward overview */}
          {activeWard && (
            <>
              {/* Ward info banner */}
              <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-8 py-6"
                  style={{ background: 'linear-gradient(135deg,rgba(0,107,63,0.15),rgba(0,40,25,0.2))' }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl"
                        style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                        {(activeWard.full_name||activeWard.name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">{activeWard.full_name||activeWard.name}</h3>
                        <p className="text-white/50 text-sm font-mono">{activeWard.matric_number}</p>
                        <p className="text-white/40 text-xs mt-0.5">{activeWard.department_name} · {activeWard.level} Level</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center w-full sm:w-auto">
                      {[
                        { label: 'CGPA',    value: cgpa,                color: '#00A85A' },
                        { label: 'Courses', value: wardResults.length,  color: '#3B82F6' },
                        { label: 'Status',  value: activeWard.status || 'Active', color: '#D4A017' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="glass rounded-xl p-3">
                          <div className="text-base font-extrabold capitalize" style={{ color }}>{value}</div>
                          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* GPA Trend */}
                <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h3 className="font-bold text-sm text-white">GPA Progression</h3>
                  </div>
                  <div className="p-5 h-52">
                    {gpaTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={gpaTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="wardGpa" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#00A85A" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#00A85A" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                          <XAxis dataKey="sem" tick={{ fill: chart.tick,fontSize:9 }} axisLine={false} tickLine={false}/>
                          <YAxis domain={[0,5]} tick={{ fill: chart.tick,fontSize:10 }} axisLine={false} tickLine={false}/>
                          <Tooltip content={<GlassTooltip/>}/>
                          <Area type="monotone" dataKey="gpa" stroke="#00A85A" strokeWidth={2.5}
                            fill="url(#wardGpa)" dot={{ fill:'#00A85A',r:4,strokeWidth:0 }}
                            activeDot={{ r:6,stroke:'rgba(0,168,90,0.3)',strokeWidth:3 }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-white/30 text-sm">No results data yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course scores */}
                <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06]">
                    <h3 className="font-bold text-sm text-white">Recent Course Scores</h3>
                  </div>
                  <div className="p-5 h-52">
                    {scoreChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreChart} margin={{ top:5,right:5,left:-25,bottom:0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                          <XAxis dataKey="code" tick={{ fill: chart.tick,fontSize:9 }} axisLine={false} tickLine={false}/>
                          <YAxis domain={[0,100]} tick={{ fill: chart.tick,fontSize:10 }} axisLine={false} tickLine={false}/>
                          <Tooltip content={<GlassTooltip/>}/>
                          <Bar dataKey="score" radius={[4,4,0,0]}>
                            {scoreChart.map((e:any,i:number)=>(
                              <Cell key={i} fill={e.score>=70?'#00A85A':e.score>=60?'#D4A017':'#EF4444'} opacity={0.85}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-white/30 text-sm">No results yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Results table */}
              {loadingResults ? (
                <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="glass rounded-xl h-12 skeleton"/>)}</div>
              ) : wardResults.length > 0 && (
                <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">Academic Results</h3>
                    <p className="text-xs text-white/40">CGPA: <span className="font-bold text-primary-light">{cgpa}</span></p>
                  </div>
                  <div className="md:hidden p-3 flex flex-col gap-2.5">
                    <MobileListMeta>{wardResults.length} results</MobileListMeta>
                    {wardResults.map((r: any) => (
                      <MobileRow
                        key={r.id}
                        chevron={false}
                        leading={r.grade || '—'}
                        leadingClassName="bg-white/[0.06] font-extrabold text-base"
                        leadingStyle={{ color: GRADE_COLOR[r.grade] || '#888' }}
                        title={r.course_code}
                        subtitle={r.course_title}
                        caption={`${r.session} · ${r.credit_units} units · Total ${r.total_score}`}
                        badge={{
                          label: r.is_senate_approved ? 'Approved' : 'Pending',
                          className: r.is_senate_approved ? 'bg-primary/15 text-primary-light' : 'bg-amber-500/15 text-amber-400',
                        }}
                      />
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                          {['Course','Session','Units','Total','Grade','Status'].map(h=>(
                            <th key={h} className={`px-5 py-3 font-semibold text-left ${['Session','Units'].includes(h)?'hidden md:table-cell':''} ${['Grade','Status'].includes(h)?'text-center':''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {wardResults.map((r:any)=>(
                          <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-mono text-xs font-bold text-primary-light">{r.course_code}</div>
                              <div className="text-[11px] text-white/40 truncate max-w-[140px]">{r.course_title}</div>
                            </td>
                            <td className="px-5 py-3 text-xs text-white/40 hidden md:table-cell">{r.session}</td>
                            <td className="px-5 py-3 text-center text-white/50 hidden md:table-cell">{r.credit_units}</td>
                            <td className="px-5 py-3 font-bold text-white">{r.total_score}</td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-base font-extrabold" style={{ color: GRADE_COLOR[r.grade]||'#888' }}>{r.grade}</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-[11px] font-semibold flex items-center justify-center gap-1 ${r.is_senate_approved?'text-primary-light':'text-amber-400'}`}>
                                {r.is_senate_approved?<><IconCheck size={10}/> Approved</>:<><IconClock size={10}/> Pending</>}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fee summary */}
              <div className="glass border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <IconFees size={18} className="text-amber-400"/>
                  </div>
                  <h3 className="font-bold text-sm text-white">Fee Status</h3>
                </div>
                <p className="text-sm text-white/50">
                  Fee details are managed by your ward directly through their portal account.
                  Contact the Bursary Office at <span className="text-primary-light">bursary@fugusau.edu.ng</span> for payment inquiries.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
