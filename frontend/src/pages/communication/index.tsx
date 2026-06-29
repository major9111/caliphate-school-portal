import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Bell, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationApi } from '@/lib/api'

export function CommunicationPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', audience: 'all', priority: 'normal' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['announcements'], queryFn: communicationApi.list })
  const create = useMutation({ mutationFn: communicationApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setModalOpen(false); setForm({ title: '', content: '', audience: 'all', priority: 'normal' }); toast('Announcement published', 'success') } })
  const del = useMutation({ mutationFn: communicationApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast('Deleted', 'success') } })

  const items = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Communication</h1><p className="text-secondary-500 mt-1">Manage announcements</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? <p className="text-center py-8 text-secondary-500">No announcements</p> : (
            <div className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-secondary-600 mt-1">{item.content}</p>
                      <p className="text-xs text-secondary-500 mt-2">Audience: {item.audience} - {new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="New Announcement">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Content</Label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="flex min-h-[100px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audience</Label>
              <select value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="all">All</option><option value="students">Students</option><option value="teachers">Teachers</option><option value="parents">Parents</option>
              </select>
            </div>
            <div><Label>Priority</Label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Publishing...' : 'Publish'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CommunicationPage
