import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, BookOpen, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesApi } from '@/lib/api'

export function ClassesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', level: 'primary', capacity: 30 })
  const qc = useQueryClient()
  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: classesApi.list })
  const create = useMutation({ mutationFn: classesApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); setModalOpen(false); setForm({ name: '', level: 'primary', capacity: 30 }); toast('Class created', 'success') } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Classes</h1><p className="text-secondary-500 mt-1">Manage class levels</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : !classes || classes.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No classes yet</p></CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls: any) => (
            <Card key={cls.id}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><BookOpen className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-bold text-lg">{cls.name}</h3>
                    <p className="text-sm text-secondary-500">Level: {cls.level}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-secondary-500">Capacity</span><span className="font-medium">{cls.capacity} students</span></div>
                  <div className="flex justify-between text-sm"><span className="text-secondary-500">Enrolled</span><span className="font-medium">{cls.enrolled || 0} students</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Class">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Class Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div><Label>Level</Label>
            <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="nursery">Nursery</option>
              <option value="primary">Primary</option>
              <option value="junior_secondary">Junior Secondary</option>
              <option value="senior_secondary">Senior Secondary</option>
            </select>
          </div>
          <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClassesPage
