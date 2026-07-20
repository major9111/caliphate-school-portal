import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonCard } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Plus, TrendingUp, DollarSign, AlertCircle, Wallet, FileDown, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi, exportsApi } from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20
const FEE_TYPES = ['tuition', 'development_levy', 'pta', 'library', 'sports', 'exam', 'boarding', 'feeding', 'uniform', 'other']
const METHODS = ['cash', 'bank_transfer', 'pos', 'cheque', 'online']

export default function FinancePage() {
  const [tab, setTab] = useState<'overview' | 'payments' | 'expenses'>('overview')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [form, setForm] = useState({ student_name: '', amount: '', type: 'tuition', method: 'cash', class_name: '', term: 'Second Term', session: '2025/2026' })
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'supplies' })
  const qc = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['finance-stats'], queryFn: financeApi.getStats })
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', search, statusFilter, page],
    queryFn: () => financeApi.getPayments({ page, limit: PAGE_SIZE, student_name: search || undefined, status: statusFilter || undefined }),
    enabled: tab === 'payments' || tab === 'overview',
  })
  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => financeApi.getExpenses(),
    enabled: tab === 'expenses',
  })

  const record = useMutation({
    mutationFn: financeApi.recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-stats'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      setModalOpen(false)
      setForm({ student_name: '', amount: '', type: 'tuition', method: 'cash', class_name: '', term: 'Second Term', session: '2025/2026' })
      toast('Payment recorded', 'success')
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const addExpense = useMutation({
    mutationFn: financeApi.createExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', 'finance-stats'] }); setExpenseModalOpen(false); setExpForm({ description: '', amount: '', category: 'supplies' }); toast('Expense recorded', 'success') },
    onError: () => toast('Failed to record expense', 'error'),
  })
  const deletePayment = useMutation({
    mutationFn: financeApi.deletePayment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments', 'finance-stats'] }); toast('Payment deleted', 'success') },
    onError: () => toast('Failed to delete payment', 'error'),
  })
  const deleteExpense = useMutation({
    mutationFn: financeApi.deleteExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', 'finance-stats'] }); toast('Expense deleted', 'success') },
    onError: () => toast('Failed to delete expense', 'error'),
  })

  const setFilter = (val: string) => { setStatusFilter(val); setPage(1) }
  const setS = (val: string) => { setSearch(val); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Finance</h1><p className="text-secondary-500 mt-1">Track payments and expenses</p></div>
        <div className="flex gap-2">
          <a href={exportsApi.paymentsExcel()} download className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary-50"><FileDown className="h-4 w-4" />Excel</a>
          <a href={exportsApi.paymentsCsv()} download className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary-50"><FileDown className="h-4 w-4" />CSV</a>
          <Button variant="outline" onClick={() => setExpenseModalOpen(true)}>+ Expense</Button>
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? [1,2,3,4].map(i => <SkeletonCard key={i} />) : [
          { icon: TrendingUp, label: 'Total Revenue', value: `₦${(stats?.total_revenue || 0).toLocaleString()}`, color: 'text-green-600 bg-green-100' },
          { icon: Wallet, label: 'Collected', value: `₦${(stats?.collected || 0).toLocaleString()}`, color: 'text-blue-600 bg-blue-100' },
          { icon: AlertCircle, label: 'Outstanding', value: `₦${(stats?.outstanding || 0).toLocaleString()}`, color: 'text-orange-600 bg-orange-100' },
          { icon: DollarSign, label: 'Expenses', value: `₦${(stats?.expenses || 0).toLocaleString()}`, color: 'text-red-600 bg-red-100' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}><CardContent className="p-5 flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
            <div><p className="text-xs text-secondary-500">{label}</p><p className="text-xl font-bold">{value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['overview', 'payments', 'expenses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-900'}`}>{t}</button>
        ))}
      </div>

      {(tab === 'overview' || tab === 'payments') && (
        <Card><CardContent className="p-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Input placeholder="Search by student name…" value={search} onChange={e => setS(e.target.value)} />
            <select value={statusFilter} onChange={e => setFilter(e.target.value)} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm">
              <option value="">All Statuses</option><option value="paid">Paid</option><option value="pending">Pending</option>
            </select>
          </div>
          <DataTable
            isLoading={paymentsLoading}
            data={paymentsData?.items || []}
            rowKey={p => p.id}
            emptyIcon={<DollarSign className="h-10 w-10" />}
            emptyTitle="No payments yet"
            emptyDescription="Record your first payment to get started."
            emptyAction={{ label: 'Record Payment', onClick: () => setModalOpen(true) }}
            columns={[
              { key: 'student', header: 'Student', render: p => <p className="font-medium">{p.student_name}</p> },
              { key: 'type', header: 'Type', render: p => <span className="capitalize">{p.type?.replace(/_/g, ' ')}</span> },
              { key: 'method', header: 'Method', render: p => p.method },
              { key: 'amount', header: 'Amount', render: p => <span className="font-bold text-green-600">₦{Number(p.amount).toLocaleString()}</span> },
              { key: 'date', header: 'Date', render: p => p.payment_date },
              { key: 'receipt', header: 'Receipt', render: p => <span className="text-xs font-mono">{p.receipt_number}</span> },
              { key: 'status', header: 'Status', render: p => <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge> },
              { key: 'pdf', header: '', render: p => <a href={exportsApi.receiptPdf(p.id)} download className="text-xs text-primary-600 hover:underline">PDF</a> },
              { key: 'del', header: '', render: p => <button onClick={() => { if (confirm(`Delete payment of ₦${Number(p.amount).toLocaleString()} for ${p.student_name}?`)) deletePayment.mutate(p.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button> },
            ]}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={paymentsData?.total || 0} onPageChange={setPage} />
        </CardContent></Card>
      )}

      {tab === 'expenses' && (
        <Card><CardContent className="p-6">
          <DataTable
            isLoading={expLoading}
            data={expensesData?.items || []}
            rowKey={e => e.id}
            emptyIcon={<DollarSign className="h-10 w-10" />}
            emptyTitle="No expenses recorded"
            emptyDescription="Track school expenses here."
            emptyAction={{ label: 'Add Expense', onClick: () => setExpenseModalOpen(true) }}
            columns={[
              { key: 'desc', header: 'Description', render: e => e.description },
              { key: 'cat', header: 'Category', render: e => <Badge variant="secondary">{e.category}</Badge> },
              { key: 'amount', header: 'Amount', render: e => <span className="font-bold text-red-600">₦{Number(e.amount).toLocaleString()}</span> },
              { key: 'date', header: 'Date', render: e => e.expense_date },
              { key: 'del', header: '', render: e => <button onClick={() => { if (confirm(`Delete expense "${e.description}"?`)) deleteExpense.mutate(e.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button> },
            ]}
          />
        </CardContent></Card>
      )}

      {/* Payment modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Record Payment">
        <form onSubmit={(e) => { e.preventDefault(); record.mutate({ ...form, amount: Number(form.amount) }) }} className="space-y-4">
          <div><Label>Student Name</Label><Input value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Amount (₦)</Label><Input type="number" min={1} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Fee Type</Label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {FEE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><Label>Method</Label>
              <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Term</Label>
              <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['First Term','Second Term','Third Term'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Session</Label><Input value={form.session} onChange={e => setForm({ ...form, session: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>{record.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      {/* Expense modal */}
      <Modal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} title="Record Expense">
        <form onSubmit={(e) => { e.preventDefault(); addExpense.mutate({ ...expForm, amount: Number(expForm.amount) }) }} className="space-y-4">
          <div><Label>Description</Label><Input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Amount (₦)</Label><Input type="number" min={1} value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required /></div>
            <div><Label>Category</Label>
              <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {['supplies','maintenance','utilities','salaries','events','transport','other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addExpense.isPending}>{addExpense.isPending ? 'Recording…' : 'Record Expense'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
