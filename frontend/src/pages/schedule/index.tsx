import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Clock, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi, teachersApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { isAxiosError } from 'axios'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00']
const COLORS = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800', 'bg-teal-100 text-teal-800', 'bg-red-100 text-red-800', 'bg-yellow-100 text-yellow-800']

function subjectColor(subject: string) {
  const index = subject.charCodeAt(0) % COLORS.length
  return COLORS[index]
}

const emptyForm = { day: 'Monday', time: '08:00-09:00', subject: '', teacher_id: '', class_name: '', room: '' }

export function SchedulePage() {
  const [classFilter, setClassFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['schedule', classFilter], queryFn: () => scheduleApi.list(classFilter || undefined) })
  const { data: teachersData } = useQuery({ queryKey: ['teachers-for-schedule'], queryFn: () => teachersApi.list({ limit: 100 }) })
  const teachers = teachersData?.items || []
  const selectedTeacher = teachers.find(t => t.id === form.teacher_id)

  const create = useMutation({
    mutationFn: scheduleApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setModalOpen(false); setForm(emptyForm); toast('Period added', 'success') },
    onError: (e) => {
      if (isAxiosError(e) && e.response?.status === 409) {
        const conflicts = e.response.data?.detail?.conflicts as string[] | undefined
        toast(conflicts?.[0] || 'Schedule conflict detected', 'error')
      } else if (isAxiosError(e) && e.response?.data?.detail) {
        toast(String(e.response.data.detail), 'error')
      } else {
        toast('Failed to add period', 'error')
      }
    },
  })
  const del = useMutation({
    mutationFn: scheduleApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); toast('Period removed', 'success') },
  })

  const items = data?.items || []
  const classes = [...new Set(items.map(s => s.class_name))].filter(Boolean).sort()
  const filtered = classFilter ? items.filter(s => s.class_name === classFilter) : items

  const getCell = (day: string, time: string) => filtered.filter(s => s.day === day && s.time === time)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Timetable</h1><p className="text-secondary-500 mt-1">Visual schedule grid</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Period</Button>
        </div>
      </div>

      {/* Filter */}
      <Card><CardContent className="p-4 flex items-center gap-4">
        <Label className="flex-shrink-0">Filter by class:</Label>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="flex h-9 rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {classFilter && <Button variant="ghost" size="sm" onClick={() => setClassFilter('')}>Clear</Button>}
      </CardContent></Card>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : viewMode === 'grid' ? (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-primary-600 text-white">
                <th className="p-3 text-left text-sm font-medium w-28">
                  <div className="flex items-center gap-1"><Clock className="h-4 w-4" />Time</div>
                </th>
                {DAYS.map(day => <th key={day} className="p-3 text-center text-sm font-medium">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period, pi) => (
                <tr key={period} className={cn('border-b', pi % 2 === 0 ? 'bg-white' : 'bg-secondary-50')}>
                  <td className="p-3 text-xs font-mono text-secondary-600 whitespace-nowrap">{period}</td>
                  {DAYS.map(day => {
                    const cells = getCell(day, period)
                    return (
                      <td key={day} className="p-2 border-l align-top min-h-[60px]">
                        {cells.length === 0 ? (
                          <div className="min-h-[48px]" />
                        ) : cells.map(slot => (
                          <div key={slot.id} className={cn('rounded-lg p-2 mb-1 text-xs group relative', subjectColor(slot.subject))}>
                            <div className="font-semibold">{slot.subject}</div>
                            <div className="opacity-75">{slot.teacher_name}</div>
                            {slot.class_name && !classFilter && <div className="opacity-60">{slot.class_name}</div>}
                            {slot.room && <div className="opacity-60">Rm: {slot.room}</div>}
                            <button
                              onClick={() => { if (confirm('Remove this period?')) del.mutate(slot.id) }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-current hover:text-red-700"
                            ><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          {filtered.length === 0 ? <p className="text-center py-12 text-secondary-500">No schedule entries yet</p> : (
            <table className="w-full">
              <thead><tr className="bg-secondary-50 border-b">
                <th className="p-3 text-left text-xs uppercase">Day</th>
                <th className="p-3 text-left text-xs uppercase">Time</th>
                <th className="p-3 text-left text-xs uppercase">Subject</th>
                <th className="p-3 text-left text-xs uppercase">Teacher</th>
                <th className="p-3 text-left text-xs uppercase">Class</th>
                <th className="p-3 text-left text-xs uppercase">Room</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b hover:bg-secondary-50">
                    <td className="p-3 font-medium">{s.day}</td>
                    <td className="p-3 text-sm font-mono">{s.time}</td>
                    <td className="p-3"><span className={cn('px-2 py-1 rounded-md text-xs font-medium', subjectColor(s.subject))}>{s.subject}</span></td>
                    <td className="p-3 text-sm">{s.teacher_name}</td>
                    <td className="p-3 text-sm">{s.class_name}</td>
                    <td className="p-3 text-sm">{s.room}</td>
                    <td className="p-3"><button onClick={() => { if (confirm('Remove this period?')) del.mutate(s.id) }} className="text-secondary-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Period to Timetable">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Day</Label>
              <select value={form.day} onChange={e => setForm({...form, day: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><Label>Time Period</Label>
              <select value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2">
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Teacher</Label>
            <select
              value={form.teacher_id}
              onChange={e => setForm({ ...form, teacher_id: e.target.value, subject: '' })}
              className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2"
              required
            >
              <option value="">Select a teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div><Label>Subject</Label>
            {selectedTeacher && selectedTeacher.subjects.length > 0 ? (
              <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2" required>
                <option value="">Select a subject…</option>
                {selectedTeacher.subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <>
                <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder={form.teacher_id ? "This teacher has no subjects assigned yet — type one" : "Select a teacher first"} required />
                {form.teacher_id && <p className="text-xs text-secondary-500 mt-1">Tip: assign subjects to this teacher on the Teachers page for a dropdown here next time.</p>}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Class</Label><Input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} placeholder="e.g. JSS 1A" required /></div>
            <div><Label>Room (optional)</Label><Input value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. Room 12" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add Period'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SchedulePage
