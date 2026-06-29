import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CalendarCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/api'

export function AttendancePage() {
  const { data, isLoading } = useQuery({ queryKey: ['attendance-stats'], queryFn: attendanceApi.getStats })

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Attendance</h1><p className="text-secondary-500 mt-1">Track student attendance</p></div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Present Today</p><p className="text-2xl font-bold">{isLoading ? '...' : (data?.present || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Absent Today</p><p className="text-2xl font-bold">{isLoading ? '...' : (data?.absent || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Attendance Rate</p><p className="text-2xl font-bold">{isLoading ? '...' : `${data?.rate || 0}%`}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-12 text-center text-secondary-500">
          <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Detailed attendance tracking coming soon</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendancePage
