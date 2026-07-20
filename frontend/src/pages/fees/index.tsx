import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Plus, DollarSign, AlertCircle, Send, Loader2, Trash2, Edit } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feeStructuresApi, settingsApi, type FeeStructure } from '@/lib/api'
import { isAxiosError } from 'axios'

const TERMS = ['First Term', 'Second Term', 'Third Term']
const SESSIONS = ['2024/2025', '2025/2026', '2026/2027']
const FEE_TYPES = ['tuition', 'development_levy', 'pta', 'library', 'sports', 'lab', 'exam', 'boarding', 'feeding', 'uniform', 'stationery', 'other']

const emptyForm = { class_name: '', level: 'junior_secondary', term: 'Second Term', session: '2025/2026', due_date: '', description: '', fees: [{ type: 'tuition', amount: 0 }] }

export default function FeesPage() {
  const [tab, setTab] = useState<'structures' | 'outstanding'>('structures')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [outFilter, setOutFilter] = useState({ class_name: '', term: 'Second Term', session: '2025/2026' })
  const [remindingAll, setRemindingAll] = useState(false)
  const qc = useQueryClient()

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  useEffect(() => {
    if (settings?.current_term && settings?.current_session) {
      setForm(f => ({ ...f, term: settings.current_term, session: settings.current_session }))
      setOutFilter(f => ({ ...f, term: settings.current_term, session: settings.current_session }))
    }
  }, [settings])

  const { data: structData, isLoading: structLoading } = useQuery({ queryKey: ['fee-structures'], queryFn: () => feeStructuresApi.list() })
  const { data: outData, isLoading: outLoading } = useQuery({
    queryKey: ['fee-outstanding', outFilter],
    queryFn: () => feeStructuresApi.getOutstanding(outFilter),
    enabled: tab === 'outstanding',
  })

  const create = useMutation({
    mutationFn: feeStructuresApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); closeModal(); toast('Fee structure created', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeStructure> }) => feeStructuresApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); closeModal(); toast('Fee structure updated', 'success') },
    onError: () => toast('Failed to update', 'error'),
  })
  const del = useMutation({
    mutationFn: feeStructuresApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structures'] }); toast('Deleted', 'success') },
  })
  const remind = useMutation({
    mutationFn: ({ id }: { id: string }) => feeStructuresApi.sendReminder(id, outFilter.term, outFilter.session),
    onSuccess: () => toast('Reminder sent', 'success'),
    onError: () => toast('Failed to send reminder', 'error'),
  })

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(emptyForm) }

  const openEdit = (s: FeeStructure) => {
    setEditingId(s.id)
    setForm({ class_name: s.class_name, level: s.level || '', term: s.term, session: s.session, due_date: s.due_date, description: s.description || '', fees: s.fees || [{ type: 'tuition', amount: 0 }] })
    setModalOpen(true)
  }

  const addFeeRow = () => setForm({ ...form, fees: [...form.fees, { type: 'other', amount: 0 }] })
  const removeFeeRow = (i: number) => setForm({ ...form, fees: form.fees.filter((_, idx) => idx !== i) })
  const updateFeeRow = (i: number, field: string, value: string | number) =>
    setForm({ ...form, fees: form.fees.map((f, idx) => idx === i ? { ...f, [field]: value } : f) })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, fees: form.fees.map(f => ({ ...f, amount: Number(f.amount) })) }
    if (editingId) update.mutate({ id: editingId, data: payload })
    else create.mutate(payload)
  }

  const structures = structData?.items || []
  const outstanding = outData?.students || []
  const totalOutstanding = outData?.total_outstanding || 0

  const handleRemindAll = async () => {
    setRemindingAll(true)
    try {
      await feeStructuresApi.sendAllReminders(outFilter.term, outFilter.session, outFilter.class_name || undefined)
      toast('Reminders queued for all students with outstanding fees', 'success')
    } catch { toast('Failed to send reminders', 'error') }
    finally { setRemindingAll(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Fee Management</h1><p className="text-secondary-500 mt-1">Define fee structures and track outstanding payments</p></div>
        {tab === 'structures' && <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Structure</Button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['structures', 'outstanding'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'structures' && (
        <Card><CardContent className="p-6">
          {structLoading ? <SkeletonTable rows={4} cols={5} /> : structures.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-secondary-300" />
              <p className="text-secondary-500">No fee structures yet. Create one to define what students should pay each term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50">
                  <th className="p-3 text-left text-xs uppercase">Class</th>
                  <th className="p-3 text-left text-xs uppercase">Term</th>
                  <th className="p-3 text-left text-xs uppercase">Session</th>
                  <th className="p-3 text-left text-xs uppercase">Total</th>
                  <th className="p-3 text-left text-xs uppercase">Due Date</th>
                  <th className="p-3 text-left text-xs uppercase">Breakdown</th>
                  <th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {structures.map(s => (
                    <tr key={s.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3 font-medium">{s.class_name}</td>
                      <td className="p-3 text-sm">{s.term}</td>
                      <td className="p-3 text-sm">{s.session}</td>
                      <td className="p-3 font-bold text-green-700">₦{Number(s.total_amount).toLocaleString()}</td>
                      <td className="p-3 text-sm">{s.due_date || '—'}</td>
                      <td className="p-3 text-xs text-secondary-500">{s.fees?.map(f => `${f.type}: ₦${Number(f.amount).toLocaleString()}`).join(' · ')}</td>
                      <td className="p-3 flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-secondary-400 hover:text-primary-600"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => { if (confirm('Delete?')) del.mutate(s.id) }} className="text-secondary-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      )}

      {tab === 'outstanding' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Term</Label>
                <select value={outFilter.term} onChange={e => setOutFilter({ ...outFilter, term: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm mt-1">
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Session</Label>
                <select value={outFilter.session} onChange={e => setOutFilter({ ...outFilter, session: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm mt-1">
                  {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Class (optional)</Label>
                <Input value={outFilter.class_name} onChange={e => setOutFilter({ ...outFilter, class_name: e.target.value })} placeholder="All classes" className="mt-1" />
              </div>
            </div>
          </CardContent></Card>

          {outData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Students</p><p className="text-2xl font-bold">{outData.total_students}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Fully Paid</p><p className="text-2xl font-bold text-green-600">{outData.fully_paid_count}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Outstanding</p><p className="text-2xl font-bold text-red-600">{outData.outstanding_count}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Outstanding</p><p className="text-xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</p></CardContent></Card>
            </div>
          )}

          {outData && outData.outstanding_count > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleRemindAll} disabled={remindingAll}>
                {remindingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Reminders to All ({outData.outstanding_count})
              </Button>
            </div>
          )}

          <Card><CardContent className="p-0">
            {outLoading ? <div className="p-6"><SkeletonTable rows={5} cols={5} /></div> : outstanding.length === 0 ? (
              <p className="text-center py-12 text-secondary-500">No outstanding fees found for the selected period. Either no fee structures exist for these classes, or all students have paid.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-secondary-50 border-b">
                    <th className="p-3 text-left text-xs uppercase">Student</th>
                    <th className="p-3 text-left text-xs uppercase">Class</th>
                    <th className="p-3 text-right text-xs uppercase">Expected</th>
                    <th className="p-3 text-right text-xs uppercase">Paid</th>
                    <th className="p-3 text-right text-xs uppercase">Outstanding</th>
                    <th className="p-3 text-left text-xs uppercase">Status</th>
                    <th className="p-3"></th>
                  </tr></thead>
                  <tbody>
                    {outstanding.map(r => (
                      <tr key={r.student_id} className="border-b hover:bg-secondary-50">
                        <td className="p-3">
                          <p className="font-medium">{r.student_name}</p>
                          {r.email && <p className="text-xs text-secondary-500">{r.email}</p>}
                        </td>
                        <td className="p-3 text-sm">{r.class_name}</td>
                        <td className="p-3 text-right text-sm">₦{Number(r.expected).toLocaleString()}</td>
                        <td className="p-3 text-right text-sm text-green-600">₦{Number(r.paid).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-red-600">₦{Number(r.outstanding).toLocaleString()}</td>
                        <td className="p-3">
                          {r.fully_paid
                            ? <Badge variant="success">Paid</Badge>
                            : <Badge variant="danger">Owing</Badge>}
                        </td>
                        <td className="p-3">
                          {!r.fully_paid && r.email && (
                            <Button variant="ghost" size="sm" onClick={() => remind.mutate({ id: r.student_id })} disabled={remind.isPending}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {!r.fully_paid && !r.email && (
                            <span title="No email on record"><AlertCircle className="h-4 w-4 text-secondary-300" /></span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent></Card>
        </div>
      )}

      <Modal open={modalOpen} onOpenChange={closeModal} title={editingId ? 'Edit Fee Structure' : 'Create Fee Structure'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class Name</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} placeholder="e.g. JSS 1" required /></div>
            <div><Label>Level</Label>
              <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                <option value="nursery">Nursery</option><option value="primary">Primary</option>
                <option value="junior_secondary">Junior Secondary</option><option value="senior_secondary">Senior Secondary</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Term</Label>
              <select value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Session</Label>
              <select value={form.session} onChange={e => setForm({...form, session: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Fee Breakdown</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addFeeRow}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
            </div>
            <div className="space-y-2">
              {form.fees.map((fee, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={fee.type} onChange={e => updateFeeRow(i, 'type', e.target.value)} className="flex h-9 flex-1 rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm">
                    {FEE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                  <Input type="number" min={0} value={fee.amount} onChange={e => updateFeeRow(i, 'amount', Number(e.target.value))} placeholder="Amount (₦)" className="flex-1 h-9" />
                  {form.fees.length > 1 && <button type="button" onClick={() => removeFeeRow(i)} className="text-red-500 hover:text-red-700 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
            </div>
            <p className="text-sm text-secondary-500 mt-2 font-medium">Total: ₦{form.fees.reduce((s, f) => s + Number(f.amount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{(create.isPending || update.isPending) ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
