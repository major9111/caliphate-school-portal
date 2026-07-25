/**
 * FUGUSAU Portal — Results Page (Full)
 *
 * Backend endpoints used:
 *   GET /api/v1/exams/results/?session=&semester=   → MyResultsView (all results incl. pending)
 *   GET /api/v1/reports/transcript/                  → MyTranscriptView (senate-approved only, grouped)
 *
 * The two endpoints serve different purposes:
 *   - /exams/results/ → shows ALL results (approved + pending) for the student dashboard
 *   - /reports/transcript/ → shows only APPROVED results grouped by session for the transcript tab
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { examsAPI, reportsAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { downloadBlob, gradeHex } from '@/utils'
import { useChartTheme } from '@/hooks/useChartTheme'
import toast from 'react-hot-toast'
import { MobileRow, MobileListMeta } from '@/components/mobile'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  IconResults, IconDownload, IconCheck, IconClock,
  IconTarget, IconCourses, IconGradCap, IconChevronRight,
} from '@/components/icons'

// ── Helpers ───────────────────────────────────────────────────
const GRADE_MAP: Record<string,{color:string;point:number;label:string}> = {
  'A':  { color:'#00A85A', point:5.0, label:'Distinction'    },
  'B+': { color:'#3B82F6', point:4.5, label:'Upper Credit'   },
  'B':  { color:'#3B82F6', point:4.0, label:'Upper Credit'   },
  'C+': { color:'#D4A017', point:3.5, label:'Lower Credit'   },
  'C':  { color:'#D4A017', point:3.0, label:'Lower Credit'   },
  'D':  { color:'#F97316', point:2.0, label:'Pass'           },
  'F':  { color:'#EF4444', point:0.0, label:'Fail'           },
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] text-xs space-y-1">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color || '#00A85A' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = '#00A85A', large = false }: {
  label: string; value: string | number; sub?: string; accent?: string; large?: boolean
}) {
  return (
    <div className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg,${accent},transparent)` }}/>
      <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">{label}</div>
      <div className={`font-extrabold text-white leading-none ${large ? 'text-4xl' : 'text-3xl'}`}
        style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-white/30 mt-2">{sub}</div>}
    </div>
  )
}

// ── Classification label ───────────────────────────────────────
function classify(cgpa: number): string {
  if (cgpa >= 4.5) return 'First Class Honours'
  if (cgpa >= 3.5) return 'Second Class Upper'
  if (cgpa >= 2.4) return 'Second Class Lower'
  if (cgpa >= 1.5) return 'Third Class'
  if (cgpa >= 1.0) return 'Pass'
  return 'Fail'
}

// ── Main component ─────────────────────────────────────────────
type Tab = 'all' | 'transcript'

export default function ResultsPage() {
  const chart = useChartTheme()
  const { user } = useAuthStore()
  const [tab,           setTab]           = useState<Tab>('all')
  const [sessionFilter, setSessionFilter] = useState('all')
  const [semesterFilter,setSemesterFilter]= useState('all')
  const [downloading,   setDownloading]   = useState(false)

  // All results (approved + pending)
  const { data: allData, isLoading: loadingAll } = useQuery<any, any>({
    queryKey: ['results-all', sessionFilter, semesterFilter],
    queryFn: () => examsAPI.getResults({
      session:  sessionFilter  !== 'all' ? sessionFilter  : undefined,
      semester: semesterFilter !== 'all' ? semesterFilter : undefined,
    }),
  })

  // Transcript — senate approved only, grouped by session
  const { data: transcriptData, isLoading: loadingTranscript } = useQuery<any, any>({
    queryKey: ['my-transcript'],
    queryFn:  reportsAPI.getMyTranscript,
    enabled:  tab === 'transcript',
  })

  const results: any[]   = allData?.data?.results || allData?.data || []
  const transcript       = transcriptData?.data
  const student          = transcript?.student
  const transcriptSessions: Record<string, any> = transcript?.transcript || {}

  // Unique sessions for filter dropdown
  const sessions = Array.from(new Set(results.map(r => r.session).filter(Boolean))).sort().reverse()

  // Filtered results for current tab view
  const filtered = results // already filtered by query params

  // Compute stats from all results
  const approved   = results.filter(r => r.is_senate_approved)
  const totalUnits = approved.reduce((s, r) => s + (r.credit_units || 0), 0)
  const totalGP    = approved.reduce((s, r) => s + (r.grade_point * (r.credit_units || 0)), 0)
  const cgpa       = totalUnits > 0 ? totalGP / totalUnits : 0

  // GPA per session (from approved results)
  const sessionGPA: Record<string, { units: number; gp: number }> = {}
  approved.forEach(r => {
    const k = `${r.session} ${r.semester}`
    if (!sessionGPA[k]) sessionGPA[k] = { units: 0, gp: 0 }
    sessionGPA[k].units += r.credit_units || 0
    sessionGPA[k].gp    += r.grade_point * (r.credit_units || 0)
  })
  const gpaChartData = Object.entries(sessionGPA)
    .map(([sem, { units, gp }]) => ({
      sem:  sem.replace(/20\d\d\/20\d\d /,''),
      gpa:  units > 0 ? parseFloat((gp / units).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.sem.localeCompare(b.sem))

  // Grade distribution
  const gradeDist: Record<string, number> = {}
  results.forEach(r => { gradeDist[r.grade] = (gradeDist[r.grade] || 0) + 1 })
  const gradeChartData = Object.entries(gradeDist)
    .map(([grade, count]) => ({ grade, count, color: GRADE_MAP[grade]?.color || '#888' }))
    .sort((a, b) => a.grade.localeCompare(b.grade))

  // Score distribution for bar chart
  const scoreChart = filtered.slice(0, 10).map(r => ({
    code:  r.course_code,
    score: parseFloat(r.total_score) || 0,
    grade: r.grade,
  }))

  // Download transcript PDF
  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await reportsAPI.downloadTranscript()
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }),
        `transcript_${user?.name?.replace(/ /g,'_')}.pdf`)
      toast.success('Transcript downloaded!')
    } catch {
      toast.error('Download failed. Contact the registry.')
    } finally { setDownloading(false) }
  }

  const isLoading = tab === 'all' ? loadingAll : loadingTranscript

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconResults size={20} className="text-primary-light"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Academic Results</h2>
            <p className="text-xs text-white/40">{results.length} course results on record</p>
          </div>
        </div>
        <button onClick={handleDownload} disabled={downloading || results.length === 0}
          className="btn-primary rounded-xl px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2 disabled:opacity-40">
          {downloading
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Downloading…</>
            : <><IconDownload size={14}/>Download Transcript</>}
        </button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="CGPA (Overall)"   value={cgpa > 0 ? cgpa.toFixed(2) : '—'}  sub={cgpa > 0 ? classify(cgpa) : 'No approved results'}  accent="#00A85A" large />
        <StatCard label="Credit Units Earned" value={totalUnits}                     sub="Senate approved"           accent="#3B82F6" />
        <StatCard label="Courses Taken"    value={results.length}                     sub={`${approved.length} approved`} accent="#D4A017" />
        <StatCard label="Pending Approval" value={results.length - approved.length}   sub="Awaiting senate"          accent="#8B5CF6" />
      </div>

      {/* GPA Trend chart — only show if we have enough data */}
      {gpaChartData.length >= 2 && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm text-white">GPA Progression</h3>
          </div>
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gpaChartData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00A85A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00A85A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                <XAxis dataKey="sem" tick={{ fill: chart.tick, fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0, 5]} tick={{ fill: chart.tick, fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<GlassTooltip/>}/>
                <Area type="monotone" dataKey="gpa" name="GPA" stroke="#00A85A" strokeWidth={2.5}
                  fill="url(#gpaGrad)"
                  dot={{ fill:'#00A85A', r:5, strokeWidth:0 }}
                  activeDot={{ r:7, stroke:'rgba(0,168,90,0.3)', strokeWidth:3 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts row */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Score bar chart */}
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-sm text-white">Course Scores</h3>
              <p className="text-[11px] text-white/35 mt-0.5">Showing latest {scoreChart.length} results</p>
            </div>
            <div className="p-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreChart} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid}/>
                  <XAxis dataKey="code" tick={{ fill: chart.tick, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill: chart.tick, fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<GlassTooltip/>}/>
                  <Bar dataKey="score" name="Score" radius={[4,4,0,0]}>
                    {scoreChart.map((e,i)=>(
                      <Cell key={i} fill={GRADE_MAP[e.grade]?.color || '#888'} opacity={0.85}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grade distribution donut */}
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-sm text-white">Grade Distribution</h3>
            </div>
            <div className="p-5 flex items-center gap-4">
              <div className="h-44 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gradeChartData} cx="50%" cy="50%" innerRadius={44} outerRadius={70}
                      dataKey="count" paddingAngle={2} strokeWidth={0}>
                      {gradeChartData.map((e,i)=><Cell key={i} fill={e.color} opacity={0.85}/>)}
                    </Pie>
                    <Tooltip content={<GlassTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-shrink-0">
                {gradeChartData.map(d=>(
                  <div key={d.grade} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:d.color}}/>
                    <span className="text-white/50 w-6">{d.grade}</span>
                    <span className="font-bold text-white">{d.count}</span>
                    <span className="text-white/30 text-[10px]">{GRADE_MAP[d.grade]?.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07]">
          {([
            { key:'all',        label:'All Results'  },
            { key:'transcript', label:'Transcript'   },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab===key ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filters — only on All Results tab */}
        {tab === 'all' && (
          <>
            <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
              className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
              <option value="all">All Sessions</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}
              className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
              <option value="all">Both Semesters</option>
              <option value="first">First Semester</option>
              <option value="second">Second Semester</option>
            </select>
          </>
        )}
      </div>

      {/* ── ALL RESULTS TAB ── */}
      {tab === 'all' && (
        isLoading ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="glass rounded-xl h-14 skeleton"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
            <IconResults size={56} className="text-white/10 mx-auto mb-5"/>
            <h3 className="text-base font-bold text-white/50 mb-2">No Results Available Yet</h3>
            <p className="text-sm text-white/30 max-w-sm mx-auto leading-relaxed">
              Your results will appear here once your lecturers upload them and they are approved by the senate.
            </p>
            <div className="mt-6 glass border border-white/[0.08] rounded-xl px-5 py-4 inline-block text-left">
              <p className="text-xs text-white/40 font-semibold mb-2">What to do now:</p>
              <div className="space-y-1.5">
                {[
                  'Ensure you are registered for courses this semester',
                  'Contact your lecturer if results are overdue',
                  'Visit the Examinations Office for inquiries',
                ].map((s,i)=>(
                  <div key={i} className="flex items-start gap-2 text-xs text-white/30">
                    <span className="text-primary-light font-bold">{i+1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Mobile card list */}
            <div className="md:hidden p-3 flex flex-col gap-2.5">
              <MobileListMeta>{filtered.length} results</MobileListMeta>
              {filtered.map((r: any) => {
                const gradeInfo = GRADE_MAP[r.grade]
                const total = parseFloat(r.total_score) || 0
                return (
                  <MobileRow
                    key={r.id}
                    chevron={false}
                    leading={r.grade || '—'}
                    leadingClassName="bg-white/[0.06] font-extrabold text-base"
                    leadingStyle={{ color: gradeInfo?.color || '#888' }}
                    title={r.course_code}
                    subtitle={r.course_title}
                    caption={`${r.session} · ${r.semester} sem · ${r.credit_units} units · Total ${total.toFixed(1)}`}
                    badge={{
                      label: r.is_senate_approved ? 'Approved' : 'Pending',
                      className: r.is_senate_approved ? 'bg-primary/15 text-primary-light' : 'bg-amber-500/15 text-amber-400',
                    }}
                  />
                )
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-5 py-4 font-semibold text-left">Course</th>
                    <th className="px-5 py-4 font-semibold text-left hidden md:table-cell">Session</th>
                    <th className="px-5 py-4 font-semibold text-center hidden sm:table-cell">Units</th>
                    <th className="px-5 py-4 font-semibold text-right hidden md:table-cell">CA</th>
                    <th className="px-5 py-4 font-semibold text-right hidden md:table-cell">Exam</th>
                    <th className="px-5 py-4 font-semibold text-right">Total</th>
                    <th className="px-5 py-4 font-semibold text-center">Grade</th>
                    <th className="px-5 py-4 font-semibold text-center hidden sm:table-cell">GP</th>
                    <th className="px-5 py-4 font-semibold text-center hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((r: any) => {
                    const gradeInfo = GRADE_MAP[r.grade]
                    const total = parseFloat(r.total_score) || 0
                    const scoreColor = total >= 70 ? '#00A85A' : total >= 50 ? '#D4A017' : '#EF4444'
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-xs font-mono text-primary-light">{r.course_code}</div>
                          <div className="text-[11px] text-white/50 truncate max-w-[160px] mt-0.5">{r.course_title}</div>
                          {r.remarks && <div className="text-[10px] text-white/30 italic mt-0.5">{r.remarks}</div>}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="text-xs text-white/50">{r.session}</div>
                          <div className="text-[11px] text-white/30 capitalize">{r.semester}</div>
                        </td>
                        <td className="px-5 py-4 text-center text-white/50 hidden sm:table-cell">{r.credit_units}</td>
                        <td className="px-5 py-4 text-right text-white/50 hidden md:table-cell">{parseFloat(r.ca_score).toFixed(1)}</td>
                        <td className="px-5 py-4 text-right text-white/50 hidden md:table-cell">{parseFloat(r.exam_score).toFixed(1)}</td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-base font-extrabold" style={{ color: scoreColor }}>{total.toFixed(1)}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-extrabold" style={{ color: gradeInfo?.color || '#888' }}>{r.grade}</span>
                            <span className="text-[9px] text-white/30 leading-none">{gradeInfo?.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center text-white/60 hidden sm:table-cell font-mono">{parseFloat(r.grade_point).toFixed(1)}</td>
                        <td className="px-5 py-4 text-center hidden md:table-cell">
                          {r.is_senate_approved ? (
                            <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary-light">
                              <IconCheck size={11}/> Approved
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-400">
                              <IconClock size={11}/> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Footer row with totals */}
                {filtered.length > 0 && (() => {
                  const filtApproved = filtered.filter(r => r.is_senate_approved)
                  const fUnits = filtApproved.reduce((s,r) => s + (r.credit_units||0), 0)
                  const fGP    = filtApproved.reduce((s,r) => s + (r.grade_point*(r.credit_units||0)), 0)
                  const fGPA   = fUnits > 0 ? fGP / fUnits : 0
                  return (
                    <tfoot>
                      <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                        <td className="px-5 py-3" colSpan={2}>
                          <span className="text-xs font-bold text-white/50">Semester Total</span>
                        </td>
                        <td className="px-5 py-3 text-center hidden sm:table-cell">
                          <span className="text-xs font-bold text-white">{fUnits}</span>
                        </td>
                        <td colSpan={3} className="hidden md:table-cell"/>
                        <td className="px-5 py-3 text-center" colSpan={2}>
                          <span className="text-xs font-bold" style={{ color: '#00A85A' }}>
                            GPA: {fGPA.toFixed(2)}
                          </span>
                        </td>
                        <td className="hidden md:table-cell"/>
                      </tr>
                    </tfoot>
                  )
                })()}
              </table>
            </div>
          </div>
        )
      )}

      {/* ── TRANSCRIPT TAB ── */}
      {tab === 'transcript' && (
        loadingTranscript ? (
          <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="glass rounded-2xl h-40 skeleton"/>)}</div>
        ) : !transcript ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
            <IconGradCap size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">No approved results yet. Results appear here once senate-approved.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Student info banner */}
            <div className="glass border border-primary/20 rounded-2xl overflow-hidden">
              <div className="px-7 py-5"
                style={{ background:'linear-gradient(135deg,rgba(0,107,63,0.15),rgba(0,40,25,0.2))' }}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{student?.name}</h3>
                    <p className="text-white/50 text-sm font-mono mt-0.5">{student?.matric_number}</p>
                    <p className="text-white/40 text-xs mt-1">{student?.department} · Level {student?.level}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center w-full sm:w-auto">
                    {[
                      { label:'CGPA',          value: student?.cgpa?.toFixed(2) || cgpa.toFixed(2), color:'#00A85A' },
                      { label:'Units Earned',  value: student?.total_units_earned || totalUnits,     color:'#3B82F6' },
                      { label:'Classification',value: classify(student?.cgpa || cgpa),              color:'#D4A017' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="glass rounded-xl p-3">
                        <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
                        <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Session-by-session breakdown */}
            {Object.entries(transcriptSessions).length === 0 ? (
              <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
                <IconGradCap size={40} className="text-white/15 mx-auto mb-3"/>
                <p className="text-white/40 text-sm">No senate-approved results on transcript yet.</p>
              </div>
            ) : Object.entries(transcriptSessions).sort(([a],[b])=>a.localeCompare(b)).map(([session, data]: [string, any]) => (
              <div key={session} className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                {/* Session header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between"
                  style={{ background:'rgba(0,107,63,0.05)' }}>
                  <h3 className="font-bold text-sm text-white">{session}</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-white/40">Units: <span className="font-bold text-white">{data.total_units}</span></span>
                    <span className="text-white/40">GPA: <span className="font-extrabold text-primary-light">{data.gpa?.toFixed(2)}</span></span>
                  </div>
                </div>

                {/* Courses table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-white/25">
                        <th className="px-5 py-2.5 font-semibold text-left">Course</th>
                        <th className="px-5 py-2.5 font-semibold text-center">Units</th>
                        <th className="px-5 py-2.5 font-semibold text-right hidden sm:table-cell">CA</th>
                        <th className="px-5 py-2.5 font-semibold text-right hidden sm:table-cell">Exam</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                        <th className="px-5 py-2.5 font-semibold text-center">Grade</th>
                        <th className="px-5 py-2.5 font-semibold text-center">GP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {(data.courses || []).map((c: any, i: number) => {
                        const gi = GRADE_MAP[c.grade]
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-bold text-xs font-mono text-primary-light">{c.code}</div>
                              <div className="text-[11px] text-white/45 truncate max-w-[160px]">{c.title}</div>
                            </td>
                            <td className="px-5 py-3 text-center text-white/50 text-xs">{c.credit_units}</td>
                            <td className="px-5 py-3 text-right text-white/40 text-xs hidden sm:table-cell">{c.ca?.toFixed(1)}</td>
                            <td className="px-5 py-3 text-right text-white/40 text-xs hidden sm:table-cell">{c.exam?.toFixed(1)}</td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-sm font-extrabold" style={{ color: gi?.color||'#888' }}>{c.total?.toFixed(1)}</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-base font-extrabold" style={{ color: gi?.color||'#888' }}>{c.grade}</span>
                            </td>
                            <td className="px-5 py-3 text-center text-white/60 text-xs font-mono">{c.grade_point?.toFixed(1)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/[0.06] bg-white/[0.02]">
                        <td className="px-5 py-2.5 text-xs font-bold text-white/50">Session Total</td>
                        <td className="px-5 py-2.5 text-center text-xs font-bold text-white">{data.total_units}</td>
                        <td colSpan={3} className="hidden sm:table-cell"/>
                        <td colSpan={2} className="px-5 py-2.5 text-center">
                          <span className="text-xs font-extrabold text-primary-light">GPA {data.gpa?.toFixed(2)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}

            {/* Final CGPA row */}
            <div className="glass border border-primary/25 rounded-2xl px-7 py-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Cumulative GPA (CGPA)</p>
                <p className="text-4xl font-extrabold text-primary-light">{student?.cgpa?.toFixed(2) || cgpa.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Classification</p>
                <p className="text-lg font-extrabold text-white">{classify(student?.cgpa || cgpa)}</p>
                <p className="text-xs text-white/35 mt-0.5">{student?.total_units_earned || totalUnits} credit units earned</p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
