/**
 * FUGUSAU Portal — Reports & Analytics
 * Fixed: safe array guards on all API data, crash-proof map calls
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '@/services/api'
import { useRole } from '@/hooks/useRole'
import { gradeHex, downloadBlob } from '@/utils'
import { useChartTheme } from '@/hooks/useChartTheme'
import type { TranscriptData } from '@/types'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  IconReports, IconResults, IconFees, IconCourses,
  IconDownload, IconCheck, IconClock,
} from '@/components/icons'
import toast from 'react-hot-toast'
import { MobileRow, MobileListMeta } from '@/components/mobile'

type Tab = 'transcript' | 'fees' | 'enrollments'

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] shadow-glass text-xs space-y-1">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

const PIE_COLORS = ['#00A85A','#3B82F6','#D4A017','#8B5CF6','#EF4444','#F97316','#EC4899']

// Safe array helper — always returns an array no matter what the API sends
function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val
  return []
}

export default function ReportsPage() {
  const chart = useChartTheme()
  const { isStudent, isAdmin, isLecturer } = useRole()
  const [tab, setTab] = useState<Tab>(isStudent ? 'transcript' : 'enrollments')

  const { data: transcriptData, isLoading: loadingT } = useQuery<any, any>({
    queryKey: ['my-transcript'],
    queryFn:  reportsAPI.getMyTranscript,
    enabled:  isStudent && tab === 'transcript',
  })
  const { data: feeData, isLoading: loadingF } = useQuery<any, any>({
    queryKey: ['fee-report'],
    queryFn:  () => reportsAPI.getFeeReport(),
    enabled:  isAdmin && tab === 'fees',
  })
  const { data: enrollData, isLoading: loadingE } = useQuery<any, any>({
    queryKey: ['enrollment-report'],
    queryFn:  () => reportsAPI.getEnrollmentReport(),
    enabled:  (isAdmin || isLecturer) && tab === 'enrollments',
  })

  const transcript: TranscriptData | undefined = transcriptData?.data
  const feeReport    = feeData?.data
  const enrollReport = enrollData?.data

  const tabs: { key: Tab; label: string; Icon: React.FC<any>; show: boolean }[] = [
    { key: 'transcript',  label: 'My Transcript',  Icon: IconResults, show: isStudent             },
    { key: 'fees',        label: 'Fee Collection', Icon: IconFees,    show: isAdmin               },
    { key: 'enrollments', label: 'Enrollments',    Icon: IconCourses, show: isAdmin || isLecturer },
  ]
  const visibleTabs = tabs.filter(t => t.show)

  // Safe chart data — always arrays even if API returns null/object
  const transcriptChartData = safeArray(transcript?.results).slice(0, 10).map((r: any) => ({
    code:  r.course_code,
    score: r.total_score,
    grade: r.grade,
  }))

  const feeChartData = safeArray(feeReport?.monthly_collection).map((m: any) => ({
    month: m.month, amount: m.amount,
  }))

  const enrollPieData = safeArray(enrollReport?.by_department).map((d: any) => ({
    name: d.department, value: d.count,
  }))

  async function handleDownloadTranscript() {
    try {
      const res = await reportsAPI.downloadTranscript()
      downloadBlob(new Blob([res.data]), 'transcript.pdf')
    } catch { toast.error('Failed to download transcript.') }
  }

  // If no visible tabs at all (role mismatch), show a message instead of crashing
  if (visibleTabs.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconReports size={20} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Reports & Analytics</h2>
            <p className="text-xs text-white/40">Academic and administrative insights</p>
          </div>
        </div>
        <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
          <IconReports size={48} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40">No reports available for your role.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconReports size={20} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Reports & Analytics</h2>
            <p className="text-xs text-white/40">Academic and administrative insights</p>
          </div>
        </div>
        {isStudent && (
          <button onClick={handleDownloadTranscript}
            className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
            <IconDownload size={14} /> Download Transcript
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {visibleTabs.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Transcript ── */}
      {tab === 'transcript' && isStudent && (
        loadingT ? (
          <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="glass rounded-2xl h-36 skeleton"/>)}</div>
        ) : !transcript ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
            <IconResults size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No transcript data available yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'CGPA',           value: parseFloat(String(transcript.cgpa||0)).toFixed(2), accent: '#00A85A' },
                { label: 'Credit Units',   value: transcript.total_units || 0,                        accent: '#3B82F6' },
                { label: 'Courses',        value: safeArray(transcript.results).length,               accent: '#D4A017' },
                { label: 'Classification', value: transcript.classification || '—',                   accent: '#8B5CF6' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: `linear-gradient(90deg,${accent},transparent)` }}/>
                  <div className="text-xs text-white/40 mb-2">{label}</div>
                  <div className="text-2xl font-extrabold" style={{ color: accent }}>{value}</div>
                </div>
              ))}
            </div>

            {transcriptChartData.length > 0 && (
              <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <h3 className="font-bold text-sm text-white">Score per Course</h3>
                </div>
                <div className="p-6 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transcriptChartData} margin={{ top:5,right:10,left:-25,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                      <XAxis dataKey="code" tick={{ fill: chart.tick,fontSize:10 }} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,100]} tick={{ fill: chart.tick,fontSize:10 }} axisLine={false} tickLine={false}/>
                      <Tooltip content={<GlassTooltip/>}/>
                      <Bar dataKey="score" radius={[4,4,0,0]}>
                        {transcriptChartData.map((e:any,i:number)=>(
                          <Cell key={i} fill={gradeHex(e.grade)} opacity={0.85}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
              {/* Mobile card list */}
              <div className="md:hidden p-3 flex flex-col gap-2.5">
                <MobileListMeta>{safeArray(transcript.results).length} results</MobileListMeta>
                {safeArray(transcript.results).map((r: any) => (
                  <MobileRow
                    key={r.id}
                    chevron={false}
                    leading={r.grade || '—'}
                    leadingClassName="bg-white/[0.06] font-extrabold text-base"
                    leadingStyle={{ color: gradeHex(r.grade) }}
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
                      {['Course','Session','Units','Total','Grade','GP','Status'].map(h=>(
                        <th key={h} className={`px-5 py-3 font-semibold text-left ${['Total','GP'].includes(h)?'text-right':''} ${['Grade','Status'].includes(h)?'text-center':''} ${['Session','Units','GP','Status'].includes(h)?'hidden md:table-cell':''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {safeArray(transcript.results).map((r:any)=>(
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-xs font-mono text-white">{r.course_code}</div>
                          <div className="text-[11px] text-white/40 truncate max-w-[140px]">{r.course_title}</div>
                        </td>
                        <td className="px-5 py-3.5 text-white/40 text-xs hidden md:table-cell">{r.session}</td>
                        <td className="px-5 py-3.5 text-center text-white/50 hidden md:table-cell">{r.credit_units}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-white">{r.total_score}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="text-base font-extrabold" style={{ color: gradeHex(r.grade) }}>{r.grade}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-white/45 hidden md:table-cell">{r.grade_point}</td>
                        <td className="px-5 py-3.5 text-center hidden md:table-cell">
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
          </div>
        )
      )}

      {/* ── Fee Report ── */}
      {tab === 'fees' && isAdmin && (
        loadingF ? (
          <div className="space-y-4">{Array.from({length:2}).map((_,i)=><div key={i} className="glass rounded-2xl h-52 skeleton"/>)}</div>
        ) : !feeReport ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
            <IconFees size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No fee report data available.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label:'Total Collected', value:`₦${((feeReport.total_collected||0)/1000000).toFixed(1)}M`, accent:'#00A85A' },
                { label:'Outstanding',     value:`₦${((feeReport.total_outstanding||0)/1000000).toFixed(1)}M`, accent:'#EF4444' },
                { label:'Collection Rate', value:`${feeReport.collection_rate||0}%`, accent:'#D4A017' },
              ].map(({label,value,accent})=>(
                <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
                  <div className="text-xs text-white/40 mb-2">{label}</div>
                  <div className="text-2xl font-extrabold" style={{color:accent}}>{value}</div>
                </div>
              ))}
            </div>
            {feeChartData.length > 0 && (
              <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06]"><h3 className="font-bold text-sm text-white">Monthly Collections</h3></div>
                <div className="p-6 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={feeChartData} margin={{top:5,right:10,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                      <XAxis dataKey="month" tick={{fill: chart.tick,fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill: chart.tick,fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<GlassTooltip/>}/>
                      <Line type="monotone" dataKey="amount" stroke="#00A85A" strokeWidth={2.5} dot={{fill:'#00A85A',r:4}} activeDot={{r:6}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Enrollments ── */}
      {tab === 'enrollments' && (isAdmin || isLecturer) && (
        loadingE ? (
          <div className="space-y-4">{Array.from({length:2}).map((_,i)=><div key={i} className="glass rounded-2xl h-52 skeleton"/>)}</div>
        ) : !enrollReport ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
            <IconCourses size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No enrollment data available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Total Students', value: enrollReport.total_students    || 0, accent:'#00A85A' },
                  { label:'Departments',    value: enrollReport.total_departments || 0, accent:'#3B82F6' },
                ].map(({label,value,accent})=>(
                  <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5">
                    <div className="text-xs text-white/40 mb-2">{label}</div>
                    <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]"><h3 className="font-bold text-sm text-white">By Department</h3></div>
                {safeArray(enrollReport.by_department).length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-white/30 text-sm">No department data yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto">
                    {safeArray(enrollReport.by_department).map((d:any,i:number)=>(
                      <div key={d.department||i} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                          <span className="text-xs text-white/60 truncate max-w-[180px]">{d.department}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {enrollPieData.length > 0 && (
              <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]"><h3 className="font-bold text-sm text-white">Department Distribution</h3></div>
                <div className="p-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={enrollPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" paddingAngle={2} strokeWidth={0}>
                        {enrollPieData.map((_:any,i:number)=>(
                          <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} opacity={0.85}/>
                        ))}
                      </Pie>
                      <Tooltip content={<GlassTooltip/>}/>
                      <Legend formatter={(v:string)=><span style={{color: chart.legend,fontSize:11}}>{v}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
