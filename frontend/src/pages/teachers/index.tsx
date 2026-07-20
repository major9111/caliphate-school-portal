import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, GraduationCap, Search, Pencil, Trash2, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi, type Teacher } from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20
const COMMON_SUBJECTS = [
  'Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Civic Education',
  'Physics', 'Chemistry', 'Biology', 'Further Mathematics', 'Agricultural Science',
  'Literature', 'Government', 'Economics', 'Geography', 'History',
  'Computer Studies', 'CRK/IRK', 'Arabic', 'Hausa', 'French',
  'Home Economics', 'Physical Education', 'Fine Arts', 'Music',
]
const emptyForm = { full_name: '', email: '', phone: '', subjects: [] as string[], qualification: '' }

function SubjectPicker({ selected, onChange }: { selected: string[]; onChange: (subjects: string[]) => void }) {
  const [customInput, setCustomInput] = useState('')

  const toggle = (subject: string) => {
    onChange(selected.includes(subject) ? selected.filter(s => s !== subject) : [...selected, subject])
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed])
    setCustomInput('')
  }

  return (
    <div className="space-y-2">
      <Label>Subjects Taught</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-100 text-primary-700 text-xs font-medium">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-primary-900"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="max-h-40 overflow-y-auto border border-secondary-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {COMMON_SUBJECTS.map(s => (
          <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} className="rounded border-secondary-300" />
            {s}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Add another subject…"
        />
        <Button type="button" variant="outline" onClick={addCustom}>Add</Button>
      </div>
    </div>
  )
}

export default function TeachersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search, page],
    queryFn: () => teachersApi.list({ page, limit: PAGE_SIZE, search: search || undefined }),
  })
  const create = useMutation({
    mutationFn: teachersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      setModalOpen(false)
      setForm(emptyForm)
      toast('Teacher added', 'success')
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to add teacher' : 'Failed to add teacher', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Teacher> }) => teachersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setEditingTeacher(null); toast('Teacher updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update teacher' : 'Failed to update teacher', 'error'),
  })

  const del = useMutation({
    mutationFn: teachersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast('Teacher removed', 'success') },
    onError: () => toast('Failed to remove teacher', 'error'),
  })

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t)
    setEditForm({ full_name: t.full_name, email: t.email, phone: t.phone || '', subjects: t.subjects || [], qualification: t.qualification || '' })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeacher) return
    update.mutate({ id: editingTeacher.id, data: { ...editForm, is_active: editingTeacher.is_active } })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Teachers</h1><p className="text-secondary-500 mt-1">Manage teaching staff ({data?.total || 0} total)</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Teacher</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input className="pl-10" placeholder="Search by name or email…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <DataTable
            isLoading={isLoading}
            data={data?.items || []}
            rowKey={t => t.id}
            emptyIcon={<GraduationCap className="h-10 w-10" />}
            emptyTitle="No teachers yet"
            emptyDescription="Add your first teacher to get started."
            emptyAction={{ label: 'Add Teacher', onClick: () => setModalOpen(true) }}
            columns={[
              { key: 'name', header: 'Name', render: t => <button onClick={() => openEdit(t)} className="font-medium text-left hover:text-primary-600 transition-colors">{t.full_name}</button> },
              { key: 'subjects', header: 'Subjects', render: t => t.subjects && t.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {t.subjects.slice(0, 3).map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                  {t.subjects.length > 3 && <Badge variant="outline">+{t.subjects.length - 3} more</Badge>}
                </div>
              ) : '—' },
              { key: 'email', header: 'Email', render: t => <span className="text-secondary-500">{t.email}</span> },
              { key: 'phone', header: 'Phone', render: t => t.phone || '—' },
              { key: 'status', header: 'Status', render: t => <Badge variant={t.is_active ? 'success' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge> },
              { key: 'actions', header: '', render: t => (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => openEdit(t)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${t.full_name}?`)) del.mutate(t.id) }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )},
            ]}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add New Teacher">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <SubjectPicker selected={form.subjects} onChange={(subjects) => setForm({ ...form, subjects })} />
          <div><Label>Qualification</Label><Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingTeacher} onOpenChange={(open) => { if (!open) setEditingTeacher(null) }} title={`Edit — ${editingTeacher?.full_name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
          </div>
          <SubjectPicker selected={editForm.subjects} onChange={(subjects) => setEditForm({ ...editForm, subjects })} />
          <div><Label>Qualification</Label><Input value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} /></div>
          {editingTeacher && (
            <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
              <span className="text-sm font-medium">Status</span>
              <select
                value={editingTeacher.is_active ? 'active' : 'inactive'}
                onChange={e => setEditingTeacher({ ...editingTeacher, is_active: e.target.value === 'active' })}
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
              onClick={() => { if (editingTeacher && confirm(`Remove ${editingTeacher.full_name}?`)) { del.mutate(editingTeacher.id); setEditingTeacher(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Teacher
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
