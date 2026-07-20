import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, BookMarked, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examsApi, type Exam } from '@/lib/api'
import { isAxiosError } from 'axios'

const emptyForm = { name: '', class_name: '', start_date: '', end_date: '', status: 'scheduled' }

export default function ExamsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => examsApi.list() })
  const create = useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); setModalOpen(false); setForm(emptyForm); toast('Exam created', 'success') },
    onError: () => toast('Failed to create exam', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exam> }) => examsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); setEditingExam(null); toast('Exam updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update exam' : 'Failed to update exam', 'error'),
  })
  const del = useMutation({
    mutationFn: examsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast('Deleted', 'success') },
  })

  const openEdit = (exam: Exam) => {
    setEditingExam(exam)
    setEditForm({ name: exam.name, class_name: exam.class_name, start_date: exam.start_date, end_date: exam.end_date, status: exam.status })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam) return
    update.mutate({ id: editingExam.id, data: editForm })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Examinations</h1><p className="text-secondary-500 mt-1">Schedule and manage exams</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Exam</Button>
      </div>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={e => e.id}
          emptyIcon={<BookMarked className="h-10 w-10" />}
          emptyTitle="No exams scheduled"
          emptyDescription="Schedule your first examination."
          emptyAction={{ label: 'Schedule Exam', onClick: () => setModalOpen(true) }}
          columns={[
            { key: 'name', header: 'Exam Name', render: e => <button onClick={() => openEdit(e)} className="font-medium text-left hover:text-primary-600 transition-colors">{e.name}</button> },
            { key: 'class', header: 'Class', render: e => e.class_name },
            { key: 'start', header: 'Start Date', render: e => e.start_date },
            { key: 'end', header: 'End Date', render: e => e.end_date },
            { key: 'status', header: 'Status', render: e => (
              <Badge variant={e.status === 'scheduled' ? 'warning' : e.status === 'ongoing' ? 'info' : 'success'}>{e.status}</Badge>
            )},
            { key: 'actions', header: '', render: e => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(e)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm(`Delete ${e.name}?`)) del.mutate(e.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )},
          ]}
        />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Schedule Exam">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Exam Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Mid-Term Examination" /></div>
          <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. All Classes or JSS 1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required /></div>
          </div>
          <div><Label>Status</Label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Schedule'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingExam} onOpenChange={(open) => { if (!open) setEditingExam(null) }} title={`Edit — ${editingExam?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Exam Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
          <div><Label>Class</Label><Input value={editForm.class_name} onChange={e => setEditForm({ ...editForm, class_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} required /></div>
            <div><Label>End Date</Label><Input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} required /></div>
          </div>
          <div><Label>Status</Label>
            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingExam && confirm(`Delete ${editingExam.name}?`)) { del.mutate(editingExam.id); setEditingExam(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Exam
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingExam(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
