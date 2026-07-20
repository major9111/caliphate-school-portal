import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Bot, Trash2, Loader2, Database, Sparkles } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiKnowledgeApi } from '@/lib/api'

export function AiReceptionistPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ question: '', answer: '', category: 'general' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['ai-knowledge'], queryFn: () => aiKnowledgeApi.list() })
  const create = useMutation({ mutationFn: aiKnowledgeApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-knowledge'] }); setModalOpen(false); setForm({ question: '', answer: '', category: 'general' }); toast('Knowledge added', 'success') }, onError: () => toast('Failed to add knowledge', 'error') })
  const del = useMutation({ mutationFn: aiKnowledgeApi.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-knowledge'] }); toast('Deleted', 'success') } })

  const items = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><Sparkles className="h-8 w-8 text-primary-600" />Iqra AI Knowledge Base</h1><p className="text-secondary-500 mt-1">Train Iqra</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Knowledge</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4"><Database className="h-8 w-8 text-blue-600" /><div><p className="text-sm text-secondary-500">Knowledge Items</p><p className="text-2xl font-bold">{items.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><Bot className="h-8 w-8 text-green-600" /><div><p className="text-sm text-secondary-500">Model</p><p className="text-2xl font-bold text-sm">Llama 3.3 70B</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><Bot className="h-8 w-8 text-purple-600" /><div><p className="text-sm text-secondary-500">Status</p><p className="text-2xl font-bold text-green-600">Active</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">Knowledge Base</h3>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : items.length === 0 ? <p className="text-center py-8 text-secondary-500">No knowledge items</p> : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-primary-700">Q: {item.question}</p>
                      <p className="text-sm text-secondary-600 mt-1">A: {item.answer}</p>
                      <p className="text-xs text-secondary-400 mt-2">Category: {item.category}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Knowledge">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div><Label>Question</Label><Input value={form.question} onChange={e => setForm({...form, question: e.target.value})} required /></div>
          <div><Label>Answer</Label><textarea value={form.answer} onChange={e => setForm({...form, answer: e.target.value})} className="flex min-h-[120px] w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required /></div>
          <div><Label>Category</Label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
              <option value="general">General</option><option value="admissions">Admissions</option><option value="fees">Fees</option><option value="academics">Academics</option><option value="facilities">Facilities</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AiReceptionistPage
