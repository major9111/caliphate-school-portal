import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Globe, Trash2, Loader2, Edit } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsApi } from '@/lib/api'

export function CmsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', content: '', status: 'published' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['cms-pages'], queryFn: cmsApi.list })
  const create = useMutation({ mutationFn: cmsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['cms-pages'] }); setModalOpen(false); setForm({ title: '', slug: '', content: '', status: 'published' }); toast('Page created', 'success') } })
  const del = useMutation({ mutationFn: cmsApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['cms-pages'] }); toast('Deleted', 'success') } })

  const pages = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Website CMS</h1><p className="text-secondary-500 mt-1">Manage pages</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />New Page</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : pages.length === 0 ? <p className="text-center py-8 text-secondary-500">No pages</p> : (
            <div className="space-y-3">
              {pages.map((page: any) => (
                <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Globe className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-secondary-500">/{page.slug} - {page.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(page.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="New Page">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate({...form, slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-')}) }} className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} /></div>
          <div><Label>Content</Label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="flex min-h-[150px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CmsPage
