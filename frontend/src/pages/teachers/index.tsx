import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Search, Users, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '@/lib/api'

export function TeachersPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', subject: '', qualification: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['teachers', search], queryFn: () => teachersApi.list({ page: 1, limit: 20, search }) })
  const create = useMutation({ mutationFn: teachersApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setModalOpen(false); setForm({ full_name: '', email: '', phone: '', subject: '', qualification: '' }); toast('Teacher added', 'success') } })

  const teachers = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Teachers</h1><p className="text-secondary-500 mt-1">Manage teaching staff</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Teacher</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : teachers.length === 0 ? <p className="text-center py-8 text-secondary-500">No teachers found</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Name</th><th className="text-left p-3 text-xs uppercase">Subject</th><th className="text-left p-3 text-xs uppercase">Email</th><th className="text-left p-3 text-xs uppercase">Status</th></tr></thead>
                <tbody>
                  {teachers.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3 font-medium">{t.full_name}</td>
                      <td className="p-3 text-sm">{t.subject || 'N/A'}</td>
                      <td className="p-3 text-sm">{t.email}</td>
                      <td className="p-3"><Badge variant={t.employment_status === 'active' ? 'success' : 'secondary'}>{t.employment_status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Teacher">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} /></div>
            <div><Label>Qualification</Label><Input value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TeachersPage
