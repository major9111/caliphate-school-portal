import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Calendar, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'

export default function EventsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '', location: '', type: 'general', audience: 'all' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list })
  const create = useMutation({ mutationFn: eventsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setModalOpen(false); setForm({ title: '', description: '', event_date: '', event_time: '', location: '', type: 'general', audience: 'all' }); toast('Event created', 'success') } })
  const del = useMutation({ mutationFn: eventsApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast('Event deleted', 'success') } })

  const events = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Events & Calendar</h1><p className="text-secondary-500 mt-1">Manage school events</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : events.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No events scheduled</p></CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {events.map((event: any) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-6 w-6 text-primary-600" />
                      <h3 className="text-xl font-bold">{event.title}</h3>
                      <Badge>{event.type}</Badge>
                    </div>
                    <p className="text-secondary-600 mb-3">{event.description}</p>
                    <div className="flex gap-4 text-sm text-secondary-500">
                      <span>Date: {event.event_date}</span>
                      <span>Time: {event.event_time || 'All day'}</span>
                      <span>Location: {event.location || 'TBA'}</span>
                      <span>Audience: {event.audience}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(event.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Event">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Event Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Description *</Label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="flex min-h-[100px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date *</Label><Input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} required /></div>
            <div><Label>Time</Label><Input type="time" value={form.event_time} onChange={e => setForm({...form, event_time: e.target.value})} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="general">General</option><option value="academic">Academic</option><option value="sports">Sports</option><option value="cultural">Cultural</option><option value="meeting">Meeting</option>
              </select>
            </div>
            <div><Label>Audience</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="all">All</option><option value="students">Students</option><option value="teachers">Teachers</option><option value="parents">Parents</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Event'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
