import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Bell, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'

export default function NotificationsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', type: 'info' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list })
  const create = useMutation({ mutationFn: notificationsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setModalOpen(false); setForm({ title: '', message: '', audience: 'all', type: 'info' }); toast('Notification sent', 'success') } })
  const del = useMutation({ mutationFn: notificationsApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast('Notification deleted', 'success') } })

  const items = data?.items || []

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { info: 'bg-blue-100 text-blue-700', success: 'bg-green-100 text-green-700', warning: 'bg-yellow-100 text-yellow-700', danger: 'bg-red-100 text-red-700' }
    return colors[type] || 'bg-secondary-100 text-secondary-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Notifications Center</h1><p className="text-secondary-500 mt-1">Send announcements</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Send Notification</Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Filter by audience..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={() => setFilter('')}>Clear</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><Bell className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No notifications</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.filter((n: any) => !filter || n.audience === filter || n.audience === 'all').map((notif: any) => (
            <Card key={notif.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notif.type)}`}><Bell className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{notif.title}</h3>
                        <Badge className={getTypeColor(notif.type)}>{notif.type}</Badge>
                        <Badge variant="outline">{notif.audience}</Badge>
                      </div>
                      <p className="text-secondary-600 mb-2">{notif.message}</p>
                      <p className="text-xs text-secondary-500">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(notif.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Send Notification">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Message *</Label><textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="flex min-h-[120px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audience</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="all">All Users</option><option value="students">Students</option><option value="teachers">Teachers</option><option value="parents">Parents</option>
              </select>
            </div>
            <div><Label>Type</Label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="info">Information</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Sending...' : 'Send'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
