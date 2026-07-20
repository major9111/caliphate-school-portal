import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, Bus, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportApi, type TransportRoute } from '@/lib/api'
import { isAxiosError } from 'axios'

const emptyRouteForm = { route_name: '', bus_number: '', driver_name: '', driver_phone: '', conductor_name: '', fee: 0 }

export default function TransportPage() {
  const [tab, setTab] = useState<'routes' | 'students'>('routes')
  const [routeModal, setRouteModal] = useState(false)
  const [studentModal, setStudentModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null)
  const [editRForm, setEditRForm] = useState(emptyRouteForm)
  const [rForm, setRForm] = useState(emptyRouteForm)
  const [sForm, setSForm] = useState({ route_id: '', student_id: '', student_name: '', pickup_stop: '', dropoff_stop: '', monthly_fee: 0 })
  const qc = useQueryClient()

  const { data: routesData, isLoading: routesLoading } = useQuery({ queryKey: ['transport-routes'], queryFn: () => transportApi.getRoutes() })
  const { data: studentsData, isLoading: studentsLoading } = useQuery({ queryKey: ['transport-students'], queryFn: () => transportApi.getStudents(), enabled: tab === 'students' })

  const createRoute = useMutation({
    mutationFn: transportApi.createRoute,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); setRouteModal(false); setRForm(emptyRouteForm); toast('Route created', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const updateRoute = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransportRoute> }) => transportApi.updateRoute(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); setEditingRoute(null); toast('Route updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update route' : 'Failed to update route', 'error'),
  })
  const delRoute = useMutation({
    mutationFn: transportApi.deleteRoute,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); toast('Route deleted', 'success') },
  })
  const assignStudent = useMutation({
    mutationFn: transportApi.assignStudent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-students'] }); setStudentModal(false); toast('Student assigned', 'success') },
    onError: () => toast('Failed to assign student', 'error'),
  })
  const removeStudent = useMutation({
    mutationFn: transportApi.removeStudent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-students'] }); toast('Removed', 'success') },
  })

  const routes = routesData?.items || []

  const openEditRoute = (r: TransportRoute) => {
    setEditingRoute(r)
    setEditRForm({ route_name: r.route_name, bus_number: r.bus_number || '', driver_name: r.driver_name || '', driver_phone: r.driver_phone || '', conductor_name: r.conductor_name || '', fee: r.fee })
  }

  const handleEditRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoute) return
    updateRoute.mutate({ id: editingRoute.id, data: editRForm })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Transport</h1><p className="text-secondary-500 mt-1">{routes.length} routes configured</p></div>
        <div className="flex gap-2">
          {tab === 'routes' && <Button onClick={() => setRouteModal(true)}><Plus className="h-4 w-4 mr-2" />Add Route</Button>}
          {tab === 'students' && <Button onClick={() => setStudentModal(true)}><Plus className="h-4 w-4 mr-2" />Assign Student</Button>}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(['routes','students'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab===t?'border-primary-600 text-primary-600':'border-transparent text-secondary-500 hover:text-secondary-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'routes' && (
        <Card><CardContent className="p-6">
          <DataTable
            isLoading={routesLoading}
            data={routes}
            rowKey={r => r.id}
            emptyIcon={<Bus className="h-10 w-10" />}
            emptyTitle="No transport routes"
            emptyDescription="Add bus routes to manage student transportation."
            emptyAction={{ label: 'Add Route', onClick: () => setRouteModal(true) }}
            columns={[
              { key: 'route', header: 'Route Name', render: r => <button onClick={() => openEditRoute(r)} className="font-medium text-left hover:text-primary-600 transition-colors">{r.route_name}</button> },
              { key: 'bus', header: 'Bus No.', render: r => <span className="font-mono">{r.bus_number}</span> },
              { key: 'driver', header: 'Driver', render: r => <div><p>{r.driver_name}</p><p className="text-xs text-secondary-500">{r.driver_phone}</p></div> },
              { key: 'conductor', header: 'Conductor', render: r => r.conductor_name || '—' },
              { key: 'fee', header: 'Monthly Fee', render: r => `₦${Number(r.fee).toLocaleString()}` },
              { key: 'del', header: '', render: r => (
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => openEditRoute(r)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if(confirm('Delete route?')) delRoute.mutate(r.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              )},
            ]}
          />
        </CardContent></Card>
      )}

      {tab === 'students' && (
        <Card><CardContent className="p-6">
          <DataTable
            isLoading={studentsLoading}
            data={(studentsData?.items || []) as Array<{ id: string; student_name: string; route_id: string; pickup_stop: string; dropoff_stop: string; monthly_fee: number; status: string }>}
            rowKey={s => s.id}
            emptyIcon={<Bus className="h-10 w-10" />}
            emptyTitle="No students assigned"
            emptyDescription="Assign students to bus routes."
            emptyAction={{ label: 'Assign Student', onClick: () => setStudentModal(true) }}
            columns={[
              { key: 'name', header: 'Student', render: s => s.student_name },
              { key: 'route', header: 'Route', render: s => routes.find(r => r.id === s.route_id)?.route_name || s.route_id },
              { key: 'pickup', header: 'Pickup Stop', render: s => s.pickup_stop },
              { key: 'dropoff', header: 'Drop-off', render: s => s.dropoff_stop },
              { key: 'fee', header: 'Fee', render: s => `₦${Number(s.monthly_fee).toLocaleString()}` },
              { key: 'del', header: '', render: s => <button onClick={() => removeStudent.mutate(s.id)} className="text-secondary-400 hover:text-red-600 text-xs">Remove</button> },
            ]}
          />
        </CardContent></Card>
      )}

      <Modal open={routeModal} onOpenChange={setRouteModal} title="Add Bus Route">
        <form onSubmit={(e) => { e.preventDefault(); createRoute.mutate(rForm) }} className="space-y-4">
          <div><Label>Route Name</Label><Input value={rForm.route_name} onChange={e => setRForm({...rForm, route_name: e.target.value})} required placeholder="e.g. Tudun Wada — School" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Bus Number</Label><Input value={rForm.bus_number} onChange={e => setRForm({...rForm, bus_number: e.target.value})} placeholder="KAE-123-ZA" /></div>
            <div><Label>Monthly Fee (₦)</Label><Input type="number" min={0} value={rForm.fee} onChange={e => setRForm({...rForm, fee: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Driver Name</Label><Input value={rForm.driver_name} onChange={e => setRForm({...rForm, driver_name: e.target.value})} /></div>
            <div><Label>Driver Phone</Label><Input value={rForm.driver_phone} onChange={e => setRForm({...rForm, driver_phone: e.target.value})} /></div>
          </div>
          <div><Label>Conductor Name (optional)</Label><Input value={rForm.conductor_name} onChange={e => setRForm({...rForm, conductor_name: e.target.value})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setRouteModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createRoute.isPending}>{createRoute.isPending ? 'Creating…' : 'Create Route'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={studentModal} onOpenChange={setStudentModal} title="Assign Student to Route">
        <form onSubmit={(e) => { e.preventDefault(); assignStudent.mutate(sForm) }} className="space-y-4">
          <div><Label>Route</Label>
            <select value={sForm.route_id} onChange={e => setSForm({...sForm, route_id: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required>
              <option value="">Select route…</option>{routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student Name</Label><Input value={sForm.student_name} onChange={e => setSForm({...sForm, student_name: e.target.value})} required /></div>
            <div><Label>Student ID (optional)</Label><Input value={sForm.student_id} onChange={e => setSForm({...sForm, student_id: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Pickup Stop</Label><Input value={sForm.pickup_stop} onChange={e => setSForm({...sForm, pickup_stop: e.target.value})} /></div>
            <div><Label>Drop-off Stop</Label><Input value={sForm.dropoff_stop} onChange={e => setSForm({...sForm, dropoff_stop: e.target.value})} /></div>
          </div>
          <div><Label>Monthly Fee Override (₦)</Label><Input type="number" min={0} value={sForm.monthly_fee} onChange={e => setSForm({...sForm, monthly_fee: Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStudentModal(false)}>Cancel</Button>
            <Button type="submit" disabled={assignStudent.isPending}>{assignStudent.isPending ? 'Assigning…' : 'Assign'}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!editingRoute} onOpenChange={(open) => { if (!open) setEditingRoute(null) }} title={`Edit — ${editingRoute?.route_name}`}>
        <form onSubmit={handleEditRouteSubmit} className="space-y-4">
          <div><Label>Route Name</Label><Input value={editRForm.route_name} onChange={e => setEditRForm({...editRForm, route_name: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Bus Number</Label><Input value={editRForm.bus_number} onChange={e => setEditRForm({...editRForm, bus_number: e.target.value})} /></div>
            <div><Label>Monthly Fee (₦)</Label><Input type="number" min={0} value={editRForm.fee} onChange={e => setEditRForm({...editRForm, fee: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Driver Name</Label><Input value={editRForm.driver_name} onChange={e => setEditRForm({...editRForm, driver_name: e.target.value})} /></div>
            <div><Label>Driver Phone</Label><Input value={editRForm.driver_phone} onChange={e => setEditRForm({...editRForm, driver_phone: e.target.value})} /></div>
          </div>
          <div><Label>Conductor Name (optional)</Label><Input value={editRForm.conductor_name} onChange={e => setEditRForm({...editRForm, conductor_name: e.target.value})} /></div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingRoute && confirm('Delete route?')) { delRoute.mutate(editingRoute.id); setEditingRoute(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Route
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingRoute(null)}>Cancel</Button>
              <Button type="submit" disabled={updateRoute.isPending}>{updateRoute.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
