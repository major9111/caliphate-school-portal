import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Loader2, CalendarCheck, Check, X, Clock as ClockIcon, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, studentsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type Status = 'present' | 'absent' | 'late'

export function AttendancePage() {
  const today = new Date().toISOString().split('T')[0]
  const [classFilter, setClassFilter] = useState('')
  const [date, setDate] = useState(today)
  const [marks, setMarks] = useState<Record<string, Status>>({})
  const qc = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['attendance-stats'], queryFn: attendanceApi.getStats })
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-for-attendance', classFilter],
    queryFn: () => studentsApi.list({ limit: 100, search: classFilter }),
  })
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', classFilter, date],
    queryFn: () => attendanceApi.getRecords({ class_name: classFilter || undefined, date, limit: 100 }),
  })

  const students = studentsData?.items || []

  useEffect(() => {
    // Pre-fill marks from existing records for this date/class
    const existing: Record<string, Status> = {}
    for (const r of recordsData?.items || []) {
      existing[r.student_id] = r.status
    }
    setMarks(existing)
  }, [recordsData])

  const markMutation = useMutation({
    mutationFn: attendanceApi.markAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-stats'] })
      qc.invalidateQueries({ queryKey: ['attendance-records'] })
      toast('Attendance saved', 'success')
    },
    onError: () => toast('Failed to save attendance', 'error'),
  })

  const setMark = (studentId: string, status: Status) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSave = () => {
    if (students.length === 0) {
      toast('No students to mark', 'error')
      return
    }
    const records = students.map((s) => ({
      student_id: s.id,
      student_name: `${s.first_name} ${s.last_name}`,
      status: marks[s.id] || 'present',
    }))
    markMutation.mutate({ date, class_name: classFilter || 'All Classes', records })
  }

  const statusStyles: Record<Status, string> = {
    present: 'bg-green-100 text-green-700 border-green-300',
    absent: 'bg-red-100 text-red-700 border-red-300',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Attendance</h1><p className="text-secondary-500 mt-1">Track and mark student attendance</p></div>
        <Button onClick={handleSave} disabled={markMutation.isPending || studentsLoading}>
          {markMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Attendance
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Present Today</p><p className="text-2xl font-bold text-green-600">{statsLoading ? '...' : (stats?.present ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Absent Today</p><p className="text-2xl font-bold text-red-600">{statsLoading ? '...' : (stats?.absent ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Attendance Rate</p><p className="text-2xl font-bold">{statsLoading ? '...' : `${stats?.rate ?? 0}%`}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-secondary-700 mb-1 block">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700 mb-1 block">Filter by Class / Search</label>
              <input value={classFilter} onChange={(e) => setClassFilter(e.target.value)} placeholder="Search students..." className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" />
            </div>
          </div>

          {studentsLoading || recordsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-secondary-500">
              <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => {
                const status = marks[s.id] || 'present'
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg">
                    <div>
                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-secondary-500">{s.admission_number} • {s.class_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMark(s.id, 'present')}
                        className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors', status === 'present' ? statusStyles.present : 'border-secondary-200 text-secondary-400 hover:border-green-300')}
                      ><Check className="h-3 w-3" /> Present</button>
                      <button
                        onClick={() => setMark(s.id, 'late')}
                        className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors', status === 'late' ? statusStyles.late : 'border-secondary-200 text-secondary-400 hover:border-yellow-300')}
                      ><ClockIcon className="h-3 w-3" /> Late</button>
                      <button
                        onClick={() => setMark(s.id, 'absent')}
                        className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors', status === 'absent' ? statusStyles.absent : 'border-secondary-200 text-secondary-400 hover:border-red-300')}
                      ><X className="h-3 w-3" /> Absent</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(recordsData?.items.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">Recent Records — {date}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50">
                  <th className="text-left p-3 text-xs uppercase">Student</th>
                  <th className="text-left p-3 text-xs uppercase">Class</th>
                  <th className="text-left p-3 text-xs uppercase">Status</th>
                </tr></thead>
                <tbody>
                  {recordsData!.items.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{r.student_name}</td>
                      <td className="p-3 text-sm">{r.class_name}</td>
                      <td className="p-3"><Badge variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'danger'}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AttendancePage
