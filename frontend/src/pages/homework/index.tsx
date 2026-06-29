import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, BookOpen, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { homeworkApi, assignmentsApi } from '@/lib/api'

export default function HomeworkPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [viewSubmissions, setViewSubmissions] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', class_name: '', subject: '', due_date: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['homework'], queryFn: homeworkApi.list })
  const { data: submissions } = useQuery({ queryKey: ['assignments', viewSubmissions], queryFn: () => viewSubmissions ? assignmentsApi.list({ homework_id: viewSubmissions }) : null, enabled: !!viewSubmissions })
  const create = useMutation({ mutationFn: homeworkApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); setModalOpen(false); setForm({ title: '', description: '', class_name: '', subject: '', due_date: '' }); toast('Homework assigned', 'success') } })
  const del = useMutation({ mutationFn: homeworkApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); toast('Homework deleted', 'success') } })

  const items = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Homework & Assignments</h1><p className="text-secondary-500 mt-1">Assign and track homework</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Homework</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No homework assigned</p></CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {items.map((hw: any) => (
            <Card key={hw.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{hw.title}</h3>
                      <Badge variant={hw.status === 'active' ? 'success' : 'secondary'}>{hw.status}</Badge>
                    </div>
                    <p className="text-secondary-600 mb-3">{hw.description}</p>
                    <div className="flex gap-4 text-sm text-secondary-500">
                      <span>Class: {hw.class_name}</span>
                      <span>Subject: {hw.subject}</span>
                      <span>Due: {hw.due_date}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewSubmissions(hw.id)}>View Submissions</Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(hw.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!viewSubmissions} onOpenChange={() => setViewSubmissions(null)} title="Submissions">
        <div className="space-y-4">
          {!submissions || submissions.items.length === 0 ? (
            <p className="text-center text-secondary-500 py-8">No submissions yet</p>
          ) : (
            submissions.items.map((sub: any) => (
              <div key={sub.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{sub.student_name}</p>
                    <p className="text-sm text-secondary-600 mt-1">{sub.submission_text}</p>
                    <p className="text-xs text-secondary-500 mt-2">Submitted: {sub.submitted_at}</p>
                  </div>
                  <Badge variant={sub.status === 'submitted' ? 'success' : 'warning'}>{sub.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Assign Homework">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Description *</Label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="flex min-h-[100px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class *</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} required /></div>
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></div>
          </div>
          <div><Label>Due Date *</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Assigning...' : 'Assign'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
