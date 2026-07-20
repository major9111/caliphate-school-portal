import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { ArrowUpCircle, Loader2, TrendingUp, History, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotionApi, classesApi, settingsApi, type PromotionStudent } from '@/lib/api'
import { isAxiosError } from 'axios'

type Decision = { action: 'promote' | 'repeat' | 'graduate'; target_class: string }

export default function PromotionPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const qc = useQueryClient()

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: classesApi.list })
  const classes = classesData?.items || []

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['promotion-preview', selectedClass, settings?.current_term, settings?.current_session],
    queryFn: () => promotionApi.preview(selectedClass, settings?.current_term, settings?.current_session),
    enabled: !!selectedClass,
  })

  const { data: history } = useQuery({ queryKey: ['promotion-history'], queryFn: promotionApi.history })

  const execute = useMutation({
    mutationFn: promotionApi.execute,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['promotion-history', 'students'] })
      toast(`Done — ${res.counts.promoted} promoted, ${res.counts.repeated} repeating, ${res.counts.graduated} graduated`, 'success')
      setDecisions({})
      setSelectedClass('')
    },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to execute promotion' : 'Failed to execute promotion', 'error'),
  })

  const students = preview?.students || []

  const decisionFor = (s: PromotionStudent): Decision =>
    decisions[s.id] || { action: s.suggested, target_class: '' }

  const setDecision = (id: string, patch: Partial<Decision>) => {
    setDecisions(d => ({ ...d, [id]: { ...decisionFor(students.find(s => s.id === id)!), ...d[id], ...patch } }))
  }

  const applySuggestedToAll = () => {
    const next: Record<string, Decision> = {}
    students.forEach(s => { next[s.id] = { action: s.suggested, target_class: '' } })
    setDecisions(next)
  }

  const promoteAllTo = (target: string) => {
    const next: Record<string, Decision> = {}
    students.forEach(s => { next[s.id] = { action: 'promote', target_class: target } })
    setDecisions(next)
  }

  const readyToExecute = students.length > 0 && students.every(s => {
    const d = decisionFor(s)
    return d.action !== 'promote' || !!d.target_class
  })

  const handleExecute = () => {
    if (!confirm(`Apply promotion decisions for all ${students.length} students in ${selectedClass}? This cannot be undone automatically.`)) return
    execute.mutate({
      from_class: selectedClass,
      session: settings?.current_session || '',
      promotions: students.map(s => {
        const d = decisionFor(s)
        return { student_id: s.id, action: d.action, target_class: d.action === 'promote' ? d.target_class : undefined }
      }),
    })
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Class Promotion</h1><p className="text-secondary-500 mt-1">Move students to the next class at end of session — {settings?.current_term} · {settings?.current_session}</p></div>

      <Card><CardContent className="p-6">
        <Label>Select a class to review</Label>
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setDecisions({}) }} className="flex h-10 w-full max-w-sm rounded-lg border border-secondary-300 bg-white px-3 py-2 mt-2">
          <option value="">Choose a class…</option>
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </CardContent></Card>

      {selectedClass && (
        <Card><CardContent className="p-6">
          {previewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : students.length === 0 ? (
            <p className="text-center py-8 text-secondary-500">No students found in {selectedClass}.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b">
                <Button variant="outline" size="sm" onClick={applySuggestedToAll}><TrendingUp className="h-4 w-4 mr-2" />Apply Suggested to All</Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary-500">Promote everyone to:</span>
                  <select onChange={e => e.target.value && promoteAllTo(e.target.value)} defaultValue="" className="h-9 rounded-lg border border-secondary-300 bg-white px-2 text-sm">
                    <option value="">Choose class…</option>
                    {classes.filter(c => c.name !== selectedClass).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    <option value="__graduate__">Graduate (final class)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {students.map(s => {
                  const d = decisionFor(s)
                  return (
                    <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border border-secondary-200 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-secondary-500 font-mono">{s.admission_number}</p>
                      </div>
                      <div className="w-24 text-center">
                        {s.has_data ? (
                          <Badge variant={s.suggested === 'promote' ? 'success' : 'warning'}>{s.average}%</Badge>
                        ) : (
                          <Badge variant="secondary">No data</Badge>
                        )}
                      </div>
                      <select
                        value={d.action === 'promote' && d.target_class === '__graduate__' ? '__graduate__' : d.action}
                        onChange={e => {
                          const v = e.target.value
                          if (v === '__graduate__') setDecision(s.id, { action: 'graduate', target_class: '' })
                          else setDecision(s.id, { action: v as Decision['action'], target_class: v === 'promote' ? d.target_class : '' })
                        }}
                        className="h-9 rounded-lg border border-secondary-300 bg-white px-2 text-sm"
                      >
                        <option value="promote">Promote</option>
                        <option value="repeat">Repeat class</option>
                        <option value="__graduate__">Graduate</option>
                      </select>
                      {d.action === 'promote' && (
                        <select
                          value={d.target_class}
                          onChange={e => setDecision(s.id, { target_class: e.target.value })}
                          className={`h-9 rounded-lg border bg-white px-2 text-sm ${!d.target_class ? 'border-red-300' : 'border-secondary-300'}`}
                        >
                          <option value="">Select target class…</option>
                          {classes.filter(c => c.name !== selectedClass).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end pt-6 mt-4 border-t">
                <Button onClick={handleExecute} disabled={!readyToExecute || execute.isPending}>
                  {execute.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying…</> : <><ArrowUpCircle className="h-4 w-4 mr-2" />Execute Promotion for {students.length} Students</>}
                </Button>
              </div>
              {!readyToExecute && <p className="text-xs text-red-600 text-right mt-2">Choose a target class for everyone marked "Promote" before executing.</p>}
            </>
          )}
        </CardContent></Card>
      )}

      {history && history.items.length > 0 && (
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4"><History className="h-5 w-5 text-secondary-400" /><h2 className="font-bold">Promotion History</h2></div>
          <div className="space-y-2">
            {history.items.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-secondary-50">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="font-medium">{h.from_class}</span><span className="text-secondary-400">→ {h.session}</span></div>
                <div className="text-secondary-500">{h.counts.promoted} promoted · {h.counts.repeated} repeated · {h.counts.graduated} graduated</div>
                <div className="text-xs text-secondary-400">{h.executed_by} · {new Date(h.executed_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
