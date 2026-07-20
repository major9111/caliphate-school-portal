import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, Megaphone, Send, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationApi, emailBlastApi } from '@/lib/api'
import { isAxiosError } from 'axios'

export default function CommunicationPage() {
  const [audienceFilter, setAudienceFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [blasting, setBlasting] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', audience: 'all', priority: 'normal' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', audienceFilter],
    queryFn: () => communicationApi.list({ audience: audienceFilter || undefined, limit: 100 }),
  })

  const create = useMutation({
    mutationFn: communicationApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setModalOpen(false); setForm({ title:'', content:'', audience:'all', priority:'normal' }); toast('Announcement published', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const del = useMutation({
    mutationFn: communicationApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast('Deleted', 'success') },
  })

  const handleBlast = async (id: string, audience: string) => {
    setBlasting(id)
    try {
      const res = await emailBlastApi.announcement(id, audience)
      toast(res.message, 'success')
    } catch { toast('Email blast failed', 'error') }
    finally { setBlasting(null) }
  }

  const priorityVariant: Record<string, string> = { high: 'danger', normal: 'secondary', low: 'info' }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Communication</h1><p className="text-secondary-500 mt-1">Announcements and email blasts</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
      </div>

      <Card><CardContent className="p-4 flex items-end gap-4">
        <div><Label>Filter by Audience</Label>
          <select value={audienceFilter} onChange={e => setAudienceFilter(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1 text-sm">
            <option value="">All Audiences</option>{['all','students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {audienceFilter && <Button variant="ghost" size="sm" onClick={() => setAudienceFilter('')}>Clear</Button>}
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={a => a.id}
          emptyIcon={<Megaphone className="h-10 w-10" />}
          emptyTitle="No announcements"
          emptyDescription="Publish your first announcement to the school community."
          emptyAction={{ label: 'New Announcement', onClick: () => setModalOpen(true) }}
          columns={[
            { key: 'title', header: 'Title', render: a => <p className="font-medium">{a.title}</p> },
            { key: 'content', header: 'Message', render: a => <p className="text-sm text-secondary-600 line-clamp-2">{a.content}</p> },
            { key: 'audience', header: 'Audience', render: a => <Badge variant="secondary">{a.audience}</Badge> },
            { key: 'priority', header: 'Priority', render: a => <Badge variant={(priorityVariant[a.priority || 'normal'] || 'secondary') as 'danger'|'secondary'|'info'}>{a.priority || 'normal'}</Badge> },
            { key: 'date', header: 'Published', render: a => <span className="text-xs">{new Date(a.created_at).toLocaleDateString()}</span> },
            { key: 'blast', header: 'Email Blast', render: a => (
              <button
                onClick={() => handleBlast(a.id, a.audience)}
                disabled={blasting === a.id}
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
              >
                {blasting === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {blasting === a.id ? 'Sending…' : 'Send Email'}
              </button>
            )},
            { key: 'del', header: '', render: a => <button onClick={() => del.mutate(a.id)} className="text-secondary-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> },
          ]}
        />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="New Announcement">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Content</Label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="flex min-h-[100px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audience</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['all','students','teachers','parents','staff'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div><Label>Priority</Label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['low','normal','high'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Publishing…' : 'Publish'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
