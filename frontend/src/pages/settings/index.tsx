import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { Save, School, Loader2, CalendarClock, ArrowRight, Copy, Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, feeStructuresApi, automationApi } from '@/lib/api'

const TERM_ORDER = ['First Term', 'Second Term', 'Third Term']

export function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [form, setForm] = useState<Record<string, string>>({ name: '', motto: '', email: '', phone: '', address: '', current_session: '', current_term: 'Second Term' })
  const qc = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (data) setForm({ name: data.name || '', motto: data.motto || '', email: data.email || '', phone: data.phone || '', address: data.address || '', current_session: data.current_session || '', current_term: data.current_term || 'Second Term' })
  }, [data])

  const update = useMutation({ mutationFn: settingsApi.update, onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast('Settings saved', 'success') } })

  const advanceTerm = useMutation({
    mutationFn: settingsApi.advanceTerm,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      if (res.is_session_rollover) {
        toast(`New session started: ${res.current_session}. Time to review class promotions.`, 'success')
        navigate('/app/promotion')
      } else {
        toast(`Moved to ${res.current_term}`, 'success')
      }
    },
    onError: () => toast('Failed to advance term', 'error'),
  })

  const copyForward = useMutation({
    mutationFn: feeStructuresApi.copyForward,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['fee-structures'] })
      toast(res.message, 'success')
    },
    onError: () => toast('Failed to copy fee structures forward', 'error'),
  })
  const { data: autoStatus } = useQuery({ queryKey: ['automation-status'], queryFn: automationApi.status })
  const { data: autoLog } = useQuery({ queryKey: ['automation-log'], queryFn: automationApi.log })
  const runAutomation = useMutation({
    mutationFn: automationApi.runNow,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['automation-status', 'automation-log'] })
      if (res.skipped) {
        toast(res.reason || 'Already ran today', 'info')
      } else {
        toast(`Done — ${res.fee_reminders_sent ?? 0} fee reminders, ${res.library_reminders ?? 0} library reminders, ${res.exam_transitions ?? 0} exam updates, ${res.absence_alerts_sent ?? 0} absence alerts, ${res.birthday_shoutouts ?? 0} birthdays`, 'success')
      }
    },
    onError: () => toast('Automation run failed', 'error'),
  })

  const idx = TERM_ORDER.indexOf(form.current_term)
  const isRolloverNext = idx === TERM_ORDER.length - 1
  const nextTerm = TERM_ORDER[(idx + 1) % TERM_ORDER.length]
  const nextSession = isRolloverNext
    ? (() => { const [s, e] = (form.current_session || '2025/2026').split('/').map(Number); return `${s + 1}/${e + 1}` })()
    : form.current_session

  const handleAdvance = () => {
    const message = isRolloverNext
      ? `This ends ${form.current_session} and starts a new session (${nextSession}), moving everyone to ${nextTerm}. You'll be taken to Class Promotion right after. Continue?`
      : `Move from ${form.current_term} to ${nextTerm}? This updates the school-wide current term used across Results, Fees, and Exams.`
    if (confirm(message)) advanceTerm.mutate()
  }

  const handleCopyForward = () => {
    if (confirm(`Copy all fee structures from ${form.current_term} ${form.current_session} forward to ${nextTerm} ${nextSession}? Classes that already have a structure for the new term are skipped.`)) {
      copyForward.mutate({ from_term: form.current_term, from_session: form.current_session, to_term: nextTerm, to_session: nextSession })
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-secondary-500 mt-1">Configure school preferences</p></div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4"><CalendarClock className="h-8 w-8 text-primary-600" /><h2 className="text-xl font-bold">Academic Calendar</h2></div>
          <div className="flex items-center justify-between flex-wrap gap-4 bg-secondary-50 rounded-xl p-4">
            <div>
              <p className="text-sm text-secondary-500">Currently</p>
              <p className="text-lg font-bold">{form.current_term} — {form.current_session}</p>
            </div>
            <div className="flex items-center gap-3 text-secondary-400">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">{isRolloverNext ? 'Next (new session)' : 'Next'}</p>
              <p className="text-lg font-bold text-primary-700">{nextTerm} — {nextSession}</p>
            </div>
            <Button onClick={handleAdvance} disabled={advanceTerm.isPending}>
              {advanceTerm.isPending ? 'Advancing…' : isRolloverNext ? 'Advance & Start New Session' : 'Advance to Next Term'}
            </Button>
          </div>
          {isRolloverNext && <p className="text-xs text-secondary-500 mt-3">This is a session rollover — you'll be taken to Class Promotion afterward to move students up (or graduate final-year students).</p>}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-secondary-500">Don't rebuild every class's fees from scratch — copy them forward instead.</p>
            <Button variant="outline" size="sm" onClick={handleCopyForward} disabled={copyForward.isPending}>
              <Copy className="h-4 w-4 mr-2" />{copyForward.isPending ? 'Copying…' : `Copy Fees to ${nextTerm}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><Zap className="h-8 w-8 text-primary-600" /><h2 className="text-xl font-bold">Daily Automation</h2></div>
            <Button size="sm" onClick={() => runAutomation.mutate()} disabled={runAutomation.isPending}>
              {runAutomation.isPending ? 'Running…' : 'Run Now'}
            </Button>
          </div>
          <p className="text-sm text-secondary-500 mb-4">
            Runs automatically once a day: fee &amp; library reminders, exam status updates, absence alerts, and birthday shout-outs.
          </p>
          <div className="flex items-center gap-2 text-sm bg-secondary-50 rounded-lg p-3 mb-4">
            <Clock className="h-4 w-4 text-secondary-400" />
            <span>Last ran: {autoStatus?.last_run_at ? new Date(autoStatus.last_run_at).toLocaleString() : 'Never yet'}</span>
          </div>
          {autoLog && autoLog.items.length > 0 && (
            <div className="space-y-2">
              {autoLog.items.slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm p-3 rounded-lg border border-secondary-200">
                  <div className="flex items-center gap-2">
                    {entry.errors && Object.keys(entry.errors).length > 0
                      ? <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    <span className="font-medium">{entry.date}</span>
                  </div>
                  <span className="text-secondary-500 text-xs">
                    {entry.fee_reminders_sent ?? 0} fees · {entry.library_reminders ?? 0} library · {entry.exam_transitions ?? 0} exams · {entry.absence_alerts_sent ?? 0} absences · {entry.birthday_shoutouts ?? 0} birthdays
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
