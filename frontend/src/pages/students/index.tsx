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
import { studentsApi } from '@/lib/api'

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ admission_number: '', first_name: '', last_name: '', gender: 'male', email: '', phone: '', class_name: 'JSS 1A' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['students', search], queryFn: () => studentsApi.list({ page: 1, limit: 20, search }) })
  const create = useMutation({ mutationFn: studentsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setModalOpen(false); setForm({ admission_number: '', first_name: '', last_name: '', gender: 'male', email: '', phone: '', class_name: 'JSS 1A' }); toast('Student added', 'success') } })

  const students = data?.items || []
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Students</h1><p className="text-secondary-500 mt-1">Manage student records</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Student</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : students.length === 0 ? <p className="text-center py-8 text-secondary-500">No students found</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Student</th><th className="text-left p-3 text-xs uppercase">Admission No</th><th className="text-left p-3 text-xs uppercase">Class</th><th className="text-left p-3 text-xs uppercase">Status</th></tr></thead>
                <tbody>
                  {students.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{s.first_name} {s.last_name}</td>
                      <td className="p-3 text-sm font-mono">{s.admission_number}</td>
                      <td className="p-3 text-sm">{s.class_name}</td>
                      <td className="p-3"><Badge variant={s.enrollment_status === 'active' ? 'success' : 'secondary'}>{s.enrollment_status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Student">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
            <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StudentsPage
