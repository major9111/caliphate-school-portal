import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, Search, Users, Camera, FileDown, Upload, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, uploadsApi, exportsApi, type Student } from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20

const emptyForm = { admission_number: '', first_name: '', last_name: '', gender: 'male', email: '', phone: '', class_name: 'JSS 1A', date_of_birth: '', parent_name: '', parent_phone: '', parent_email: '' }

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [photoStudent, setPhotoStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['students', search, page], queryFn: () => studentsApi.list({ page, limit: PAGE_SIZE, search }) })

  const create = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setModalOpen(false); setForm(emptyForm); toast('Student added', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to add student' : 'Failed to add student', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setEditingStudent(null); toast('Student updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update student' : 'Failed to update student', 'error'),
  })

  const del = useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast('Student removed', 'success') },
    onError: () => toast('Failed to remove student', 'error'),
  })

  const uploadPhoto = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadsApi.uploadStudentPhoto(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setPhotoStudent(null); toast('Photo uploaded', 'success') },
    onError: () => toast('Photo upload failed', 'error'),
  })

  const students = data?.items || []
  const total = data?.total || 0

  const handleSearchChange = (value: string) => { setSearch(value); setPage(1) }

  const openEdit = (s: Student) => {
    setEditingStudent(s)
    setEditForm({
      admission_number: s.admission_number, first_name: s.first_name, last_name: s.last_name,
      gender: s.gender || 'male', email: s.email, phone: s.phone, class_name: s.class_name,
      date_of_birth: s.date_of_birth || '', parent_name: s.parent_name || '', parent_phone: s.parent_phone || '', parent_email: s.parent_email || '',
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    update.mutate({ id: editingStudent.id, data: { ...editForm, enrollment_status: editingStudent.enrollment_status } })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Students</h1><p className="text-secondary-500 mt-1">{total} students enrolled</p></div>
        <div className="flex gap-2">
          <a href={exportsApi.studentsExcel()} download className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary-50"><FileDown className="h-4 w-4" />Excel</a>
          <Link to="/app/bulk-import" className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary-50"><Upload className="h-4 w-4" />Bulk Import</Link>
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Student</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input placeholder="Search by name or admission number…" className="pl-10" value={search} onChange={e => handleSearchChange(e.target.value)} />
          </div>
          <DataTable
            isLoading={isLoading}
            data={students}
            rowKey={s => s.id}
            emptyIcon={<Users className="h-10 w-10" />}
            emptyTitle="No students found"
            emptyDescription={search ? "Try a different search term." : "Add your first student or use Bulk Import to upload a CSV."}
            emptyAction={{ label: 'Add Student', onClick: () => setModalOpen(true) }}
            columns={[
              { key: 'photo', header: '', render: s => (
                <button onClick={() => setPhotoStudent(s)} className="h-9 w-9 rounded-full bg-secondary-100 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary-300 transition-all">
                  {(s as { avatar_url?: string }).avatar_url ? (
                    <img src={(s as { avatar_url?: string }).avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : <Camera className="h-4 w-4 text-secondary-400" />}
                </button>
              )},
              { key: 'name', header: 'Student', render: s => (
                <button onClick={() => openEdit(s)} className="font-medium text-left hover:text-primary-600 transition-colors">
                  {s.first_name} {s.last_name}
                </button>
              )},
              { key: 'adm', header: 'Admission No', render: s => <span className="text-sm font-mono">{s.admission_number}</span> },
              { key: 'class', header: 'Class', render: s => s.class_name },
              { key: 'status', header: 'Status', render: s => <Badge variant={s.enrollment_status === 'active' ? 'success' : 'secondary'}>{s.enrollment_status}</Badge> },
              { key: 'actions', header: '', render: s => (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => openEdit(s)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${s.first_name} ${s.last_name}? This cannot be undone.`)) del.mutate(s.id) }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )},
            ]}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Add modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Student">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
            <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Admission Number</Label><Input value={form.admission_number} onChange={e => setForm({...form, admission_number: e.target.value})} placeholder="Auto-generated if blank" /></div>
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Gender</Label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Parent/Guardian Name</Label><Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
            <div><Label>Parent/Guardian Phone</Label><Input value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})} /></div>
          </div>
          <div><Label>Parent/Guardian Email</Label><Input type="email" value={form.parent_email} onChange={e => setForm({...form, parent_email: e.target.value})} placeholder="Used for fee reminders & attendance alerts" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingStudent} onOpenChange={(open) => { if (!open) setEditingStudent(null) }} title={`Edit — ${editingStudent?.first_name} ${editingStudent?.last_name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} required /></div>
            <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Admission Number</Label><Input value={editForm.admission_number} onChange={e => setEditForm({...editForm, admission_number: e.target.value})} /></div>
            <div><Label>Class</Label><Input value={editForm.class_name} onChange={e => setEditForm({...editForm, class_name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Gender</Label>
              <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Parent/Guardian Name</Label><Input value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} /></div>
            <div><Label>Parent/Guardian Phone</Label><Input value={editForm.parent_phone} onChange={e => setEditForm({...editForm, parent_phone: e.target.value})} /></div>
          </div>
          <div><Label>Parent/Guardian Email</Label><Input type="email" value={editForm.parent_email} onChange={e => setEditForm({...editForm, parent_email: e.target.value})} placeholder="Used for fee reminders & attendance alerts" /></div>
          {editingStudent && (
            <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
              <span className="text-sm font-medium">Enrollment Status</span>
              <select
                value={editingStudent.enrollment_status}
                onChange={e => setEditingStudent({ ...editingStudent, enrollment_status: e.target.value })}
                className="h-9 rounded-lg border border-secondary-300 bg-white px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingStudent && confirm(`Remove ${editingStudent.first_name} ${editingStudent.last_name}? This cannot be undone.`)) { del.mutate(editingStudent.id); setEditingStudent(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Student
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
              <Button
                type="submit"
                disabled={update.isPending}
              >
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Photo upload modal */}
      <Modal open={!!photoStudent} onOpenChange={() => setPhotoStudent(null)} title={`Photo — ${photoStudent?.first_name} ${photoStudent?.last_name}`}>
        <div className="text-center py-4">
          <div className="h-24 w-24 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {(photoStudent as { avatar_url?: string })?.avatar_url ? (
              <img src={(photoStudent as { avatar_url?: string }).avatar_url} alt="" className="h-full w-full object-cover" />
            ) : <Camera className="h-8 w-8 text-secondary-400" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f && photoStudent) uploadPhoto.mutate({ id: photoStudent.id, file: f }) }} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploadPhoto.isPending}>
            {uploadPhoto.isPending ? 'Uploading…' : 'Upload Photo'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
