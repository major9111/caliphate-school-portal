import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, DollarSign, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi } from '@/lib/api'

export default function PayrollPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filters, setFilters] = useState({ month: '', year: new Date().getFullYear().toString() })
  const [form, setForm] = useState({ employee_id: '', employee_name: '', role: '', basic_salary: 0, allowances: 0, deductions: 0, month: '', year: '' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['payroll', filters], queryFn: () => payrollApi.list(filters) })
  const create = useMutation({ mutationFn: payrollApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setModalOpen(false); setForm({ employee_id: '', employee_name: '', role: '', basic_salary: 0, allowances: 0, deductions: 0, month: '', year: '' }); toast('Payroll created', 'success') } })

  const records = data?.items || []
  const totalPayroll = records.reduce((sum: number, r: any) => sum + (r.net_salary || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Payroll Management</h1><p className="text-secondary-500 mt-1">Manage staff salaries</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Payroll</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Total Records</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Total Payroll</p><p className="text-2xl font-bold">{totalPayroll.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Period</p><p className="text-lg font-bold">{filters.month || 'All'} {filters.year}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div><Label>Month</Label>
          <select value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
            <option value="">All Months</option><option>January</option><option>February</option><option>March</option><option>April</option><option>May</option><option>June</option><option>July</option><option>August</option><option>September</option><option>October</option><option>November</option><option>December</option>
          </select>
        </div>
        <div><Label>Year</Label><Input type="number" value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} /></div>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : records.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No payroll records</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Employee</th><th className="text-left p-3 text-xs uppercase">Role</th><th className="text-left p-3 text-xs uppercase">Period</th><th className="text-left p-3 text-xs uppercase">Basic</th><th className="text-left p-3 text-xs uppercase">Allowances</th><th className="text-left p-3 text-xs uppercase">Deductions</th><th className="text-left p-3 text-xs uppercase">Net Salary</th><th className="text-left p-3 text-xs uppercase">Status</th></tr></thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{r.employee_name}</td>
                      <td className="p-3 text-sm">{r.role}</td>
                      <td className="p-3 text-sm">{r.month} {r.year}</td>
                      <td className="p-3 text-sm">{r.basic_salary?.toLocaleString()}</td>
                      <td className="p-3 text-sm">{r.allowances?.toLocaleString()}</td>
                      <td className="p-3 text-sm">{r.deductions?.toLocaleString()}</td>
                      <td className="p-3 font-bold text-green-600">{r.net_salary?.toLocaleString()}</td>
                      <td className="p-3"><Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Payroll">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate({...form, net_salary: form.basic_salary + form.allowances - form.deductions}) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee ID *</Label><Input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} required /></div>
            <div><Label>Employee Name *</Label><Input value={form.employee_name} onChange={e => setForm({...form, employee_name: e.target.value})} required /></div>
          </div>
          <div><Label>Role *</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Month *</Label>
              <select value={form.month} onChange={e => setForm({...form, month: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required>
                <option>January</option><option>February</option><option>March</option><option>April</option><option>May</option><option>June</option><option>July</option><option>August</option><option>September</option><option>October</option><option>November</option><option>December</option>
              </select>
            </div>
            <div><Label>Year *</Label><Input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} defaultValue={new Date().getFullYear()} required /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Basic Salary *</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: Number(e.target.value)})} required /></div>
            <div><Label>Allowances</Label><Input type="number" value={form.allowances} onChange={e => setForm({...form, allowances: Number(e.target.value)})} /></div>
            <div><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={e => setForm({...form, deductions: Number(e.target.value)})} /></div>
          </div>
          <div className="p-4 bg-secondary-50 rounded-lg">
            <p className="text-sm text-secondary-600">Net Salary: <span className="font-bold text-lg">{(form.basic_salary + form.allowances - form.deductions).toLocaleString()}</span></p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create Payroll'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
