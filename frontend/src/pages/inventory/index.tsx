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
import { Plus, Package, AlertTriangle, Trash2, Search, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, type InventoryItem } from '@/lib/api'

const PAGE_SIZE = 20
const CATEGORIES = ['furniture','electronics','stationery','cleaning','sports','lab','books','kitchen','maintenance','other']
const emptyForm = { name: '', category: 'stationery', quantity: 0, unit: 'pcs', min_quantity: 10, location: '' }

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, category, lowStock, page],
    queryFn: () => inventoryApi.list({ page, limit: PAGE_SIZE, search: search||undefined, category: category||undefined, low_stock: lowStock||undefined }),
  })

  const add = useMutation({
    mutationFn: inventoryApi.add,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setModalOpen(false); setForm(emptyForm); toast('Item added', 'success') },
    onError: () => toast('Failed to add item', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => inventoryApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setEditingItem(null); toast('Item updated', 'success') },
    onError: () => toast('Failed to update item', 'error'),
  })
  const del = useMutation({
    mutationFn: inventoryApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast('Deleted', 'success') },
  })

  const openEdit = (i: InventoryItem) => {
    setEditingItem(i)
    setEditForm({ name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, min_quantity: i.min_quantity, location: i.location || '' })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    update.mutate({ id: editingItem.id, data: editForm })
  }

  const setF = (fn: () => void) => { fn(); setPage(1) }
  const items = data?.items || []
  const lowCount = items.filter(i => i.quantity <= i.min_quantity).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-secondary-500 mt-1">{data?.total || 0} items tracked {lowCount > 0 && `· ${lowCount} low stock`}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Items</p><p className="text-2xl font-bold">{data?.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500 text-orange-600">Low Stock</p><p className="text-2xl font-bold text-orange-600">{lowCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Categories</p><p className="text-2xl font-bold">{[...new Set(items.map(i => i.category))].length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48 relative">
          <Label>Search</Label>
          <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input className="pl-10" placeholder="Search items…" value={search} onChange={e => setF(() => setSearch(e.target.value))} />
          </div>
        </div>
        <div className="min-w-40">
          <Label>Category</Label>
          <select value={category} onChange={e => setF(() => setCategory(e.target.value))} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1 text-sm">
            <option value="">All</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <input type="checkbox" id="lowstock" checked={lowStock} onChange={e => setF(() => setLowStock(e.target.checked))} className="h-4 w-4" />
          <label htmlFor="lowstock" className="text-sm font-medium cursor-pointer flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-orange-500" />Low Stock Only</label>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={items}
          rowKey={i => i.id}
          emptyIcon={<Package className="h-10 w-10" />}
          emptyTitle="No inventory items"
          emptyDescription={lowStock ? "No items are currently low in stock." : "Add your first inventory item to track school supplies."}
          emptyAction={!lowStock ? { label: 'Add Item', onClick: () => setModalOpen(true) } : undefined}
          columns={[
            { key: 'name', header: 'Item Name', render: i => <button onClick={() => openEdit(i)} className="font-medium text-left hover:text-primary-600 transition-colors">{i.name}</button> },
            { key: 'cat', header: 'Category', render: i => <Badge variant="secondary">{i.category}</Badge> },
            { key: 'qty', header: 'Quantity', render: i => (
              <div className="flex items-center gap-2">
                <span className={`font-bold ${i.quantity <= i.min_quantity ? 'text-red-600' : 'text-green-600'}`}>{i.quantity}</span>
                <span className="text-xs text-secondary-400">{i.unit}</span>
                {i.quantity <= i.min_quantity && <AlertTriangle className="h-3 w-3 text-orange-500" />}
              </div>
            )},
            { key: 'min', header: 'Min Level', render: i => <span className="text-secondary-500">{i.min_quantity} {i.unit}</span> },
            { key: 'loc', header: 'Location', render: i => (i as { location?: string }).location || '—' },
            { key: 'status', header: 'Status', render: i => (
              <Badge variant={i.quantity === 0 ? 'danger' : i.quantity <= i.min_quantity ? 'warning' : 'success'}>
                {i.quantity === 0 ? 'Out of Stock' : i.quantity <= i.min_quantity ? 'Low Stock' : 'In Stock'}
              </Badge>
            )},
            { key: 'del', header: '', render: i => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(i)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if(confirm(`Delete ${i.name}?`)) del.mutate(i.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            )},
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
      </CardContent></Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Inventory Item">
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(form) }} className="space-y-4">
          <div><Label>Item Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category</Label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Unit</Label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['pcs','boxes','reams','litres','kg','sets','rolls','cartons'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantity</Label><Input type="number" min={0} value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} /></div>
            <div><Label>Minimum Level</Label><Input type="number" min={0} value={form.min_quantity} onChange={e => setForm({...form, min_quantity: Number(e.target.value)})} /></div>
          </div>
          <div><Label>Storage Location (optional)</Label><Input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Store Room A" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add Item'}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null) }} title={`Edit — ${editingItem?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><Label>Item Name</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category</Label>
              <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Unit</Label>
              <select value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['pcs','boxes','reams','litres','kg','sets','rolls','cartons'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantity</Label><Input type="number" min={0} value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} /></div>
            <div><Label>Minimum Level</Label><Input type="number" min={0} value={editForm.min_quantity} onChange={e => setEditForm({...editForm, min_quantity: Number(e.target.value)})} /></div>
          </div>
          <div><Label>Storage Location (optional)</Label><Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} /></div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingItem && confirm(`Delete ${editingItem.name}?`)) { del.mutate(editingItem.id); setEditingItem(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Item
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
