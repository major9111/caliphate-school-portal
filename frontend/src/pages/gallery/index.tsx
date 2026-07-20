import { useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Trash2, Edit, Loader2, Image as ImageIcon, Upload } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi, type GalleryItem } from '@/lib/api'
import { isAxiosError } from 'axios'

const CATEGORIES = ['general', 'campus', 'classroom', 'events', 'sports']

export function GalleryPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('general')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['gallery'], queryFn: () => galleryApi.list() })
  const items = data?.items || []

  const create = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected')
      return galleryApi.create(file, { caption, note, category })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] })
      toast('Photo added to gallery', 'success')
      closeUpload()
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Upload failed' : 'Upload failed', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GalleryItem> }) => galleryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] })
      toast('Photo updated', 'success')
      setEditingItem(null)
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Update failed' : 'Update failed', 'error'),
  })

  const del = useMutation({
    mutationFn: galleryApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery'] }); toast('Photo removed', 'success') },
    onError: () => toast('Failed to delete photo', 'error'),
  })

  const closeUpload = () => {
    setUploadOpen(false)
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCaption('')
    setNote('')
    setCategory('general')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (f: File | null) => {
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
  }

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast('Please choose a photo first', 'error'); return }
    create.mutate()
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    update.mutate({ id: editingItem.id, data: { caption: editingItem.caption, note: editingItem.note, category: editingItem.category } })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gallery</h1>
          <p className="text-secondary-500 mt-1">Photos shown on the public gallery page</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Photo</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-secondary-500">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-secondary-300" />
              <p>No photos yet. Add the first one.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="group relative rounded-xl overflow-hidden border border-secondary-200 aspect-[4/3]">
                  <img src={item.url} alt={item.caption || 'Gallery photo'} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-3 opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="h-8 w-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center"
                        title="Edit caption / note"
                      >
                        <Edit className="h-4 w-4 text-secondary-700" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Remove this photo from the gallery?')) del.mutate(item.id) }}
                        className="h-8 w-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
                      <p className="text-white text-xs font-medium truncate">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload modal */}
      <Modal open={uploadOpen} onOpenChange={(open) => { if (!open) closeUpload(); else setUploadOpen(true) }} title="Add Photo" description="Upload an image and optionally add a caption and notes">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-secondary-200 aspect-video">
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-white/90 flex items-center justify-center text-xs font-medium"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-secondary-300 flex flex-col items-center justify-center gap-2 text-secondary-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Click to choose a photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Caption</Label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Sports Day 2026" />
          </div>

          <div className="space-y-2">
            <Label>Notes (internal or extra detail shown on click)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional longer note about this photo"
              className="flex w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : 'Add to Gallery'}
          </Button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null) }} title="Edit Photo" description="Update the caption, note, or category">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <img src={editingItem.url} alt={editingItem.caption || 'Gallery photo'} className="w-full aspect-video object-cover rounded-lg border border-secondary-200" />
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input value={editingItem.caption} onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={editingItem.note}
                onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                rows={3}
                className="flex w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default GalleryPage
