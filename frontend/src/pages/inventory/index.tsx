import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Package, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'

export default function InventoryPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ name: '', category: '', quantity: 0, unit: '', min_quantity: 10, location: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['inventory', filter], queryFn: () => inventoryApi.list(filter ? { category: filter } : undefined) })
  const add = useMutation({ mutationFn: inventoryApi.add, onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setModalOpen(false); setForm({ name: '', category: '', quantity: 0, unit: '', min_quantity: 10, location: '' }); toast('Item added', 'success') } })
  const del = useMutation({ mutationFn: inventoryApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast('Item deleted', 'success') } })

  const items = data?.items || []
  const lowStock = items.filter((i: any) => i.quantity <= i.min_quantity)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Inventory Management</h1><p className="text-secondary-500 mt-1">Track school supplies</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div><p className="font-semibold text-red-800">Low Stock Alert</p><p className="text-sm text-red-600">{lowStock.length} item(s) below minimum</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        <Input placeholder="Filter by category..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={() => setFilter('')}>Clear</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No inventory items</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Item</th><th className="text-left p-3 text-xs uppercase">Category</th><th className="text-left p-3 text-xs uppercase">Quantity</th><th className="text-left p-3 text-xs uppercase">Unit</th><th className="text-left p-3 text-xs uppercase">Min Qty</th><th className="text-left p-3 text-xs uppercase">Location</th><th className="text-left p-3 text-xs uppercase">Status</th><th className="text-right p-3 text-xs uppercase">Actions</th></tr></thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-sm">{item.category}</td>
                      <td className="p-3 text-sm">{item.quantity}</td>
                      <td className="p-3 text-sm">{item.unit}</td>
                      <td className="p-3 text-sm">{item.min_quantity}</td>
                      <td className="p-3 text-sm">{item.location}</td>
                      <td className="p-3"><Badge variant={item.quantity <= item.min_quantity ? 'danger' : 'success'}>{item.quantity <= item.min_quantity ? 'Low Stock' : 'In Stock'}</Badge></td>
                      <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Inventory Item">
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(form) }} className="space-y-4">
          <div><Label>Item Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category *</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} required /></div>
            <div><Label>Unit *</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="pcs, boxes, kg" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} required /></div>
            <div><Label>Min Quantity</Label><Input type="number" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: Number(e.target.value)})} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={add.isPending}>{add.isPending ? 'Adding...' : 'Add Item'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
