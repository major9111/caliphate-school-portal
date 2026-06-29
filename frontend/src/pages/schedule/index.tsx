import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Clock, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '@/lib/api'

export function SchedulePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ day: 'Monday', time: '08:00-09:00', subject: '', teacher: '', class_name: 'JSS 1A', room: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['schedule'], queryFn: scheduleApi.list })
  const create = useMutation({ mutationFn: scheduleApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setModalOpen(false); setForm({ day: 'Monday', time: '08:00-09:00', subject: '', teacher: '', class_name: 'JSS 1A', room: '' }); toast('Schedule added', 'success') } })
  const del = useMutation({ mutationFn: scheduleApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); toast('Deleted', 'success') } })

  const items = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Class Schedule</h1><p className="text-secondary-500 mt-1">Manage timetables</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? <p className="text-center py-8 text-secondary-500">No schedule items</p> : (
            <div className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Clock className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="font-medium">{item.subject} - {item.class_name}</p>
                      <p className="text-sm text-secondary-500">{item.day} - {item.time} - {item.teacher} - {item.room}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Schedule">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Day</Label>
              <select value={form.day} onChange={e => setForm({...form, day: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option>
              </select>
            </div>
            <div><Label>Time</Label><Input value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></div>
            <div><Label>Teacher</Label><Input value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} /></div>
            <div><Label>Room</Label><Input value={form.room} onChange={e => setForm({...form, room: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SchedulePage
