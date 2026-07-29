import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Users, GraduationCap, DollarSign, BookOpen, TrendingUp, FileText, Megaphone,
  AlertCircle, Package, BookMarked, UserPlus, CalendarCheck, Receipt, BarChart3, Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import { dashboardApi, financeApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-xl px-3.5 py-2.5">
      <p className="text-[var(--text-3)] text-[11px] mb-0.5">{label}</p>
      <p className="font-mono font-semibold text-[var(--text)] text-sm">₦{payload[0].value.toLocaleString()}</p>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.getStats })
  const { data: finance } = useQuery({ queryKey: ['dashboard-finance'], queryFn: financeApi.getStats })

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const chartData = (finance?.monthly_breakdown || []).map((m) => ({
    month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    amount: m.amount,
  }))

  const attendanceRate = stats?.attendance_rate ?? 0
  const ringCircumference = 2 * Math.PI * 52

  const alerts = [
    (stats?.outstanding_fees_count ?? 0) > 0 && {
      href: '/app/fees', icon: AlertCircle, tone: 'warn',
      title: `${stats!.outstanding_fees_count} student${stats!.outstanding_fees_count === 1 ? '' : 's'} owing fees`,
      sub: `₦${stats!.outstanding_fees_total.toLocaleString()} outstanding`,
    },
    (stats?.overdue_books_count ?? 0) > 0 && {
      href: '/app/library', icon: BookMarked, tone: 'danger',
      title: `${stats!.overdue_books_count} book${stats!.overdue_books_count === 1 ? '' : 's'} overdue`,
      sub: 'Library needs follow-up',
    },
    (stats?.low_stock_count ?? 0) > 0 && {
      href: '/app/inventory', icon: Package, tone: 'warn',
      title: `${stats!.low_stock_count} item${stats!.low_stock_count === 1 ? '' : 's'} low on stock`,
      sub: 'Restock needed',
    },
  ].filter(Boolean) as { href: string; icon: React.ElementType; tone: 'warn' | 'danger'; title: string; sub: string }[]

  if (isLoading) return <SkeletonDashboard />

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-xl4 p-7 md:p-9 text-white" style={{ background: 'linear-gradient(135deg, #1B1F3B 0%, #12162A 55%, #0B0F14 100%)' }}>
        <div
          className="absolute inset-0 opacity-55"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, rgba(79,70,229,.55), transparent 45%), radial-gradient(circle at 85% 15%, rgba(6,182,212,.35), transparent 40%), radial-gradient(circle at 60% 90%, rgba(16,185,129,.25), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-white/60 text-sm mb-2">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight">{greeting}, {firstName}</h1>
            <p className="text-white/70 mt-2 max-w-md text-[15px]">
              {alerts.length > 0
                ? `${alerts.length} item${alerts.length === 1 ? ' needs' : 's need'} your attention today.`
                : "Everything's on track — no outstanding alerts today."}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex gap-2 flex-shrink-0">
            <Link to="/app/admissions" className="px-4 py-2.5 rounded-xl bg-white text-[#12162A] font-medium text-sm flex items-center gap-2 hover:bg-white/90 transition-colors">
              <UserPlus className="h-4 w-4" /> New Admission
            </Link>
            <Link to="/app/attendance" className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-medium text-sm flex items-center gap-2 hover:bg-white/20 transition-colors">
              <CalendarCheck className="h-4 w-4" /> Mark Attendance
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats?.total_students ?? 0} icon={Users} tone="primary" index={0} />
        <StatCard title="Teaching Staff" value={stats?.total_teachers ?? 0} icon={GraduationCap} tone="accent" index={1} />
        <StatCard title="Active Classes" value={stats?.total_classes ?? 0} icon={BookOpen} tone="warn" index={2} />
        <StatCard title="Revenue This Term" value={stats?.total_revenue ?? 0} prefix="₦" icon={DollarSign} tone="success" index={3} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {alerts.map((a, i) => (
            <motion.div key={a.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Link to={a.href} className="block">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', a.tone === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-warn-500/10 text-warn-600 dark:text-warn-300')}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)] text-sm truncate">{a.title}</p>
                      <p className="text-xs text-[var(--text-3)] truncate">{a.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Revenue + Attendance */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-4 w-4 text-primary-600 dark:text-primary-300" />
              <h3 className="font-display font-semibold text-[15px] text-[var(--text)]">Revenue Trend</h3>
            </div>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[var(--text-3)] text-sm">No revenue data yet this year</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar dataKey="amount" fill="url(#barFill)" radius={[8, 8, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <h3 className="font-display font-semibold text-[15px] text-[var(--text)] self-start mb-2">Attendance Today</h3>
            <div className="relative w-36 h-36 my-3">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" stroke="var(--border)" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none" strokeWidth="10" stroke="var(--indigo)" strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  initial={{ strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringCircumference - (attendanceRate / 100) * ringCircumference }}
                  transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-2xl text-[var(--text)]">{attendanceRate}%</span>
                <span className="text-[var(--text-3)] text-[11px]">present</span>
              </div>
            </div>
            <p className="text-[var(--text-2)] text-[13px] mb-4">{stats?.present_today ?? 0} of {stats?.total_today ?? 0} marked</p>
            <Link to="/app/attendance" className="text-sm font-medium text-primary-600 dark:text-primary-300 hover:underline">
              Mark Attendance →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Exams / Admissions / Announcements */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary-600 dark:text-primary-300" />
              <h3 className="font-display font-semibold text-[15px] text-[var(--text)]">Upcoming Exams</h3>
            </div>
            {(stats?.upcoming_exams?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--text-3)] py-4 text-center">No exams scheduled</p>
            ) : (
              <div className="space-y-3">
                {stats!.upcoming_exams.map((exam) => (
                  <div key={exam.id} className="flex justify-between items-center text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text)] truncate">{exam.name}</p>
                      <p className="text-[var(--text-3)] text-xs">{exam.class_name}</p>
                    </div>
                    <Badge variant="outline">{exam.start_date}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary-600 dark:text-primary-300" />
              <h3 className="font-display font-semibold text-[15px] text-[var(--text)]">Recent Admissions</h3>
            </div>
            {(stats?.recent_admissions?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--text-3)] py-4 text-center">No admissions yet</p>
            ) : (
              <div className="space-y-3">
                {stats!.recent_admissions.map((adm) => (
                  <div key={adm.id} className="flex justify-between items-center text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text)] truncate">{adm.applicant_name}</p>
                      <p className="text-[var(--text-3)] text-xs">{adm.class_applying}</p>
                    </div>
                    <Badge variant={adm.status === 'approved' ? 'success' : adm.status === 'rejected' ? 'danger' : 'warning'}>{adm.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="h-4 w-4 text-primary-600 dark:text-primary-300" />
              <h3 className="font-display font-semibold text-[15px] text-[var(--text)]">Announcements</h3>
            </div>
            {(stats?.recent_announcements?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--text-3)] py-4 text-center">No announcements</p>
            ) : (
              <div className="space-y-3">
                {stats!.recent_announcements.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="font-medium text-[var(--text)]">{a.title}</p>
                    <p className="text-[var(--text-3)] text-xs line-clamp-1">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions — plain navigation shortcuts to existing pages */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-300" />
            <h3 className="font-display font-semibold text-[15px] text-[var(--text)]">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/app/students" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-primary-500/10 transition-colors group">
              <UserPlus className="h-5 w-5 text-[var(--text-2)] group-hover:text-primary-600 dark:group-hover:text-primary-300" />
              <span className="text-[12px] font-medium text-[var(--text)]">Add Student</span>
            </Link>
            <Link to="/app/reports" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-primary-500/10 transition-colors group">
              <BarChart3 className="h-5 w-5 text-[var(--text-2)] group-hover:text-primary-600 dark:group-hover:text-primary-300" />
              <span className="text-[12px] font-medium text-[var(--text)]">Generate Report</span>
            </Link>
            <Link to="/app/notifications" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-primary-500/10 transition-colors group">
              <Megaphone className="h-5 w-5 text-[var(--text-2)] group-hover:text-primary-600 dark:group-hover:text-primary-300" />
              <span className="text-[12px] font-medium text-[var(--text)]">Send Notification</span>
            </Link>
            <Link to="/app/finance" className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--surface-2)] hover:bg-primary-500/10 transition-colors group">
              <Receipt className="h-5 w-5 text-[var(--text-2)] group-hover:text-primary-600 dark:group-hover:text-primary-300" />
              <span className="text-[12px] font-medium text-[var(--text)]">Record Payment</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
