import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Users, GraduationCap, DollarSign, BookOpen, Loader2 } from 'lucide-react'
import { studentsApi, teachersApi, financeApi, classesApi } from '@/lib/api'

export function DashboardPage() {
  const { data: students, isLoading: sLoad } = useQuery({ queryKey: ['dashboard-students'], queryFn: () => studentsApi.list({ limit: 1 }) })
  const { data: teachers, isLoading: tLoad } = useQuery({ queryKey: ['dashboard-teachers'], queryFn: () => teachersApi.list({ limit: 1 }) })
  const { data: finance, isLoading: fLoad } = useQuery({ queryKey: ['dashboard-finance'], queryFn: financeApi.getStats })
  const { data: classes, isLoading: cLoad } = useQuery({ queryKey: ['dashboard-classes'], queryFn: classesApi.list })

  const stats = [
    { title: 'Total Students', value: sLoad ? '...' : (students?.total || 0), icon: Users, color: 'bg-blue-100 text-blue-600' },
    { title: 'Total Teachers', value: tLoad ? '...' : (teachers?.total || 0), icon: GraduationCap, color: 'bg-green-100 text-green-600' },
    { title: 'Total Classes', value: cLoad ? '...' : (classes?.length || 0), icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
    { title: 'Revenue This Term', value: fLoad ? '...' : `${(finance?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-secondary-500 mt-1">Welcome to Caliphate Schools Management Portal</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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
    </div>
  )
}

export default DashboardPage
