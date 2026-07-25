/**
 * FUGUSAU Portal — Dashboard (Role-Aware)
 * Admin  → Institutional overview: student counts, fees, results, activity
 * Student → Personal: GPA, courses, fees, timetable
 * Lecturer → Teaching: courses taught, result uploads pending
 * Parent  → Ward summary
 */
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  IconDashboard, IconCourses, IconResults, IconFees, IconWarning, IconTrendUp, IconTrendDown,
  IconCalendar, IconTarget, IconClock, IconAI, IconNotifications, IconChevronRight,
  IconBookOpen, IconCheck, IconUser, IconBuilding, IconReports, IconPayment,
  IconGradCap, IconCredentials, IconStar, IconPlus,
} from '@/components/icons'
import { studentsAPI, coursesAPI, examsAPI, feesAPI, reportsAPI, notificationsAPI } from '@/services/api'
import { useChartTheme } from '@/hooks/useChartTheme'
import ParentDashboardPage from '@/pages/ParentDashboardPage'

// ── Extra icons ──────────────────────────────────────────────────────────────
function IconStudents(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconDepts(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
    </svg>
  )
}
function IconStaff(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className} style={p.style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <line x1="12" y1="11" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] shadow-glass text-xs space-y-1">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color || '#00A85A' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

function StatCard({ Icon, value, label, change, up, accent = '#00A85A', to }: {
  Icon: React.FC<any>; value: string | number; label: string
  change?: string; up?: boolean; accent?: string; to?: string
}) {
  const inner = (
    <div className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden cursor-default h-full">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: accent }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${accent}22`, border: `1px solid ${accent}40` }}>
        <Icon size={20}  color={accent } />
      </div>
      <div className="text-3xl font-extrabold text-white mb-1 leading-none">{value}</div>
      <div className="text-xs text-white/45">{label}</div>
      {change && (
        <div className={`text-[11px] mt-2.5 flex items-center gap-1 font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />} {change}
        </div>
      )}
    </div>
  )
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <h3 className="font-bold text-sm text-white">{title}</h3>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-[11px] text-primary-light/70 hover:text-primary-light transition-colors">
          View All <IconChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const MONTHLY_REG = [
  { month: 'Oct', students: 210 }, { month: 'Nov', students: 340 },
  { month: 'Dec', students: 180 }, { month: 'Jan', students: 890 },
  { month: 'Feb', students: 1240 }, { month: 'Mar', students: 980 },
  { month: 'Apr', students: 670 }, { month: 'May', students: 420 },
]
const FEE_COLLECTION = [
  { month: 'Oct', collected: 12400000, outstanding: 4200000 },
  { month: 'Nov', collected: 18700000, outstanding: 3800000 },
  { month: 'Dec', collected: 9200000,  outstanding: 5100000 },
  { month: 'Jan', collected: 42000000, outstanding: 12000000 },
  { month: 'Feb', collected: 58000000, outstanding: 8500000 },
  { month: 'Mar', collected: 38000000, outstanding: 6200000 },
]
const DEPT_ENROLLMENT = [
  { dept: 'CSC',  students: 842 },
  { dept: 'EEE',  students: 623 },
  { dept: 'CIV',  students: 511 },
  { dept: 'ACC',  students: 734 },
  { dept: 'LAW',  students: 489 },
  { dept: 'MED',  students: 312 },
  { dept: 'BUS',  students: 678 },
]
const GENDER_PIE = [
  { name: 'Male',   value: 6820, fill: '#3B82F6' },
  { name: 'Female', value: 5410, fill: '#EC4899' },
]
const LEVEL_PIE = [
  { name: '100L', value: 2840, fill: '#00A85A' },
  { name: '200L', value: 2610, fill: '#3B82F6' },
  { name: '300L', value: 2390, fill: '#D4A017' },
  { name: '400L', value: 2180, fill: '#8B5CF6' },
  { name: '500L', value: 210,  fill: '#EF4444' },
]
const RECENT_ACTIVITY = [
  { type: 'result',  msg: 'CSC401 results uploaded by Dr. Suleiman',      time: '5 min ago',  color: '#00A85A' },
  { type: 'fee',     msg: '₦2.4M fee payments verified today',            time: '12 min ago', color: '#D4A017' },
  { type: 'student', msg: '3 new student profiles created',               time: '1 hour ago', color: '#3B82F6' },
  { type: 'cred',    msg: 'Transcript request approved — ADM/2024/0021',  time: '2 hours ago',color: '#8B5CF6' },
  { type: 'hostel',  msg: '7 hostel allocation approvals pending',        time: '3 hours ago',color: '#EF4444' },
  { type: 'result',  msg: 'Senate approved 2024/2025 Semester 1 results', time: 'Yesterday',  color: '#00A85A' },
]

function AdminDashboard({ user }: { user: any }) {
  const chart = useChartTheme()
  const { data: statsData }  = useQuery<any, any>({ queryKey: ['admin-stats'],      queryFn: studentsAPI.getStats })
  const { data: feeData }    = useQuery<any, any>({ queryKey: ['admin-fee-report'],  queryFn: () => reportsAPI.getFeeReport() })
  const { data: enrollData } = useQuery<any, any>({ queryKey: ['admin-enroll-report'], queryFn: () => reportsAPI.getEnrollmentReport() })

  const stats = statsData?.data
  const totalStudents  = stats?.total_students        || enrollData?.data?.total_students  || 12230
  const totalDepts     = stats?.total_departments     || enrollData?.data?.total_departments || 48
  const feeCollected   = stats?.total_fees_collected  || feeData?.data?.total_collected   || 158400000
  const feeOutstanding = stats?.total_fees_outstanding || feeData?.data?.total_outstanding || 34200000
  const collectionRate = stats?.fee_collection_rate   || feeData?.data?.collection_rate   || 82

  return (
    <div className="space-y-5 animate-fade-in max-w-[1400px]">

      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            Welcome, <span className="text-gradient-green">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-white/40 text-sm mt-1">Institutional overview · 2025/2026 Academic Session</p>
        </div>
        <div className="glass rounded-xl px-4 py-2 border border-white/[0.08]">
          <span className="text-xs font-mono text-amber-400">2025/2026 · 2nd Semester</span>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard Icon={IconStudents} value={totalStudents.toLocaleString()} label="Total Students"    change="+312 this session"  up={true}  accent="#00A85A" to="/admin/students" />
        <StatCard Icon={IconDepts}    value={totalDepts}                      label="Departments"       change="8 Faculties"        up={true}  accent="#3B82F6" to="/admin/departments" />
        <StatCard Icon={IconFees}     value={`₦${(feeCollected/1000000).toFixed(1)}M`} label="Fees Collected" change={`${collectionRate}% rate`} up={true} accent="#D4A017" to="/admin/fees" />
        <StatCard Icon={IconWarning}  value={`₦${(feeOutstanding/1000000).toFixed(1)}M`} label="Outstanding Fees" change="Needs follow-up" up={false} accent="#EF4444" to="/admin/fees" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard Icon={IconStaff}       value={stats?.total_staff || 847}    label="Academic Staff"      change="+12 new"         up={true}  accent="#8B5CF6" to="/admin/staff" />
        <StatCard Icon={IconCourses}     value={stats?.total_courses || 312}  label="Active Courses"      change="2nd semester"    up={true}  accent="#3B82F6" to="/admin/courses" />
        <StatCard Icon={IconResults}     value={stats?.pending_results || 0}  label="Pending Approvals"   change="Results & creds" up={false} accent="#F97316" to="/admin/results" />
        <StatCard Icon={IconCredentials} value={stats?.pending_credential_requests || 0} label="Credential Requests" change="Needs action" up={true} accent="#EC4899" to="/credentials" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Fee Collection Bar Chart */}
        <div className="lg:col-span-2 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Fee Collection Overview" to="/admin/fees" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FEE_COLLECTION} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₦${(v/1000000).toFixed(0)}M`} tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} formatter={(v: any) => `₦${(v/1000000).toFixed(2)}M`} />
                <Legend formatter={v => <span style={{ color: chart.legend, fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="collected"   name="Collected"   fill="#00A85A" opacity={0.85} radius={[4,4,0,0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#EF4444" opacity={0.7}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender split donut */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Student Demographics" />
          <div className="p-5 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={GENDER_PIE} cx="50%" cy="50%" innerRadius={44} outerRadius={68}
                  dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {GENDER_PIE.map((e, i) => <Cell key={i} fill={e.fill} opacity={0.85} />)}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {GENDER_PIE.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                  <span className="text-white/50">{d.name}</span>
                </div>
                <span className="font-bold text-white">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Enrollment by Department */}
        <div className="lg:col-span-3 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Enrollment by Department (Top 7)" to="/admin/departments" />
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPT_ENROLLMENT} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dept" tick={{ fill: chart.tickStrong, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="students" name="Students" radius={[0,4,4,0]}>
                  {DEPT_ENROLLMENT.map((_, i) => (
                    <Cell key={i} fill={['#00A85A','#3B82F6','#D4A017','#8B5CF6','#EC4899','#F97316','#06B6D4'][i % 7]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Level distribution */}
        <div className="lg:col-span-2 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Students by Level" />
          <div className="p-5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                data={LEVEL_PIE.map(d => ({ ...d, value: d.value }))}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: chart.barTrack }}>
                  {LEVEL_PIE.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </RadialBar>
                <Tooltip content={<GlassTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-4 grid grid-cols-3 gap-2">
            {LEVEL_PIE.map(d => (
              <div key={d.name} className="text-center">
                <div className="text-xs font-bold" style={{ color: d.fill }}>{d.name}</div>
                <div className="text-[10px] text-white/35">{d.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly registration trend + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Registration trend */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Monthly Course Registrations" />
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_REG} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00A85A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00A85A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Area type="monotone" dataKey="students" name="Registrations" stroke="#00A85A" strokeWidth={2.5}
                  fill="url(#regGrad)" dot={{ fill: '#00A85A', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: 'rgba(0,168,90,0.3)', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Recent Activity" />
          <div className="p-5 space-y-3">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 leading-relaxed">{a.msg}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick action tiles */}
      <div className="glass border border-white/[0.07] rounded-2xl p-5">
        <h3 className="font-bold text-sm text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Approve Results',    Icon: IconResults,     color: '#00A85A', to: '/admin/results'     },
            { label: 'Fee Report',         Icon: IconFees,        color: '#D4A017', to: '/admin/fees'        },
            { label: 'Add Student',        Icon: IconStudents,    color: '#3B82F6', to: '/admin/students'    },
            { label: 'Schedule Exam',      Icon: IconCalendar,    color: '#8B5CF6', to: '/admin/exams'       },
            { label: 'Manage Hostels',     Icon: IconCredentials, color: '#EC4899', to: '/admin/hostel'      },
            { label: 'Admissions',         Icon: IconGradCap,     color: '#F97316', to: '/admin/admissions'  },
          ].map(({ label, Icon, color, to }) => (
            <Link key={label} to={to}
              className="glass glass-hover border border-white/[0.07] rounded-xl p-4 text-center flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                <Icon size={18}  />
              </div>
              <span className="text-[11px] text-white/60 font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const GPA_HISTORY = [
  { sem: '100L-1', gpa: 3.20 }, { sem: '100L-2', gpa: 3.45 },
  { sem: '200L-1', gpa: 3.55 }, { sem: '200L-2', gpa: 3.61 },
  { sem: '300L-1', gpa: 3.68 }, { sem: '300L-2', gpa: 3.74 },
]
const COURSE_SCORES = [
  { code: 'CSC301', score: 78 }, { code: 'CSC302', score: 72 },
  { code: 'MTH302', score: 58 }, { code: 'CSC303', score: 81 }, { code: 'ENG301', score: 75 },
]
const ATTEND_DATA = [
  { name: 'CSC301', pct: 95, fill: '#00A85A' }, { name: 'CSC302', pct: 88, fill: '#3B82F6' },
  { name: 'MTH302', pct: 82, fill: '#D4A017' }, { name: 'CSC303', pct: 93, fill: '#8B5CF6' },
]
const TIMETABLE = [
  { day: 'Mon', slots: [{ code: 'CSC301', time: '8–10AM', color: '#00A85A' }] },
  { day: 'Tue', slots: [{ code: 'CSC302', time: '10–12', color: '#3B82F6' }] },
  { day: 'Wed', slots: [{ code: 'CSC301', time: '8–10AM', color: '#00A85A' }, { code: 'MTH302', time: '2–4PM', color: '#D4A017' }] },
  { day: 'Thu', slots: [{ code: 'CSC302', time: '10–12', color: '#3B82F6' }, { code: 'CSC303', time: '2–4PM', color: '#8B5CF6' }] },
  { day: 'Fri', slots: [{ code: 'MTH302', time: '9–11AM', color: '#D4A017' }] },
]
const AI_INSIGHTS = [
  { tag: 'At-Risk',   tagBg: 'bg-red-500/15 text-red-400',          text: 'Your MTH302 score trend shows difficulty. Attend the tutorial this Wednesday at 2PM.' },
  { tag: 'Strong',    tagBg: 'bg-primary/15 text-primary-light',     text: 'CSC301 — you\'re in the top 8% of your class. Outstanding work!' },
  { tag: 'Library',   tagBg: 'bg-blue-500/15 text-blue-400',         text: '3 new eBooks for your courses are available. Check your library.' },
]
const NOTIFS = [
  { Icon: IconResults,       color: '#00A85A', msg: 'CSC301 mid-semester result uploaded',    time: '2h ago',   unread: true  },
  { Icon: IconFees,          color: '#D4A017', msg: 'Fee payment deadline — 23 days left',    time: '6h ago',   unread: true  },
  { Icon: IconBookOpen,      color: '#3B82F6', msg: 'New eBook: Algorithm Design Manual',     time: 'Yesterday',unread: false },
  { Icon: IconCalendar,      color: '#EF4444', msg: 'Exam timetable published',               time: '2 days ago',unread: false },
]

function StudentDashboard({ user }: { user: any }) {
  const chart = useChartTheme()
  const { data: student }     = useQuery<any, any>({ queryKey: ['student-profile'],  queryFn: studentsAPI.getProfile })
  const { data: enrollments } = useQuery<any, any>({ queryKey: ['enrollments'],      queryFn: coursesAPI.getEnrollments })
  const { data: invoices }    = useQuery<any, any>({ queryKey: ['invoices'],         queryFn: feesAPI.getInvoices })

  const profile  = student?.data
  const courses  = enrollments?.data?.results || []
  const invoice  = invoices?.data?.results?.[0]
  const cgpa     = profile?.cgpa ? parseFloat(profile.cgpa).toFixed(2) : '3.74'

  return (
    <div className="space-y-5 animate-fade-in max-w-[1400px]">
      {/* Fee alert */}
      {invoice && invoice.status !== 'paid' && (
        <div className="glass border border-amber-500/25 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <IconWarning size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-400 text-sm">Fee Reminder</span>
            <span className="text-white/50 text-sm"> — Outstanding: </span>
            <span className="font-bold text-amber-400 text-sm">₦{parseFloat(invoice?.balance||0).toLocaleString()}</span>
          </div>
          <Link to="/fees" className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            Pay Now
          </Link>
        </div>
      )}

      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            Good morning, <span className="text-gradient-green">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-white/40 text-sm mt-1">Here's your academic snapshot for today.</p>
        </div>
        <div className="glass rounded-xl px-4 py-2 border border-white/[0.08] hidden md:block">
          <span className="text-xs font-mono text-amber-400">2025/2026 · 2nd Semester</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard Icon={IconCourses}  value={courses.length || 8} label="Registered Courses" change="All active"              up={true}  accent="#00A85A" to="/courses" />
        <StatCard Icon={IconTarget}   value={cgpa}               label="Current CGPA"         change="+0.12 from last sem"   up={true}  accent="#3B82F6" to="/results" />
        <StatCard Icon={IconFees}     value={invoice ? `₦${parseFloat(invoice.balance).toLocaleString()}` : '₦45,000'} label="Outstanding Fees" change="Due soon" up={false} accent="#D4A017" to="/fees" />
        <StatCard Icon={IconCheck}    value="92%"                label="Attendance Rate"      change="Above 75% threshold"  up={true}  accent="#8B5CF6" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* GPA trend */}
        <div className="lg:col-span-2 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="GPA Progression" to="/results" />
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GPA_HISTORY} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00A85A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00A85A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="sem" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[2.5, 4]} tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Area type="monotone" dataKey="gpa" stroke="#00A85A" strokeWidth={2.5}
                  fill="url(#gpaGrad)" dot={{ fill: '#00A85A', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: 'rgba(0,168,90,0.3)', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CGPA ring */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Academic Performance" />
          <div className="p-5">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke={chart.ring} strokeWidth="12" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="url(#cgpaArc)" strokeWidth="12"
                  strokeLinecap="round" strokeDasharray={`${(parseFloat(cgpa)/5)*301.6} 301.6`} />
                <defs>
                  <linearGradient id="cgpaArc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00A85A" /><stop offset="100%" stopColor="#F5C842" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-primary-light">{cgpa}</span>
                <span className="text-[10px] text-white/40">CGPA / 5.0</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Credit Units', value: '30/36', pct: 83,  color: '#00A85A' },
                { label: 'Attendance',   value: '92%',   pct: 92,  color: '#3B82F6' },
                { label: 'Assignments',  value: '11/12', pct: 92,  color: '#8B5CF6' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/45">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: `linear-gradient(90deg,${item.color}99,${item.color})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Course scores + Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Course Scores" to="/results" />
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COURSE_SCORES} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="code" tick={{ fill: chart.tick, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="score" radius={[4,4,0,0]}>
                  {COURSE_SCORES.map((e,i) => (
                    <Cell key={i} fill={e.score>=70?'#00A85A':e.score>=60?'#D4A017':'#EF4444'} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Weekly Timetable" to="/exams" />
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {TIMETABLE.map(({ day }) => (
                <div key={day} className="text-center text-[10px] font-bold text-white/30 uppercase tracking-wider pb-2">{day}</div>
              ))}
              {TIMETABLE.map(({ day, slots }) => (
                <div key={day} className="space-y-1.5 min-h-[80px]">
                  {slots.map(s => (
                    <div key={s.code} className="rounded-lg p-2 text-center text-[10px] border"
                      style={{ background: `${s.color}15`, borderColor: `${s.color}40`, color: s.color }}>
                      <div className="font-bold font-mono">{s.code}</div>
                      <div className="opacity-70 mt-0.5">{s.time}</div>
                    </div>
                  ))}
                  {slots.length === 0 && <div className="rounded-lg border border-dashed border-white/[0.06] h-14" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI insights + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <IconAI size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-white">AI Academic Advisor</span>
          </div>
          <div className="p-5 space-y-3">
            {AI_INSIGHTS.map(ins => (
              <div key={ins.tag} className="glass rounded-xl p-4 border border-white/[0.05]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ins.tagBg} inline-block mb-2`}>{ins.tag}</span>
                <p className="text-xs text-white/50 leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader title="Recent Notifications" to="/notifications" />
          <div className="p-5 space-y-3">
            {NOTIFS.map((n, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${n.color}18`, border: `1px solid ${n.color}35` }}>
                  <n.Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed ${n.unread ? 'text-white font-semibold' : 'text-white/55'}`}>{n.msg}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{n.time}</p>
                </div>
                {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-primary-light mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LECTURER DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const UPLOAD_STATUS = [
  { code: 'CSC401', title: 'Advanced Algorithms',    uploaded: true,  approved: true  },
  { code: 'CSC403', title: 'Software Engineering',   uploaded: true,  approved: false },
  { code: 'CSC405', title: 'Computer Networks',      uploaded: false, approved: false },
  { code: 'MTH401', title: 'Numerical Methods',      uploaded: false, approved: false },
]

function LecturerDashboard({ user }: { user: any }) {
  const chart = useChartTheme()
  const { data: profileData } = useQuery<any, any>({
    queryKey: ['lecturer-profile'],
    queryFn:  studentsAPI.getLecturerProfile,
  })
  const { data: coursesData } = useQuery<any, any>({
    queryKey: ['lecturer-courses'],
    queryFn:  () => coursesAPI.list({ lecturer: 'me' }),
  })
  const { data: resultsData } = useQuery<any, any>({
    queryKey: ['lecturer-results'],
    queryFn:  () => examsAPI.getResults({ lecturer: 'me' }),
  })
  const { data: clearanceData } = useQuery<any, any>({
    queryKey: ['lecturer-clearances'],
    queryFn:  examsAPI.getClearances,
  })

  const profile    = profileData?.data
  const courses: any[]    = coursesData?.data?.results   || coursesData?.data   || []
  const results: any[]    = resultsData?.data?.results   || resultsData?.data   || []
  const clearances: any[] = clearanceData?.data?.results || clearanceData?.data || []

  const pendingClearances = clearances.filter((c: any) => !c.is_cleared)
  const uploadedCount     = UPLOAD_STATUS.filter(u => u.uploaded).length
  const approvedCount     = UPLOAD_STATUS.filter(u => u.approved).length

  // Grade distribution from results
  const gradeMap: Record<string, number> = {}
  results.forEach((r: any) => { gradeMap[r.grade] = (gradeMap[r.grade] || 0) + 1 })
  const gradeChartData = Object.entries(gradeMap).map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => a.grade.localeCompare(b.grade))

  const GRADE_COLORS: Record<string, string> = {
    A:'#00A85A','A-':'#00A85A','B+':'#3B82F6',B:'#3B82F6','B-':'#3B82F6',
    'C+':'#D4A017',C:'#D4A017','C-':'#D4A017',D:'#F97316',E:'#EF4444',F:'#EF4444',
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-[1400px]">

      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            Welcome, <span className="text-gradient-green">{profile?.rank ? `${profile.rank} ` : ''}{user?.name?.split(' ').slice(-1)[0]}</span>
          </h2>
          <p className="text-white/40 text-sm mt-1">Teaching dashboard · 2025/2026 2nd Semester</p>
        </div>
        <div className="glass rounded-xl px-4 py-2 border border-white/[0.08]">
          <span className="text-xs font-mono text-amber-400">2025/2026 · 2nd Semester</span>
        </div>
      </div>

      {/* Pending clearances alert */}
      {pendingClearances.length > 0 && (
        <div className="glass border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3">
          <IconWarning size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-bold">{pendingClearances.length}</span> students are awaiting exam clearance approval from you.
          </p>
          <Link to="/admin/exams" className="ml-auto flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            Review
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard Icon={IconCourses}  value={courses.length || UPLOAD_STATUS.length} label="Courses Assigned"     change="This semester"           up={true}  accent="#00A85A" to="/admin/courses" />
        <StatCard Icon={IconResults}  value={results.length || 0}                    label="Results Uploaded"      change={`${uploadedCount}/${UPLOAD_STATUS.length} courses`} up={uploadedCount === UPLOAD_STATUS.length} accent="#3B82F6" to="/admin/results" />
        <StatCard Icon={IconCheck}    value={approvedCount}                           label="Senate Approved"       change={`${UPLOAD_STATUS.length - approvedCount} pending`} up={approvedCount === UPLOAD_STATUS.length} accent="#D4A017" to="/admin/results" />
        <StatCard Icon={IconCalendar} value={pendingClearances.length}               label="Pending Clearances"    change="Needs your action"       up={false} accent="#EF4444" to="/admin/exams" />
      </div>

      {/* Result upload status + grade distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Result upload status */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Result Upload Status</h3>
            <Link to="/admin/results"
              className="text-[11px] text-primary-light/70 hover:text-primary-light flex items-center gap-1">
              Upload <IconChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {UPLOAD_STATUS.map(u => (
              <div key={u.code} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary-light">{u.code}</span>
                    {u.approved && (
                      <span className="text-[10px] bg-primary/15 text-primary-light border border-primary/25 px-1.5 py-0.5 rounded-full font-semibold">Senate Approved</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{u.title}</p>
                </div>
                <div className="flex-shrink-0">
                  {u.uploaded ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-light">
                      <IconCheck size={13} /> Uploaded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <IconWarning size={13} /> Not uploaded
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade distribution bar chart */}
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm text-white">Grade Distribution (All Courses)</h3>
          </div>
          <div className="p-5 h-52">
            {gradeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="grade" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {gradeChartData.map((e, i) => (
                      <Cell key={i} fill={GRADE_COLORS[e.grade] || '#888'} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <IconResults size={36} className="text-white/15 mb-3" />
                <p className="text-white/35 text-sm">No results uploaded yet</p>
                <Link to="/admin/results" className="mt-3 btn-primary rounded-xl px-5 py-2 text-xs font-bold text-white flex items-center gap-2">
                  <IconPlus size={13} /> Upload Results
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass border border-white/[0.07] rounded-2xl p-5">
        <h3 className="font-bold text-sm text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Upload Results',     Icon: IconResults,   color: '#00A85A', to: '/admin/results'  },
            { label: 'View Exam Schedule', Icon: IconCalendar,  color: '#3B82F6', to: '/admin/exams'    },
            { label: 'Manage Courses',     Icon: IconCourses,   color: '#D4A017', to: '/admin/courses'  },
            { label: 'Generate Report',    Icon: IconReports,   color: '#8B5CF6', to: '/reports'        },
          ].map(({ label, Icon, color, to }) => (
            <Link key={label} to={to}
              className="glass glass-hover border border-white/[0.07] rounded-xl p-4 text-center flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                <Icon size={18}  />
              </div>
              <span className="text-[11px] text-white/60 font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT — Role router
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuthStore()
  const role = user?.role

  if (role === 'admin')    return <AdminDashboard    user={user} />
  if (role === 'lecturer') return <LecturerDashboard user={user} />
  if (role === 'parent')   return <ParentDashboardPage />
  return <StudentDashboard user={user} />
}
