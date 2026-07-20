import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, Download, Users, Loader2, FileDown } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { reportsApi, type ReportResult } from '@/lib/api'
import { toast } from '@/components/ui/toast'

const REPORTS = [
  { type: 'student_performance', title: 'Student Performance', desc: 'Grade distribution across all recorded results', icon: Users },
  { type: 'financial_summary', title: 'Financial Summary', desc: 'Revenue collected, broken down by payment type', icon: BarChart3 },
  { type: 'attendance_analysis', title: 'Attendance Analysis', desc: 'Present/absent totals and attendance rate', icon: FileText },
  { type: 'examination_results', title: 'Examination Results', desc: 'Exam counts and recorded results', icon: FileText },
]

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') return value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()
  return String(value)
}

function downloadCsv(report: ReportResult) {
  if (report.data.length === 0) {
    toast('No underlying records to export for this report', 'info')
    return
  }
  const headers = Object.keys(report.data[0])
  const rows = report.data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${report.type}-${new Date(report.generated_at).toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [lastReport, setLastReport] = useState<ReportResult | null>(null)
  const [generatingType, setGeneratingType] = useState<string | null>(null)

  const generate = useMutation({
    mutationFn: reportsApi.generate,
    onSuccess: (data) => { setLastReport(data); toast('Report generated', 'success') },
    onError: () => toast('Failed to generate report', 'error'),
    onSettled: () => setGeneratingType(null),
  })

  const handleGenerate = (type: string) => {
    setGeneratingType(type)
    generate.mutate(type)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-secondary-500 mt-1">Generate school reports</p></div>

      <div className="grid md:grid-cols-2 gap-6">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0"><r.icon className="h-6 w-6" /></div>
                  <div><h3 className="font-bold">{r.title}</h3><p className="text-sm text-secondary-500">{r.desc}</p></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleGenerate(r.type)} disabled={generatingType === r.type}>
                  {generatingType === r.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{lastReport.title}</h3>
                <p className="text-xs text-secondary-500">Generated {new Date(lastReport.generated_at).toLocaleString()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(lastReport)}>
                <FileDown className="h-4 w-4 mr-2" />Export Records (CSV)
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {Object.entries(lastReport.summary).map(([key, value]) => {
                if (value && typeof value === 'object') {
                  return (
                    <div key={key} className="bg-secondary-50 rounded-lg p-4 sm:col-span-2 lg:col-span-3">
                      <p className="text-sm font-medium text-secondary-500 mb-2">{formatLabel(key)}</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(value as Record<string, number>).map(([k, v]) => (
                          <span key={k} className="text-sm bg-white rounded-md px-3 py-1 border border-secondary-200">
                            <strong>{formatLabel(k)}:</strong> {formatValue(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={key} className="bg-secondary-50 rounded-lg p-4">
                    <p className="text-sm text-secondary-500">{formatLabel(key)}</p>
                    <p className="text-2xl font-bold mt-1">{formatValue(value)}</p>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-secondary-400">
              {lastReport.data.length} underlying record{lastReport.data.length === 1 ? '' : 's'} included
              {lastReport.data.length === 50 ? ' (showing first 50 — export for the full summary above, which covers all records)' : ''}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReportsPage
