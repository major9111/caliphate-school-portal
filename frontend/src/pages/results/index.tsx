import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, FileText, FileDown, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resultsApi, exportsApi, settingsApi, type Result } from '@/lib/api'

const PAGE_SIZE = 20
const TERMS = ['First Term', 'Second Term', 'Third Term']
const emptyForm = { student_id: '', student_name: '', class_name: '', subject: '', ca_score: 0, exam_score: 0, term: 'Second Term', session: '2025/2026' }

export default function ResultsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ class_name: '', term: '', student_name: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingResult, setEditingResult] = useState<Result | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  useEffect(() => {
    if (settings?.current_term && settings?.current_session) {
      setForm(f => ({ ...f, term: settings.current_term, session: settings.current_session }))
    }
  }, [settings])
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['results', filters, page],
    queryFn: () => resultsApi.list({ ...filters, page, limit: PAGE_SIZE }),
  })
  const create = useMutation({
    mutationFn: resultsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); setModalOpen(false); setForm(emptyForm); toast('Result added', 'success') },
    onError: () => toast('Failed to add result', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Result> }) => resultsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); setEditingResult(null); toast('Result updated', 'success') },
    onError: () => toast('Failed to update result', 'error'),
  })
  const del = useMutation({
    mutationFn: resultsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); toast('Deleted', 'success') },
  })

  const openEdit = (r: Result) => {
    setEditingResult(r)
    setEditForm({ student_id: r.student_id || '', student_name: r.student_name, class_name: r.class_name, subject: r.subject, ca_score: r.ca_score, exam_score: r.exam_score, term: r.term, session: r.session })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResult) return
    update.mutate({ id: editingResult.id, data: { ...editForm, ca_score: Number(editForm.ca_score), exam_score: Number(editForm.exam_score) } })
  }

  const setFilter = (key: string, val: string) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Results</h1><p className="text-secondary-500 mt-1">Manage academic results ({data?.total || 0} entries)</p></div>
        <div className="flex gap-2 flex-wrap">
          <a href={exportsApi.resultsExcel({ term: filters.term || undefined, class_name: filters.class_name || undefined })} download className="inline-flex items-center gap-2 px-3 py-2 border border-secondary-300 rounded-lg text-sm font-medium hover:bg-secondary-50"><FileDown className="h-4 w-4" />Excel</a>
          <a href={exportsApi.resultsCsv(filters.term || undefined)} download className="inline-flex items-center gap-2 px-3 py-2 border border-secondary-300 rounded-lg text-sm font-medium hover:bg-secondary-50"><FileDown className="h-4 w-4" />CSV</a>
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Result</Button>
        </div>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4 grid sm:grid-cols-3 gap-4">
        <div><Label>Student Name</Label><Input className="mt-1" placeholder="Search…" value={filters.student_name} onChange={e => setFilter('student_name', e.target.value)} /></div>
        <div><Label>Class</Label><Input className="mt-1" placeholder="All classes" value={filters.class_name} onChange={e => setFilter('class_name', e.target.value)} /></div>
        <div><Label>Term</Label>
          <select value={filters.term} onChange={e => setFilter('term', e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1">
            <option value="">All Terms</option>{TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={r => r.id}
          emptyIcon={<FileText className="h-10 w-10" />}
          emptyTitle="No results found"
          emptyDescription={Object.values(filters).some(Boolean) ? "Try adjusting your filters." : "Add results manually or use Bulk Import to upload a CSV."}
          columns={[
            { key: 'student', header: 'Student', render: r => <button onClick={() => openEdit(r)} className="font-medium text-left hover:text-primary-600 transition-colors">{r.student_name}</button> },
            { key: 'class', header: 'Class', render: r => r.class_name },
            { key: 'subject', header: 'Subject', render: r => r.subject },
            { key: 'ca', header: 'CA', render: r => r.ca_score },
            { key: 'exam', header: 'Exam', render: r => r.exam_score },
            { key: 'total', header: 'Total', render: r => <span className="font-bold">{r.total}</span> },
            { key: 'grade', header: 'Grade', render: r => <Badge variant={r.grade === 'A' ? 'success' : r.grade === 'F' ? 'danger' : r.grade === 'B' || r.grade === 'C' ? 'info' : 'warning'}>{r.grade}</Badge> },
            { key: 'pdf', header: '', render: r => r.student_id ? (
              <a href={exportsApi.reportCardPdf(r.student_id, r.term, r.session)} download className="text-xs text-primary-600 hover:underline">PDF</a>
            ) : null },
            { key: 'del', header: '', render: r => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(r)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if(confirm('Delete this result?')) del.mutate(r.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )},
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Result">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, ca_score: Number(form.ca_score), exam_score: Number(form.exam_score) }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student Name</Label><Input value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} required /></div>
            <div><Label>Student ID (optional)</Label><Input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} required /></div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>CA Score (40)</Label><Input type="number" min={0} max={40} value={form.ca_score} onChange={e => setForm({ ...form, ca_score: Number(e.target.value) })} /></div>
            <div><Label>Exam Score (60)</Label><Input type="number" min={0} max={60} value={form.exam_score} onChange={e => setForm({ ...form, exam_score: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Term</Label>
              <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Session</Label><Input value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save Result'}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!editingResult} onOpenChange={(open) => { if (!open) setEditingResult(null) }} title={`Edit — ${editingResult?.student_name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student Name</Label><Input value={editForm.student_name} onChange={e => setEditForm({ ...editForm, student_name: e.target.value })} required /></div>
            <div><Label>Student ID (optional)</Label><Input value={editForm.student_id} onChange={e => setEditForm({ ...editForm, student_id: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class</Label><Input value={editForm.class_name} onChange={e => setEditForm({ ...editForm, class_name: e.target.value })} required /></div>
            <div><Label>Subject</Label><Input value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>CA Score (40)</Label><Input type="number" min={0} max={40} value={editForm.ca_score} onChange={e => setEditForm({ ...editForm, ca_score: Number(e.target.value) })} /></div>
            <div><Label>Exam Score (60)</Label><Input type="number" min={0} max={60} value={editForm.exam_score} onChange={e => setEditForm({ ...editForm, exam_score: Number(e.target.value) })} /></div>
          </div>
          <p className="text-xs text-secondary-500 bg-blue-50 rounded p-2">Total and grade are recalculated automatically from CA + Exam scores.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Term</Label>
              <select value={editForm.term} onChange={e => setEditForm({ ...editForm, term: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Session</Label><Input value={editForm.session} onChange={e => setEditForm({ ...editForm, session: e.target.value })} /></div>
          </div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingResult && confirm('Delete this result?')) { del.mutate(editingResult.id); setEditingResult(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Result
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingResult(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
