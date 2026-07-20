import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, GraduationCap, DollarSign, BookOpen, TrendingUp, FileText, Megaphone, AlertCircle, Package, BookMarked } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { dashboardApi, financeApi } from '@/lib/api'
import { SkeletonDashboard } from '@/components/ui/skeleton'

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.getStats })
  const { data: finance } = useQuery({ queryKey: ['dashboard-finance'], queryFn: financeApi.getStats })

  const statCards = [
    { title: 'Total Students', value: stats?.total_students ?? 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { title: 'Total Teachers', value: stats?.total_teachers ?? 0, icon: GraduationCap, color: 'bg-green-100 text-green-600' },
    { title: 'Total Classes', value: stats?.total_classes ?? 0, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
    { title: 'Revenue This Term', value: `₦${(stats?.total_revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-orange-100 text-orange-600' },
  ]

  const chartData = (finance?.monthly_breakdown || []).map((m) => ({
    month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    amount: m.amount,
  }))

  if (isLoading) return <SkeletonDashboard />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-secondary-500 mt-1">Welcome to Caliphate Schools Management Portal</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-secondary-500">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {((stats?.outstanding_fees_count ?? 0) > 0 || (stats?.overdue_books_count ?? 0) > 0 || (stats?.low_stock_count ?? 0) > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {(stats?.outstanding_fees_count ?? 0) > 0 && (
            <Link to="/app/fees" className="block">
              <Card className="border-orange-200 hover:border-orange-300 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><AlertCircle className="h-5 w-5" /></div>
                  <div>
                    <p className="font-bold">{stats!.outstanding_fees_count} student{stats!.outstanding_fees_count === 1 ? '' : 's'} owing fees</p>
                    <p className="text-xs text-secondary-500">₦{stats!.outstanding_fees_total.toLocaleString()} outstanding</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {(stats?.overdue_books_count ?? 0) > 0 && (
            <Link to="/app/library" className="block">
              <Card className="border-red-200 hover:border-red-300 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><BookMarked className="h-5 w-5" /></div>
                  <div>
                    <p className="font-bold">{stats!.overdue_books_count} book{stats!.overdue_books_count === 1 ? '' : 's'} overdue</p>
                    <p className="text-xs text-secondary-500">Library needs follow-up</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {(stats?.low_stock_count ?? 0) > 0 && (
            <Link to="/app/inventory" className="block">
              <Card className="border-yellow-200 hover:border-yellow-300 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center flex-shrink-0"><Package className="h-5 w-5" /></div>
                  <div>
                    <p className="font-bold">{stats!.low_stock_count} item{stats!.low_stock_count === 1 ? '' : 's'} low on stock</p>
                    <p className="text-xs text-secondary-500">Restock needed</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <h3 className="font-bold text-lg">Revenue Trend</h3>
            </div>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-secondary-400 text-sm">No revenue data yet this year</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance today */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Attendance Today</h3>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary-600">{stats?.attendance_rate ?? 0}%</p>
              <p className="text-sm text-secondary-500 mt-1">{stats?.present_today ?? 0} of {stats?.total_today ?? 0} marked present</p>
            </div>
            <Link to="/app/attendance" className="block text-center text-sm text-primary-600 font-medium hover:underline">
              Mark Attendance →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming exams */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary-600" />
              <h3 className="font-bold">Upcoming Exams</h3>
            </div>
            {(stats?.upcoming_exams?.length ?? 0) === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No exams scheduled</p>
            ) : (
              <div className="space-y-3">
                {stats!.upcoming_exams.map((exam) => (
                  <div key={exam.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{exam.name}</p>
                      <p className="text-secondary-500 text-xs">{exam.class_name}</p>
                    </div>
                    <Badge variant="outline">{exam.start_date}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent admissions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary-600" />
              <h3 className="font-bold">Recent Admissions</h3>
            </div>
            {(stats?.recent_admissions?.length ?? 0) === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No admissions yet</p>
            ) : (
              <div className="space-y-3">
                {stats!.recent_admissions.map((adm) => (
                  <div key={adm.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{adm.applicant_name}</p>
                      <p className="text-secondary-500 text-xs">{adm.class_applying}</p>
                    </div>
                    <Badge variant={adm.status === 'approved' ? 'success' : adm.status === 'rejected' ? 'danger' : 'warning'}>{adm.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent announcements */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="h-5 w-5 text-primary-600" />
              <h3 className="font-bold">Announcements</h3>
            </div>
            {(stats?.recent_announcements?.length ?? 0) === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No announcements</p>
            ) : (
              <div className="space-y-3">
                {stats!.recent_announcements.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-secondary-500 text-xs line-clamp-1">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
