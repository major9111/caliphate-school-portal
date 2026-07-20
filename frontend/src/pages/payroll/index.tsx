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
import { Plus, CreditCard, FileDown, Loader2, PlayCircle, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, payrollRunApi, exportsApi, type PayrollEntry } from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const emptyForm = { employee_id: '', employee_name: '', role: '', basic_salary: 0, allowances: 0, deductions: 0, month: 'June', year: '2026' }

export default function PayrollPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ month: '', year: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [form, setForm] = useState(emptyForm)
  const [bulkForm, setBulkForm] = useState({ month: 'June', year: '2026', base_salary: 80000, allowances: 15000 })
  const [bulkResult, setBulkResult] = useState<{ message: string; created_count: number; skipped: string[] } | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', filters, page],
    queryFn: () => payrollApi.list({ ...filters, page, limit: PAGE_SIZE }),
  })

  const create = useMutation({
    mutationFn: payrollApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setModalOpen(false); toast('Payroll entry created', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PayrollEntry> }) => payrollApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setEditingEntry(null); toast('Payroll entry updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update entry' : 'Failed to update entry', 'error'),
  })

  const bulkRun = useMutation({
    mutationFn: payrollRunApi.bulkRun,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['payroll'] }); setBulkResult(res); toast(res.message, 'success') },
    onError: () => toast('Bulk run failed', 'error'),
  })

  const del = useMutation({
    mutationFn: payrollApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast('Deleted', 'success') },
  })

  const openEdit = (p: PayrollEntry) => {
    setEditingEntry(p)
    setEditForm({ employee_id: p.employee_id, employee_name: p.employee_name, role: p.role, basic_salary: p.basic_salary, allowances: p.allowances, deductions: p.deductions, month: p.month, year: p.year })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return
    update.mutate({ id: editingEntry.id, data: { ...editForm, status: editingEntry.status } })
  }

  const setF = (k: string, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const totalNet = data?.total_amount || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-secondary-500 mt-1">Manage staff salaries with automatic tax calculations</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={exportsApi.payrollExcel(filters)} download className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary-50"><FileDown className="h-4 w-4" />Excel</a>
          <Button variant="outline" onClick={() => setBulkModalOpen(true)}><PlayCircle className="h-4 w-4 mr-2" />Bulk Run</Button>
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Entries</p><p className="text-2xl font-bold">{data?.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Net Pay</p><p className="text-2xl font-bold text-green-600">₦{totalNet.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Pending</p><p className="text-2xl font-bold text-orange-600">{data?.items?.filter(p => p.status === 'pending').length || 0}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-4">
        <div><Label>Month</Label>
          <select value={filters.month} onChange={e => setF('month', e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-1">
            <option value="">All Months</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div><Label>Year</Label><Input className="mt-1" placeholder="e.g. 2026" value={filters.year} onChange={e => setF('year', e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <DataTable
          isLoading={isLoading}
          data={data?.items || []}
          rowKey={p => p.id}
          emptyIcon={<CreditCard className="h-10 w-10" />}
          emptyTitle="No payroll entries"
          emptyDescription="Use Bulk Run to generate payroll for all staff, or add individual entries."
          emptyAction={{ label: 'Bulk Run', onClick: () => setBulkModalOpen(true) }}
          columns={[
            { key: 'name', header: 'Employee', render: p => <button onClick={() => openEdit(p)} className="text-left"><p className="font-medium hover:text-primary-600 transition-colors">{p.employee_name}</p><p className="text-xs text-secondary-500">{p.role}</p></button> },
            { key: 'basic', header: 'Basic', render: p => `₦${Number(p.basic_salary).toLocaleString()}` },
            { key: 'allow', header: 'Allowances', render: p => `₦${Number(p.allowances).toLocaleString()}` },
            { key: 'ded', header: 'Deductions', render: p => <span className="text-red-600">₦{Number(p.deductions).toLocaleString()}</span> },
            { key: 'net', header: 'Net Pay', render: p => <span className="font-bold text-green-600">₦{Number(p.net_salary).toLocaleString()}</span> },
            { key: 'period', header: 'Period', render: p => `${p.month} ${p.year}` },
            { key: 'status', header: 'Status', render: p => <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge> },
            { key: 'tax', header: 'Tax Breakdown', render: p => {
              const tb = (p as { tax_breakdown?: { paye?: number; pension?: number; nhis?: number; nhf?: number } }).tax_breakdown
              return tb ? (
                <span className="text-xs text-secondary-500">PAYE: ₦{(tb.paye||0).toLocaleString()} | Pension: ₦{(tb.pension||0).toLocaleString()}</span>
              ) : '—'
            }},
            { key: 'pdf', header: '', render: p => <a href={exportsApi.payslipPdf(p.id)} download className="text-xs text-primary-600 hover:underline whitespace-nowrap">Payslip</a> },
            { key: 'actions', header: '', render: p => (
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => openEdit(p)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if(confirm('Delete?')) del.mutate(p.id) }} className="text-secondary-400 hover:text-red-600 text-xs px-1">Del</button>
              </div>
            )},
          ]}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total || 0} onPageChange={setPage} />
      </CardContent></Card>

      {/* Add modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Payroll Entry">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee Name</Label><Input value={form.employee_name} onChange={e => setForm({...form, employee_name: e.target.value})} required /></div>
            <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} required /></div>
          </div>
          <div><Label>Role / Department</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Basic Salary (₦)</Label><Input type="number" min={0} value={form.basic_salary} onChange={e => setForm({...form, basic_salary: Number(e.target.value)})} /></div>
            <div><Label>Allowances (₦)</Label><Input type="number" min={0} value={form.allowances} onChange={e => setForm({...form, allowances: Number(e.target.value)})} /></div>
            <div><Label>Extra Deductions (₦)</Label><Input type="number" min={0} value={form.deductions} onChange={e => setForm({...form, deductions: Number(e.target.value)})} /></div>
          </div>
          <p className="text-xs text-secondary-500 bg-blue-50 rounded p-2">Statutory deductions (PAYE, Pension 8%, NHIS 1.75%, NHF 2.5%) are calculated automatically.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Month</Label>
              <select value={form.month} onChange={e => setForm({...form, month: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><Label>Year</Label><Input value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create Entry'}</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk run modal */}
      <Modal open={bulkModalOpen} onOpenChange={() => { setBulkModalOpen(false); setBulkResult(null) }} title="Bulk Payroll Run">
        {bulkResult ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-800">{bulkResult.message}</p>
              <p className="text-sm text-green-700 mt-1">{bulkResult.created_count} entries created</p>
            </div>
            {bulkResult.skipped.length > 0 && (
              <div><p className="text-sm font-medium mb-2">Skipped (already exists):</p>
                <ul className="text-sm text-secondary-600 space-y-1">{bulkResult.skipped.map(s => <li key={s}>• {s}</li>)}</ul>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => { setBulkModalOpen(false); setBulkResult(null) }}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); bulkRun.mutate(bulkForm) }} className="space-y-4">
            <p className="text-sm text-secondary-600">Generates payroll for all active teachers and staff with automatic Nigerian PAYE, Pension, NHIS, and NHF deductions.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Month</Label>
                <select value={bulkForm.month} onChange={e => setBulkForm({...bulkForm, month: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div><Label>Year</Label><Input value={bulkForm.year} onChange={e => setBulkForm({...bulkForm, year: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Default Basic Salary (₦)</Label><Input type="number" value={bulkForm.base_salary} onChange={e => setBulkForm({...bulkForm, base_salary: Number(e.target.value)})} /></div>
              <div><Label>Default Allowances (₦)</Label><Input type="number" value={bulkForm.allowances} onChange={e => setBulkForm({...bulkForm, allowances: Number(e.target.value)})} /></div>
            </div>
            <p className="text-xs text-secondary-500">Staff with individual salary set in their profile will use that amount instead of the default above.</p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setBulkModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={bulkRun.isPending}>
                {bulkRun.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running…</> : 'Run Payroll'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null) }} title={`Edit — ${editingEntry?.employee_name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee Name</Label><Input value={editForm.employee_name} onChange={e => setEditForm({...editForm, employee_name: e.target.value})} required /></div>
            <div><Label>Employee ID</Label><Input value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} required /></div>
          </div>
          <div><Label>Role / Department</Label><Input value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Basic Salary (₦)</Label><Input type="number" min={0} value={editForm.basic_salary} onChange={e => setEditForm({...editForm, basic_salary: Number(e.target.value)})} /></div>
            <div><Label>Allowances (₦)</Label><Input type="number" min={0} value={editForm.allowances} onChange={e => setEditForm({...editForm, allowances: Number(e.target.value)})} /></div>
            <div><Label>Extra Deductions (₦)</Label><Input type="number" min={0} value={editForm.deductions} onChange={e => setEditForm({...editForm, deductions: Number(e.target.value)})} /></div>
          </div>
          <p className="text-xs text-secondary-500 bg-blue-50 rounded p-2">Changing salary figures automatically recalculates PAYE, Pension, NHIS, and NHF, and the net pay shown on the payslip.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Month</Label>
              <select value={editForm.month} onChange={e => setEditForm({...editForm, month: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><Label>Year</Label><Input value={editForm.year} onChange={e => setEditForm({...editForm, year: e.target.value})} /></div>
          </div>
          {editingEntry && (
            <div className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
              <span className="text-sm font-medium">Status</span>
              <select
                value={editingEntry.status}
                onChange={e => setEditingEntry({ ...editingEntry, status: e.target.value })}
                className="h-9 rounded-lg border border-secondary-300 bg-white px-3 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingEntry && confirm('Delete this payroll entry?')) { del.mutate(editingEntry.id); setEditingEntry(null) } }}
              className="text-sm text-red-600 hover:text-red-700 px-2"
            >
              Delete Entry
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
