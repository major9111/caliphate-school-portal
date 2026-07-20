import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, ClipboardList, Trash2, Eye, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { homeworkApi, assignmentsApi, type HomeworkItem } from '@/lib/api'
import { isAxiosError } from 'axios'

const emptyForm = { title: '', description: '', class_name: '', subject: '', due_date: '' }

export default function HomeworkPage() {
  const [classFilter, setClassFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHomework, setEditingHomework] = useState<HomeworkItem | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [viewSubmissions, setViewSubmissions] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['homework', classFilter],
    queryFn: () => homeworkApi.list({ class_name: classFilter || undefined, limit: 100 }),
  })
  const { data: submissions, isLoading: subLoading } = useQuery({
    queryKey: ['assignments', viewSubmissions],
    queryFn: () => assignmentsApi.list({ homework_id: viewSubmissions! }),
    enabled: !!viewSubmissions,
  })

  const create = useMutation({
    mutationFn: homeworkApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); setModalOpen(false); setForm(emptyForm); toast('Homework assigned', 'success') },
    onError: () => toast('Failed to assign homework', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HomeworkItem> }) => homeworkApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); setEditingHomework(null); toast('Homework updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update homework' : 'Failed to update homework', 'error'),
  })
  const del = useMutation({
    mutationFn: homeworkApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); toast('Deleted', 'success') },
  })

  const openEdit = (h: HomeworkItem) => {
    setEditingHomework(h)
    setEditForm({ title: h.title, description: h.description || '', class_name: h.class_name, subject: h.subject, due_date: h.due_date })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHomework) return
    update.mutate({ id: editingHomework.id, data: editForm })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Homework</h1><p className="text-secondary-500 mt-1">{data?.total || 0} assignments</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Homework</Button>
      </div>

      <Card><CardContent className="p-4">
        <Label>Filter by Class</Label>
        <Input className="mt-1" placeholder="All classes" value={classFilter} onChange={e => setClassFilter(e.target.value)} />
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={h => h.id}
          emptyIcon={<ClipboardList className="h-10 w-10" />}
          emptyTitle="No homework assigned"
          emptyDescription="Assign your first homework to a class."
          emptyAction={{ label: 'Assign Homework', onClick: () => setModalOpen(true) }}
          columns={[
            { key: 'title', header: 'Title', render: h => <button onClick={() => openEdit(h)} className="font-medium text-left hover:text-primary-600 transition-colors">{h.title}</button> },
            { key: 'subject', header: 'Subject', render: h => h.subject },
            { key: 'class', header: 'Class', render: h => h.class_name },
            { key: 'due', header: 'Due Date', render: h => (
              <span className={h.due_date < today ? 'text-red-600 font-medium' : ''}>{h.due_date}</span>
            )},
            { key: 'status', header: 'Status', render: h => <Badge variant={h.status === 'active' ? 'success' : 'secondary'}>{h.status}</Badge> },
            { key: 'view', header: '', render: h => (
              <button onClick={() => setViewSubmissions(h.id)} className="flex items-center gap-1 text-xs text-primary-600 hover:underline"><Eye className="h-3 w-3" />Submissions</button>
            )},
            { key: 'del', header: '', render: h => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(h)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del.mutate(h.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )},
          ]}
        />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Assign Homework">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Description</Label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="flex min-h-[80px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></div>
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} required /></div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Assigning…' : 'Assign'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingHomework} onOpenChange={(open) => { if (!open) setEditingHomework(null) }} title={`Edit — ${editingHomework?.title}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required /></div>
          <div><Label>Description</Label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex min-h-[80px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Subject</Label><Input value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} required /></div>
            <div><Label>Class</Label><Input value={editForm.class_name} onChange={e => setEditForm({...editForm, class_name: e.target.value})} required /></div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} required /></div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingHomework && confirm('Delete this homework?')) { del.mutate(editingHomework.id); setEditingHomework(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingHomework(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewSubmissions} onOpenChange={() => setViewSubmissions(null)} title="Student Submissions">
        {subLoading ? <p className="text-center py-8 text-secondary-500">Loading…</p> : (submissions?.items?.length ?? 0) === 0 ? (
          <p className="text-center py-8 text-secondary-500">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions!.items.map(s => (
              <div key={s.id} className="border rounded-lg p-3">
                <p className="font-medium text-sm">{s.student_name}</p>
                <p className="text-xs text-secondary-500 mt-1">{s.submission_text}</p>
                <p className="text-xs text-secondary-400 mt-1">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
