import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { Save, School, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'

export function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [form, setForm] = useState<any>({ name: '', motto: '', email: '', phone: '', address: '', current_session: '', current_term: 'Second Term' })
  const qc = useQueryClient()

  useEffect(() => {
    if (data) setForm({ name: data.name || '', motto: data.motto || '', email: data.email || '', phone: data.phone || '', address: data.address || '', current_session: data.current_session || '', current_term: data.current_term || 'Second Term' })
  }, [data])

  const update = useMutation({ mutationFn: settingsApi.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast('Settings saved', 'success') } })

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-secondary-500 mt-1">Configure school preferences</p></div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); update.mutate(form) }} className="space-y-4">
            <div className="flex items-center gap-3 mb-6"><School className="h-8 w-8 text-primary-600" /><h2 className="text-xl font-bold">School Information</h2></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>School Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Motto</Label><Input value={form.motto} onChange={e => setForm({...form, motto: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Current Session</Label><Input value={form.current_session} onChange={e => setForm({...form, current_session: e.target.value})} /></div>
              <div><Label>Current Term</Label>
                <select value={form.current_term} onChange={e => setForm({...form, current_term: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                  <option>First Term</option><option>Second Term</option><option>Third Term</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={update.isPending}><Save className="h-4 w-4 mr-2" />{update.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage
