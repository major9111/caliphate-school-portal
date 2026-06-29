import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, FileText, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resultsApi } from '@/lib/api'

export default function ResultsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filters, setFilters] = useState({ class_name: '', term: '' })
  const [form, setForm] = useState({ student_id: '', student_name: '', class_name: '', subject: '', ca_score: 0, exam_score: 0, term: 'Second Term', session: '2025/2026' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['results', filters], queryFn: () => resultsApi.list(filters) })
  const create = useMutation({ mutationFn: resultsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); setModalOpen(false); setForm({ student_id: '', student_name: '', class_name: '', subject: '', ca_score: 0, exam_score: 0, term: 'Second Term', session: '2025/2026' }); toast('Result added', 'success') } })
  const del = useMutation({ mutationFn: resultsApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); toast('Result deleted', 'success') } })

  const results = data?.items || []

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = { 'A': 'bg-green-100 text-green-700', 'B': 'bg-blue-100 text-blue-700', 'C': 'bg-yellow-100 text-yellow-700', 'D': 'bg-orange-100 text-orange-700', 'E': 'bg-red-100 text-red-700', 'F': 'bg-red-600 text-white' }
    return colors[grade] || 'bg-secondary-100 text-secondary-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Results & Grading</h1><p className="text-secondary-500 mt-1">Manage student results</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Result</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><Label>Filter by Class</Label><Input value={filters.class_name} onChange={e => setFilters({...filters, class_name: e.target.value})} placeholder="All Classes" /></div>
            <div><Label>Filter by Term</Label>
              <select value={filters.term} onChange={e => setFilters({...filters, term: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="">All Terms</option><option>First Term</option><option>Second Term</option><option>Third Term</option>
              </select>
            </div>
          </div>

          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : results.length === 0 ? (
            <div className="text-center py-12 text-secondary-500"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No results found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Student</th><th className="text-left p-3 text-xs uppercase">Class</th><th className="text-left p-3 text-xs uppercase">Subject</th><th className="text-left p-3 text-xs uppercase">CA</th><th className="text-left p-3 text-xs uppercase">Exam</th><th className="text-left p-3 text-xs uppercase">Total</th><th className="text-left p-3 text-xs uppercase">Grade</th><th className="text-left p-3 text-xs uppercase">Remark</th><th className="text-right p-3 text-xs uppercase">Actions</th></tr></thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{r.student_name}</td>
                      <td className="p-3 text-sm">{r.class_name}</td>
                      <td className="p-3 text-sm">{r.subject}</td>
                      <td className="p-3 text-sm">{r.ca_score}</td>
                      <td className="p-3 text-sm">{r.exam_score}</td>
                      <td className="p-3 font-semibold">{r.total}</td>
                      <td className="p-3"><Badge className={getGradeColor(r.grade)}>{r.grade}</Badge></td>
                      <td className="p-3 text-sm text-secondary-600">{r.remark}</td>
                      <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Result">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student ID *</Label><Input value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} required /></div>
            <div><Label>Student Name *</Label><Input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class *</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} required /></div>
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>CA Score (40) *</Label><Input type="number" max="40" value={form.ca_score} onChange={e => setForm({...form, ca_score: Number(e.target.value)})} required /></div>
            <div><Label>Exam Score (60) *</Label><Input type="number" max="60" value={form.exam_score} onChange={e => setForm({...form, exam_score: Number(e.target.value)})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Term</Label>
              <select value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option>First Term</option><option>Second Term</option><option>Third Term</option>
              </select>
            </div>
            <div><Label>Session</Label><Input value={form.session} onChange={e => setForm({...form, session: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Result'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
