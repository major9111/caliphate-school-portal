import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, BookOpen, Loader2, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesApi } from '@/lib/api'
import { isAxiosError } from 'axios'

type ClassItem = { id: string; name: string; level: string; capacity: number; student_count?: number }
const emptyForm = { name: '', level: 'primary', capacity: 30 }

export function ClassesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['classes'], queryFn: classesApi.list })

  const create = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      setModalOpen(false)
      setForm(emptyForm)
      toast('Class created', 'success')
    },
    onError: (err) => toast(isAxiosError(err) ? err.response?.data?.detail || 'Failed to create class' : 'Failed to create class', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClassItem> }) => classesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); setEditingClass(null); toast('Class updated', 'success') },
    onError: (err) => toast(isAxiosError(err) ? err.response?.data?.detail || 'Failed to update class' : 'Failed to update class', 'error'),
  })

  const del = useMutation({
    mutationFn: classesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast('Class deleted', 'success') },
    onError: () => toast('Failed to delete class', 'error'),
  })

  const classes = data?.items || []

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls)
    setEditForm({ name: cls.name, level: cls.level, capacity: cls.capacity })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return
    update.mutate({ id: editingClass.id, data: editForm })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Classes</h1><p className="text-secondary-500 mt-1">Manage class levels</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : classes.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No classes yet. Add your first class to get started.</p></CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><BookOpen className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <p className="text-sm text-secondary-500 capitalize">{cls.level.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(cls)} className="text-secondary-400 hover:text-primary-600 transition-colors" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${cls.name}?`)) del.mutate(cls.id) }} className="text-secondary-400 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-secondary-500">Capacity</span><span className="font-medium">{cls.capacity} students</span></div>
                  <div className="flex justify-between text-sm"><span className="text-secondary-500">Enrolled</span><span className="font-medium">{cls.student_count || 0} students</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Class">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Class Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS 1A" required /></div>
          <div><Label>Level</Label>
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="nursery">Nursery</option>
              <option value="primary">Primary</option>
              <option value="junior_secondary">Junior Secondary</option>
              <option value="senior_secondary">Senior Secondary</option>
            </select>
          </div>
          <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingClass} onOpenChange={(open) => { if (!open) setEditingClass(null) }} title={`Edit — ${editingClass?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Class Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
          <div><Label>Level</Label>
            <select value={editForm.level} onChange={e => setEditForm({ ...editForm, level: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="nursery">Nursery</option>
              <option value="primary">Primary</option>
              <option value="junior_secondary">Junior Secondary</option>
              <option value="senior_secondary">Senior Secondary</option>
            </select>
          </div>
          <div><Label>Capacity</Label><Input type="number" min={1} value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })} /></div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingClass && confirm(`Delete ${editingClass.name}?`)) { del.mutate(editingClass.id); setEditingClass(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Class
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClassesPage
