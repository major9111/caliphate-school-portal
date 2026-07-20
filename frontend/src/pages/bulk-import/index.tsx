import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Upload, FileText, Users, DollarSign, CheckCircle, XCircle, Loader2, Download } from 'lucide-react'
import { uploadsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type ImportType = 'students' | 'results' | 'payments'
interface ImportResult { message: string; created?: unknown[]; created_count?: number; errors: Array<{ row: number; error: string }> }

const TEMPLATES = {
  students: { headers: 'admission_number,first_name,last_name,gender,email,phone,class_name,date_of_birth,parent_name,parent_phone,parent_email', example: 'CIS/2026/001,Fatima,Aliyu,female,f.aliyu@mail.com,08011112222,JSS 1A,2012-05-10,Alhaji Aliyu,08033334444,alhaji.aliyu@mail.com' },
  results: { headers: 'student_name,student_id,class_name,subject,ca_score,exam_score,term,session', example: 'Fatima Aliyu,,JSS 1A,Mathematics,28,55,Second Term,2025/2026' },
  payments: { headers: 'student_name,amount,type,method,payment_date,class_name,term,session', example: 'Fatima Aliyu,45000,tuition,cash,2026-02-10,JSS 1A,Second Term,2025/2026' },
}

function downloadTemplate(type: ImportType) {
  const tmpl = TEMPLATES[type]
  const csv = `${tmpl.headers}\n${tmpl.example}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${type}-template.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function BulkImportPage() {
  const [activeType, setActiveType] = useState<ImportType>('students')
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const importer = { students: uploadsApi.bulkImportStudents, results: uploadsApi.bulkImportResults, payments: uploadsApi.bulkImportPayments }

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') { toast('Please upload a CSV file', 'error'); return }
    setLoading(true); setResult(null)
    try {
      const res = await importer[activeType](file) as ImportResult
      setResult(res)
      const count = res.created?.length || res.created_count || 0
      toast(`${count} records imported${res.errors.length > 0 ? `, ${res.errors.length} errors` : ''}`, res.errors.length > 0 ? 'warning' : 'success')
    } catch { toast('Import failed. Check the file format.', 'error') }
    finally { setLoading(false) }
  }

  const typeConfig = {
    students: { icon: Users, label: 'Students', color: 'text-blue-600', bg: 'bg-blue-50' },
    results:  { icon: FileText, label: 'Exam Results', color: 'text-purple-600', bg: 'bg-purple-50' },
    payments: { icon: DollarSign, label: 'Payments', color: 'text-green-600', bg: 'bg-green-50' },
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div><h1 className="text-3xl font-bold">Bulk Import</h1><p className="text-secondary-500 mt-1">Upload CSV files to import data in bulk</p></div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(typeConfig) as ImportType[]).map(type => {
          const cfg = typeConfig[type]
          return (
            <button key={type} onClick={() => { setActiveType(type); setResult(null) }}
              className={cn('rounded-xl border-2 p-4 text-left transition-all', activeType === type ? 'border-primary-600 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300')}>
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-2', cfg.bg)}>
                <cfg.icon className={cn('h-5 w-5', cfg.color)} />
              </div>
              <p className="font-medium text-sm">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Template download */}
      <Card><CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Download CSV Template</p>
          <p className="text-xs text-secondary-500 mt-0.5">Use this template to format your data correctly before importing</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadTemplate(activeType)}>
          <Download className="h-4 w-4 mr-2" />Download Template
        </Button>
      </CardContent></Card>

      {/* Required columns */}
      <Card><CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Required CSV columns for {typeConfig[activeType].label}:</p>
        <code className="text-xs bg-secondary-100 rounded p-2 block text-secondary-700 break-all">{TEMPLATES[activeType].headers}</code>
      </CardContent></Card>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }}
        onClick={() => fileRef.current?.click()}
        className={cn('border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors', isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 hover:border-primary-400 hover:bg-secondary-50')}
      >
        {loading ? (
          <div><Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-3" /><p className="font-medium">Importing…</p></div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-3" />
            <p className="font-medium">Drop your CSV file here, or click to browse</p>
            <p className="text-sm text-secondary-500 mt-1">Only .csv files are accepted</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              {result.errors.length === 0 ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-yellow-500" />}
              <p className="font-medium">{result.message}</p>
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Errors ({result.errors.length}):</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex gap-2 text-sm bg-red-50 rounded p-2">
                      <Badge variant="danger" className="flex-shrink-0">Row {e.row}</Badge>
                      <span className="text-red-700">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
