import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Globe, Trash2, Loader2, Edit } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsApi, type CmsPage as CmsPageType } from '@/lib/api'
import { isAxiosError } from 'axios'

const emptyForm = { title: '', slug: '', content: '', status: 'published' }

export function CmsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['cms-pages'], queryFn: () => cmsApi.list() })

  const create = useMutation({
    mutationFn: cmsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cms-pages'] }); closeModal(); toast('Page created', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to create page' : 'Failed to create page', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CmsPageType> }) => cmsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cms-pages'] }); closeModal(); toast('Page updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update page' : 'Failed to update page', 'error'),
  })

  const del = useMutation({
    mutationFn: cmsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cms-pages'] }); toast('Deleted', 'success') },
  })

  const pages = data?.items || []

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (page: CmsPageType) => {
    setEditingId(page.id)
    setForm({ title: page.title, slug: page.slug, content: page.content, status: page.status })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-') }
    if (editingId) {
      update.mutate({ id: editingId, data: payload })
    } else {
      create.mutate(payload)
    }
  }

  const isSaving = create.isPending || update.isPending

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Website CMS</h1><p className="text-secondary-500 mt-1">Manage pages</p></div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Page</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : pages.length === 0 ? (
            <p className="text-center py-8 text-secondary-500">No pages yet. Create your first page.</p>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Globe className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-secondary-500">/{page.slug} <Badge variant={page.status === 'published' ? 'success' : 'secondary'} className="ml-2">{page.status}</Badge></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(page)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${page.title}"?`)) del.mutate(page.id) }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={closeModal} title={editingId ? 'Edit Page' : 'New Page'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from title" /></div>
          <div><Label>Status</Label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div><Label>Content</Label><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="flex min-h-[150px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CmsPage
