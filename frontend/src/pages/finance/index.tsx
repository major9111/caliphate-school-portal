import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Wallet, DollarSign, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/api'

export function FinancePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ student_name: '', amount: '', type: 'tuition', method: 'cash' })
  const qc = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['finance-stats'], queryFn: financeApi.getStats })
  const { data: payments, isLoading: paymentsLoading } = useQuery({ queryKey: ['payments'], queryFn: () => financeApi.getPayments({ limit: 10 }) })
  const record = useMutation({ mutationFn: financeApi.recordPayment, onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-stats', 'payments'] }); setModalOpen(false); setForm({ student_name: '', amount: '', type: 'tuition', method: 'cash' }); toast('Payment recorded', 'success') } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Finance</h1><p className="text-secondary-500 mt-1">Manage fees and payments</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Total Revenue</p><p className="text-2xl font-bold">{statsLoading ? '...' : `${(stats?.total_revenue || 0).toLocaleString()}`}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Collected</p><p className="text-2xl font-bold">{statsLoading ? '...' : `${(stats?.collected || 0).toLocaleString()}`}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-secondary-500">Outstanding</p><p className="text-2xl font-bold">{statsLoading ? '...' : `${(stats?.outstanding || 0).toLocaleString()}`}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">Recent Payments</h3>
          {paymentsLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : !payments?.items || payments.items.length === 0 ? <p className="text-center py-8 text-secondary-500">No payments yet</p> : (
            <div className="space-y-3">
              {payments.items.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Wallet className="h-8 w-8 text-green-600" />
                    <div><p className="font-medium">{p.student_name}</p><p className="text-sm text-secondary-500">{p.type} - {p.method}</p></div>
                  </div>
                  <div className="text-right"><p className="text-lg font-bold text-green-600">{p.amount?.toLocaleString()}</p><p className="text-xs text-secondary-500">{p.date}</p></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Record Payment">
        <form onSubmit={(e) => { e.preventDefault(); record.mutate({...form, amount: Number(form.amount)}) }} className="space-y-4">
          <div><Label>Student Name</Label><Input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} required /></div>
          <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="tuition">Tuition</option><option value="admission">Admission</option><option value="exam">Examination</option><option value="other">Other</option>
              </select>
            </div>
            <div><Label>Method</Label>
              <select value={form.method} onChange={e => setForm({...form, method: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="cash">Cash</option><option value="transfer">Bank Transfer</option><option value="pos">POS</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>{record.isPending ? 'Recording...' : 'Record'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FinancePage
