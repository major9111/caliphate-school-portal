import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, CalendarDays, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, type Event } from '@/lib/api'
import { isAxiosError } from 'axios'

const EVENT_TYPES = ['general','academic','sports','cultural','religious','meeting','holiday','other']
const TYPE_COLORS: Record<string, string> = { academic:'info', sports:'success', cultural:'warning', religious:'secondary', meeting:'secondary' }
const emptyForm = { title:'', description:'', event_date:'', event_time:'', type:'general', location:'', audience:'all' }

export default function EventsPage() {
  const [filter, setFilter] = useState<'all'|'upcoming'|'past'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['events', filter],
    queryFn: () => eventsApi.list({ upcoming: filter === 'upcoming' ? true : filter === 'past' ? false : undefined }),
  })

  const create = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setModalOpen(false); setForm(emptyForm); toast('Event created', 'success') },
    onError: () => toast('Failed to create event', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => eventsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setEditingEvent(null); toast('Event updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update event' : 'Failed to update event', 'error'),
  })
  const del = useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast('Event deleted', 'success') },
  })

  const openEdit = (ev: Event) => {
    setEditingEvent(ev)
    setEditForm({ title: ev.title, description: ev.description || '', event_date: ev.event_date, event_time: ev.event_time || '', type: ev.type, location: ev.location || '', audience: ev.audience })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    update.mutate({ id: editingEvent.id, data: editForm })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Events</h1><p className="text-secondary-500 mt-1">School calendar and events</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
      </div>

      <div className="flex gap-2 border-b">
        {(['all','upcoming','past'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${filter===f?'border-primary-600 text-primary-600':'border-transparent text-secondary-500 hover:text-secondary-900'}`}>{f}</button>
        ))}
      </div>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={e => e.id}
          emptyIcon={<CalendarDays className="h-10 w-10" />}
          emptyTitle="No events"
          emptyDescription={filter === 'upcoming' ? 'No upcoming events scheduled.' : filter === 'past' ? 'No past events.' : 'Add your first school event.'}
          emptyAction={filter === 'all' ? { label: 'Add Event', onClick: () => setModalOpen(true) } : undefined}
          columns={[
            { key: 'title', header: 'Event', render: e => (
              <button onClick={() => openEdit(e)} className="text-left">
                <p className="font-medium hover:text-primary-600 transition-colors">{e.title}</p>
                {e.description && <p className="text-xs text-secondary-500 line-clamp-1">{e.description}</p>}
              </button>
            )},
            { key: 'date', header: 'Date', render: e => (
              <div>
                <p className={`font-medium ${e.event_date >= today ? 'text-primary-600' : 'text-secondary-500'}`}>{e.event_date}</p>
                {e.event_time && <p className="text-xs text-secondary-500">{e.event_time}</p>}
              </div>
            )},
            { key: 'type', header: 'Type', render: e => <Badge variant={(TYPE_COLORS[e.type] || 'secondary') as 'info'|'success'|'warning'|'secondary'}>{e.type}</Badge> },
            { key: 'loc', header: 'Venue', render: e => e.location || '—' },
            { key: 'audience', header: 'Audience', render: e => <Badge variant="secondary">{e.audience}</Badge> },
            { key: 'status', header: 'Status', render: e => e.event_date >= today ? <Badge variant="success">Upcoming</Badge> : <Badge variant="secondary">Past</Badge> },
            { key: 'del', header: '', render: e => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(e)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if(confirm('Delete event?')) del.mutate(e.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )},
          ]}
        />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Event">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Description</Label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="flex min-h-[80px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Event Date</Label><Input type="date" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} required /></div>
            <div><Label>Time (optional)</Label><Input type="time" value={form.event_time} onChange={e => setForm({...form, event_time: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Event Type</Label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Audience</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['all','students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Venue / Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. School Hall" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create Event'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null) }} title={`Edit — ${editingEvent?.title}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required /></div>
          <div><Label>Description</Label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="flex min-h-[80px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Event Date</Label><Input type="date" value={editForm.event_date} onChange={e => setEditForm({...editForm, event_date: e.target.value})} required /></div>
            <div><Label>Time (optional)</Label><Input type="time" value={editForm.event_time} onChange={e => setEditForm({...editForm, event_time: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Event Type</Label>
              <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Audience</Label>
              <select value={editForm.audience} onChange={e => setEditForm({...editForm, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['all','students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Venue / Location</Label><Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} /></div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingEvent && confirm('Delete event?')) { del.mutate(editingEvent.id); setEditingEvent(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Event
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
