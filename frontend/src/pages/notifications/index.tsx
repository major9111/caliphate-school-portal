import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, Bell, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'

const TYPE_VARIANT: Record<string, string> = { info: 'info', warning: 'warning', success: 'success', danger: 'danger' }

export default function NotificationsPage() {
  const [audience, setAudience] = useState('')
  const [type, setType] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', type: 'info' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', audience, type],
    queryFn: () => notificationsApi.list({ audience: audience || undefined, type: type || undefined, limit: 100 }),
  })

  const create = useMutation({
    mutationFn: notificationsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setModalOpen(false); setForm({ title:'', message:'', audience:'all', type:'info' }); toast('Notification sent', 'success') },
    onError: () => toast('Failed to send', 'error'),
  })
  const del = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast('Deleted', 'success') },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Notifications</h1><p className="text-secondary-500 mt-1">{data?.total || 0} notifications</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Send Notification</Button>
      </div>

      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-4">
        <div><Label>Audience</Label>
          <select value={audience} onChange={e => setAudience(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1 text-sm">
            <option value="">All</option>{['students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div><Label>Type</Label>
          <select value={type} onChange={e => setType(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1 text-sm">
            <option value="">All Types</option>{['info','warning','success','danger'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={n => n.id}
          emptyIcon={<Bell className="h-10 w-10" />}
          emptyTitle="No notifications"
          emptyDescription="Send your first notification to students, teachers, or parents."
          emptyAction={{ label: 'Send Notification', onClick: () => setModalOpen(true) }}
          columns={[
            { key: 'title', header: 'Title', render: n => <p className="font-medium">{n.title}</p> },
            { key: 'msg', header: 'Message', render: n => <p className="text-sm text-secondary-600 line-clamp-2">{n.message}</p> },
            { key: 'audience', header: 'Audience', render: n => <Badge variant="secondary">{n.audience}</Badge> },
            { key: 'type', header: 'Type', render: n => <Badge variant={(TYPE_VARIANT[n.type] || 'secondary') as 'info'|'warning'|'success'|'danger'}>{n.type}</Badge> },
            { key: 'date', header: 'Sent', render: n => <span className="text-xs text-secondary-500">{new Date(n.created_at).toLocaleDateString()}</span> },
            { key: 'del', header: '', render: n => <button onClick={() => { if (confirm('Delete this notification?')) del.mutate(n.id) }} className="text-secondary-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> },
          ]}
        />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Send Notification">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Message</Label><textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="flex min-h-[80px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Send To</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['all','students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div><Label>Type</Label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['info','warning','success','danger'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Sending…' : 'Send'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
