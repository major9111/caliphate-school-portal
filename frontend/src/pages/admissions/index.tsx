import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Search, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionsApi } from '@/lib/api'

export function AdmissionsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ applicant_name: '', email: '', phone: '', class_applying: 'JSS 1', parent_name: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admissions'], queryFn: admissionsApi.list })
  const create = useMutation({ mutationFn: admissionsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setModalOpen(false); setForm({ applicant_name: '', email: '', phone: '', class_applying: 'JSS 1', parent_name: '' }); toast('Application added', 'success') } })
  const updateStatus = useMutation({ mutationFn: ({ id, status }: any) => admissionsApi.updateStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); toast('Status updated', 'success') } })

  const items = data?.items || []
  const filtered = items.filter((a: any) => `${a.applicant_name} ${a.id}`.toLowerCase().includes(search.toLowerCase()))

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'approved') return <Badge variant="success">Approved</Badge>
    if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>
    return <Badge variant="warning">Pending</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Admissions</h1><p className="text-secondary-500 mt-1">Manage applications</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />New Application</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : filtered.length === 0 ? <p className="text-center py-8 text-secondary-500">No applications</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">ID</th><th className="text-left p-3 text-xs uppercase">Applicant</th><th className="text-left p-3 text-xs uppercase">Class</th><th className="text-left p-3 text-xs uppercase">Status</th><th className="text-right p-3 text-xs uppercase">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((app: any) => (
                    <tr key={app.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3 font-mono text-sm">{app.id}</td>
                      <td className="p-3">{app.applicant_name}<div className="text-xs text-secondary-500">{app.email}</div></td>
                      <td className="p-3 text-sm">{app.class_applying}</td>
                      <td className="p-3"><StatusBadge status={app.status} /></td>
                      <td className="p-3 text-right">
                        {app.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: 'approved' })}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: 'rejected' })}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="New Application">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Applicant Name</Label><Input value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class Applying</Label><Input value={form.class_applying} onChange={e => setForm({...form, class_applying: e.target.value})} required /></div>
            <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdmissionsPage
