import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Bus, Trash2, Loader2, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transportApi } from '@/lib/api'

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<'routes' | 'students'>('routes')
  const [routeModalOpen, setRouteModalOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [routeForm, setRouteForm] = useState({ route_name: '', bus_number: '', driver_name: '', driver_phone: '', conductor_name: '', fee: 0 })
  const [studentForm, setStudentForm] = useState({ student_id: '', student_name: '', route_id: '', pickup_stop: '', dropoff_stop: '', monthly_fee: 0 })
  const qc = useQueryClient()
  const { data: routesData, isLoading: routesLoading } = useQuery({ queryKey: ['transport-routes'], queryFn: transportApi.getRoutes })
  const { data: studentsData, isLoading: studentsLoading } = useQuery({ queryKey: ['transport-students'], queryFn: transportApi.getStudents })
  const createRoute = useMutation({ mutationFn: transportApi.createRoute, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); setRouteModalOpen(false); setRouteForm({ route_name: '', bus_number: '', driver_name: '', driver_phone: '', conductor_name: '', fee: 0 }); toast('Route created', 'success') } })
  const delRoute = useMutation({ mutationFn: transportApi.deleteRoute, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); toast('Route deleted', 'success') } })
  const assignStudent = useMutation({ mutationFn: transportApi.assignStudent, onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-students'] }); setStudentModalOpen(false); setStudentForm({ student_id: '', student_name: '', route_id: '', pickup_stop: '', dropoff_stop: '', monthly_fee: 0 }); toast('Student assigned', 'success') } })

  const routes = routesData?.items || []
  const students = studentsData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Transport Management</h1><p className="text-secondary-500 mt-1">Manage bus routes and students</p></div>
        <Button onClick={() => setRouteModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Route</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'routes' ? 'default' : 'outline'} onClick={() => setActiveTab('routes')}>Routes</Button>
        <Button variant={activeTab === 'students' ? 'default' : 'outline'} onClick={() => setActiveTab('students')}>Students</Button>
      </div>

      {activeTab === 'routes' ? (
        routesLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : routes.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-secondary-500"><Bus className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No routes created yet</p></CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {routes.map((route: any) => (
              <Card key={route.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Bus className="h-8 w-8 text-primary-600" />
                      <div>
                        <h3 className="font-bold text-lg">{route.route_name}</h3>
                        <p className="text-sm text-secondary-500">Bus: {route.bus_number}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => delRoute.mutate(route.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Driver:</strong> {route.driver_name} - {route.driver_phone}</p>
                    <p><strong>Conductor:</strong> {route.conductor_name || 'N/A'}</p>
                    <p><strong>Monthly Fee:</strong> {route.fee?.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : studentsLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : students.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No students assigned</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setStudentModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Student</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Student</th><th className="text-left p-3 text-xs uppercase">Route</th><th className="text-left p-3 text-xs uppercase">Pickup</th><th className="text-left p-3 text-xs uppercase">Dropoff</th><th className="text-left p-3 text-xs uppercase">Fee</th><th className="text-left p-3 text-xs uppercase">Status</th></tr></thead>
                <tbody>
                  {students.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{s.student_name}</td>
                      <td className="p-3 text-sm">{s.route_id}</td>
                      <td className="p-3 text-sm">{s.pickup_stop}</td>
                      <td className="p-3 text-sm">{s.dropoff_stop}</td>
                      <td className="p-3 text-sm">{s.monthly_fee?.toLocaleString()}</td>
                      <td className="p-3"><Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={routeModalOpen} onOpenChange={setRouteModalOpen} title="Add Bus Route">
        <form onSubmit={(e) => { e.preventDefault(); createRoute.mutate(routeForm) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Route Name *</Label><Input value={routeForm.route_name} onChange={e => setRouteForm({...routeForm, route_name: e.target.value})} required /></div>
            <div><Label>Bus Number *</Label><Input value={routeForm.bus_number} onChange={e => setRouteForm({...routeForm, bus_number: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Driver Name *</Label><Input value={routeForm.driver_name} onChange={e => setRouteForm({...routeForm, driver_name: e.target.value})} required /></div>
            <div><Label>Driver Phone *</Label><Input value={routeForm.driver_phone} onChange={e => setRouteForm({...routeForm, driver_phone: e.target.value})} required /></div>
          </div>
          <div><Label>Conductor Name</Label><Input value={routeForm.conductor_name} onChange={e => setRouteForm({...routeForm, conductor_name: e.target.value})} /></div>
          <div><Label>Monthly Fee</Label><Input type="number" value={routeForm.fee} onChange={e => setRouteForm({...routeForm, fee: Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setRouteModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createRoute.isPending}>{createRoute.isPending ? 'Creating...' : 'Create Route'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={studentModalOpen} onOpenChange={setStudentModalOpen} title="Assign Student">
        <form onSubmit={(e) => { e.preventDefault(); assignStudent.mutate(studentForm) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student ID *</Label><Input value={studentForm.student_id} onChange={e => setStudentForm({...studentForm, student_id: e.target.value})} required /></div>
            <div><Label>Student Name *</Label><Input value={studentForm.student_name} onChange={e => setStudentForm({...studentForm, student_name: e.target.value})} required /></div>
          </div>
          <div><Label>Route ID *</Label><Input value={studentForm.route_id} onChange={e => setStudentForm({...studentForm, route_id: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Pickup Stop *</Label><Input value={studentForm.pickup_stop} onChange={e => setStudentForm({...studentForm, pickup_stop: e.target.value})} required /></div>
            <div><Label>Dropoff Stop *</Label><Input value={studentForm.dropoff_stop} onChange={e => setStudentForm({...studentForm, dropoff_stop: e.target.value})} required /></div>
          </div>
          <div><Label>Monthly Fee</Label><Input type="number" value={studentForm.monthly_fee} onChange={e => setStudentForm({...studentForm, monthly_fee: Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStudentModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={assignStudent.isPending}>{assignStudent.isPending ? 'Assigning...' : 'Assign Student'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
