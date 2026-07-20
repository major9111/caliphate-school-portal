import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { toast } from '@/components/ui/toast'
import { Plus, UserCheck, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionsApi, exportsApi } from '@/lib/api'
import api from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20

export default function AdmissionsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ applicant_name: '', email: '', phone: '', class_applying: 'JSS 1', parent_name: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', search, status, page],
    queryFn: () => admissionsApi.list({ page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined }),
  })

  const create = useMutation({
    mutationFn: admissionsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); setModalOpen(false); setForm({ applicant_name:'', email:'', phone:'', class_applying:'JSS 1', parent_name:'' }); toast('Application added', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => admissionsApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions'] }); toast('Status updated', 'success') },
  })
  const enroll = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/admissions/${id}/enroll`)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admissions'] })
      toast(`Enrolled! Login: ${data.username} / ${data.password}`, 'success')
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Enrollment failed' : 'Enrollment failed', 'error'),
  })

  const setF = (fn: () => void) => { fn(); setPage(1) }
  const statusVariant: Record<string,string> = { pending:'warning', approved:'success', rejected:'danger', enrolled:'info' }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Admissions</h1><p className="text-secondary-500 mt-1">{data?.total || 0} applications</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Application</Button>
      </div>

      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-4">
        <div className="relative">
          <Label>Search</Label>
          <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input className="pl-10" placeholder="Search by name or email…" value={search} onChange={e => setF(() => setSearch(e.target.value))} />
          </div>
        </div>
        <div><Label>Status</Label>
          <select value={status} onChange={e => setF(() => setStatus(e.target.value))} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1 text-sm">
            <option value="">All Statuses</option>{['pending','approved','rejected','enrolled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={a => a.id}
          emptyIcon={<UserCheck className="h-10 w-10" />}
          emptyTitle="No applications"
          emptyDescription="Applications submitted via the public form will appear here."
          emptyAction={{ label: 'Add Application', onClick: () => setModalOpen(true) }}
          columns={[
            { key: 'name', header: 'Applicant', render: a => <div><p className="font-medium">{a.applicant_name}</p><p className="text-xs text-secondary-500">{a.email}</p></div> },
            { key: 'app_no', header: 'App. Number', render: a => <span className="font-mono text-xs">{a.application_number}</span> },
            { key: 'class', header: 'Class', render: a => a.class_applying },
            { key: 'parent', header: 'Parent', render: a => a.parent_name || '—' },
            { key: 'status', header: 'Status', render: a => <Badge variant={(statusVariant[a.status] || 'secondary') as 'warning'|'success'|'danger'|'info'|'secondary'}>{a.status}</Badge> },
            { key: 'actions', header: '', className: 'text-right', render: a => (
              <div className="flex gap-2 justify-end flex-wrap">
                {a.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: 'approved' })}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: 'rejected' })}>Reject</Button>
                  </>
                )}
                {a.status === 'approved' && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { if (confirm(`Enroll ${a.applicant_name}?`)) enroll.mutate(a.id) }}>Enroll</Button>
                    <a href={exportsApi.admissionLetterPdf(a.id)} download className="inline-flex items-center px-3 py-1 text-xs border rounded-md text-primary-700 border-primary-300 hover:bg-primary-50">Letter PDF</a>
                  </>
                )}
                {a.status === 'enrolled' && <span className="text-xs text-green-600 font-medium">✓ Enrolled</span>}
              </div>
            )},
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Application">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Applicant Name</Label><Input value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class Applying For</Label><Input value={form.class_applying} onChange={e => setForm({...form, class_applying: e.target.value})} /></div>
            <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add Application'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
