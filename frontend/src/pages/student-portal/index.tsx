import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookOpen, FileText, Clock, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'

export default function StudentPortalPage() {
  const [studentId, setStudentId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  const { data, isLoading } = useQuery({ 
    queryKey: ['student-portal', studentId], 
    queryFn: () => portalApi.getStudentData(studentId),
    enabled: submitted
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (!submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary-600" />
              <h2 className="text-2xl font-bold mb-2">Student Portal</h2>
              <p className="text-secondary-500">Access your academic information</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Student ID *</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Enter your student ID" required /></div>
              <Button type="submit" className="w-full">Access Portal</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Student Portal</h1><p className="text-secondary-500 mt-1">Welcome, Student</p></div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4"><FileText className="h-8 w-8 text-blue-600" /><div><p className="text-sm text-secondary-500">Total Results</p><p className="text-2xl font-bold">{data?.total_results || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><Clock className="h-8 w-8 text-orange-600" /><div><p className="text-sm text-secondary-500">Pending Homework</p><p className="text-2xl font-bold">{data?.pending_homework || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><CheckCircle className="h-8 w-8 text-green-600" /><div><p className="text-sm text-secondary-500">Assignments Submitted</p><p className="text-2xl font-bold">{data?.assignments?.length || 0}</p></div></CardContent></Card>
      </div>

      {data?.results && data.results.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">My Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Subject</th><th className="text-left p-3 text-xs uppercase">Class</th><th className="text-left p-3 text-xs uppercase">CA</th><th className="text-left p-3 text-xs uppercase">Exam</th><th className="text-left p-3 text-xs uppercase">Total</th><th className="text-left p-3 text-xs uppercase">Grade</th><th className="text-left p-3 text-xs uppercase">Remark</th></tr></thead>
                <tbody>
                  {data.results.map((r: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium">{r.subject}</td>
                      <td className="p-3 text-sm">{r.class_name}</td>
                      <td className="p-3 text-sm">{r.ca_score}</td>
                      <td className="p-3 text-sm">{r.exam_score}</td>
                      <td className="p-3 font-semibold">{r.total}</td>
                      <td className="p-3"><Badge>{r.grade}</Badge></td>
                      <td className="p-3 text-sm text-secondary-600">{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.homework && data.homework.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Homework & Assignments</h3>
            <div className="space-y-3">
              {data.homework.map((h: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{h.title}</h4>
                      <p className="text-sm text-secondary-600 mt-1">{h.description}</p>
                      <div className="flex gap-4 text-xs text-secondary-500 mt-2">
                        <span>Class: {h.class_name}</span>
                        <span>Subject: {h.subject}</span>
                        <span>Due: {h.due_date}</span>
                      </div>
                    </div>
                    <Badge variant={h.status === 'active' ? 'warning' : 'success'}>{h.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
