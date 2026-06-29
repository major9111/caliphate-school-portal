import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, Download, Users, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { toast } from '@/components/ui/toast'

export function ReportsPage() {
  const [lastReport, setLastReport] = useState<any>(null)
  const generate = useMutation({ mutationFn: reportsApi.generate, onSuccess: (data) => { setLastReport(data); toast('Report generated', 'success') } })

  const reports = [
    { type: 'student_performance', title: 'Student Performance', desc: 'Academic performance across classes', icon: Users },
    { type: 'financial_summary', title: 'Financial Summary', desc: 'Revenue and expenses', icon: BarChart3 },
    { type: 'attendance_analysis', title: 'Attendance Analysis', desc: 'Attendance trends', icon: FileText },
    { type: 'examination_results', title: 'Examination Results', desc: 'Exam report cards', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-secondary-500 mt-1">Generate school reports</p></div>

      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((r) => (
          <Card key={r.type}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center"><r.icon className="h-6 w-6" /></div>
                  <div><h3 className="font-bold">{r.title}</h3><p className="text-sm text-secondary-500">{r.desc}</p></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => generate.mutate(r.type)} disabled={generate.isPending}>
                  {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lastReport && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4">Last Generated Report</h3>
            <div className="bg-secondary-50 p-4 rounded-lg space-y-2">
              <p><strong>Type:</strong> {lastReport.report_type}</p>
              <p><strong>Generated:</strong> {new Date(lastReport.generated_at).toLocaleString()}</p>
              <p><strong>Total Users:</strong> {lastReport.total_users}</p>
              <p><strong>Total Students:</strong> {lastReport.total_students}</p>
              <p><strong>Total Teachers:</strong> {lastReport.total_teachers}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReportsPage
