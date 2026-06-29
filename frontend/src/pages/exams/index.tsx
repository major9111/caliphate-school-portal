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
import { examsApi } from '@/lib/api'

export function ExamsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', class_name: 'All Classes', start_date: '', end_date: '', status: 'scheduled' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['exams'], queryFn: examsApi.list })
  const create = useMutation({ mutationFn: examsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); setModalOpen(false); setForm({ name: '', class_name: 'All Classes', start_date: '', end_date: '', status: 'scheduled' }); toast('Exam created', 'success') } })
  const del = useMutation({ mutationFn: examsApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast('Exam deleted', 'success') } })

  const exams = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Examinations</h1><p className="text-secondary-500 mt-1">Manage exams</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Schedule Exam</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : exams.length === 0 ? <p className="text-center py-8 text-secondary-500">No exams scheduled</p> : (
            <div className="space-y-3">
              {exams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="font-medium">{exam.name}</p>
                      <p className="text-sm text-secondary-500">{exam.class_name} - {exam.start_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={exam.status === 'completed' ? 'success' : exam.status === 'in-progress' ? 'warning' : 'default'}>{exam.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(exam.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Schedule Exam">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Exam Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} /></div>
            <div><Label>Status</Label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ExamsPage
