/**
 * FUGUSAU Admin — Examinations Management (Fixed)
 *
 * ExamSchedule requires:
 *   course      → UUID (FK to Course)     — NOT course_code string
 *   session     → UUID (FK to AcademicSession)
 *   semester    → 'first' | 'second'
 *   exam_date   → YYYY-MM-DD
 *   start_time  → HH:MM
 *   duration_minutes → integer
 *   venue       → string
 *   instructions → string (optional)
 *
 * POST /api/v1/exams/schedule/  (ListCreateAPIView — admin/lecturer only)
 * GET  /api/v1/courses/         → course list with id + code + title
 * GET  /api/v1/courses/sessions/→ session list with id + name
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examsAPI, coursesAPI } from '@/services/api'
import { formatDate, formatTime } from '@/utils'
import toast from 'react-hot-toast'

// ── Icons ──────────────────────────────────────────────────────
const IconExam    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01"/></svg>
const IconCheck   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconX       = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconPlus    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconClock   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconCalendar= (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconWarning = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconTrash   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>

const EMPTY_FORM = {
  course: '', session: '', semester: 'second',
  exam_date: '', start_time: '', duration_minutes: 120,
  venue: '', instructions: '',
}

export default function AdminExamsPage() {
  const [semesterFilter, setSemesterFilter] = useState('second')
  const [showForm,  setShowForm]  = useState(false)
  const [editId,    setEditId]    = useState<string|null>(null)
  const [form,      setForm]      = useState({...EMPTY_FORM})
  const qc = useQueryClient()

  // ── Data fetching ──────────────────────────────────────────
  const { data: schedData, isLoading: loadSched } = useQuery<any, any>({
    queryKey: ['admin-exam-schedule', semesterFilter],
    queryFn: () => examsAPI.getSchedule({ semester: semesterFilter }),
  })
  const { data: clearData } = useQuery<any, any>({
    queryKey: ['exam-clearances'],
    queryFn: examsAPI.getClearances,
  })
  const { data: coursesData } = useQuery<any, any>({
    queryKey: ['courses-for-exam'],
    queryFn: () => import('@/services/api').then(m => m.coursesAPI.list({ page_size: 500 })),
    enabled: showForm,
  })
  const { data: sessionsData } = useQuery<any, any>({
    queryKey: ['academic-sessions'],
    queryFn: () => import('@/services/api').then(m => m.api.get('/courses/sessions/')),
    enabled: showForm,
  })

  const schedules:   any[] = schedData?.data?.results  || schedData?.data   || []
  const clearances:  any[] = clearData?.data?.results  || clearData?.data   || []
  const courses:     any[] = coursesData?.data?.results || coursesData?.data || []
  const sessions:    any[] = sessionsData?.data?.results || sessionsData?.data || []

  const pendingClearances = clearances.filter((c:any) => !c.is_cleared)
  const grantedClearances = clearances.filter((c:any) =>  c.is_cleared)

  // ── Mutations ──────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.course)    throw new Error('Please select a course.')
      if (!form.session)   throw new Error('Please select an academic session.')
      if (!form.exam_date) throw new Error('Please enter the exam date.')
      if (!form.start_time)throw new Error('Please enter the start time.')
      if (!form.venue)     throw new Error('Please enter the venue.')

      const payload = {
        course:           form.course,
        session:          form.session,
        semester:         form.semester,
        exam_date:        form.exam_date,
        start_time:       form.start_time,
        duration_minutes: Number(form.duration_minutes),
        venue:            form.venue,
        instructions:     form.instructions,
      }

      if (editId) {
        return import('@/services/api').then(m => m.api.patch(`/exams/schedule/${editId}/`, payload))
      }
      return import('@/services/api').then(m => m.examsAPI.createSchedule(payload))
    },
    onSuccess: () => {
      toast.success(editId ? 'Exam updated!' : 'Exam scheduled successfully!')
      setShowForm(false); setEditId(null); setForm({...EMPTY_FORM})
      qc.invalidateQueries({ queryKey:['admin-exam-schedule'] })
    },
    onError: (err:any) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const msgs = Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join(' | ')
        toast.error(msgs)
      } else toast.error(err?.message || 'Failed to schedule exam.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id:string) => import('@/services/api').then(m => m.api.delete(`/exams/schedule/${id}/`)),
    onSuccess:  () => { toast.success('Exam removed.'); qc.invalidateQueries({queryKey:['admin-exam-schedule']}) },
    onError:    () => toast.error('Delete failed.'),
  })

  const grantMutation = useMutation({
    mutationFn: (id:string) => examsAPI.grantClearance(id),
    onSuccess:  () => { toast.success('Clearance granted!'); qc.invalidateQueries({queryKey:['exam-clearances']}) },
    onError:    () => toast.error('Failed to grant clearance.'),
  })

  function openEdit(exam:any) {
    setForm({
      course:           exam.course,
      session:          exam.session,
      semester:         exam.semester,
      exam_date:        exam.exam_date,
      start_time:       exam.start_time?.slice(0,5) || '',
      duration_minutes: exam.duration_minutes,
      venue:            exam.venue,
      instructions:     exam.instructions || '',
    })
    setEditId(exam.id)
    setShowForm(true)
  }

  function cancelForm() { setShowForm(false); setEditId(null); setForm({...EMPTY_FORM}) }

  const f = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(prev => ({...prev, [k]: e.target.value}))

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <IconExam size={20} className="text-blue-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Examinations</h2>
            <p className="text-xs text-white/40">
              {schedules.length} exams · {pendingClearances.length} pending clearances
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={semesterFilter} onChange={e=>setSemesterFilter(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-sm text-white focus:outline-none">
            <option value="first">First Semester</option>
            <option value="second">Second Semester</option>
          </select>
          <button onClick={()=>showForm&&!editId?cancelForm():(cancelForm(),setShowForm(true))}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              showForm&&!editId?'glass border border-white/[0.1] text-white/60':'btn-primary text-white'
            }`}>
            {showForm&&!editId?<><IconX size={13}/>Cancel</>:<><IconPlus size={13}/>Add Exam</>}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {label:'Scheduled',          value:schedules.length,          accent:'#3B82F6'},
          {label:'Clearances Granted', value:grantedClearances.length,  accent:'#00A85A'},
          {label:'Pending Clearances', value:pendingClearances.length,  accent:'#EF4444'},
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Pending clearances alert */}
      {pendingClearances.length > 0 && (
        <div className="glass border border-amber-500/25 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <IconWarning size={15} className="text-amber-400"/>
            <h3 className="font-bold text-sm text-white">
              {pendingClearances.length} Student{pendingClearances.length!==1?'s':''} Awaiting Exam Clearance
            </h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingClearances.map((c:any)=>(
              <div key={c.id}
                className="flex items-center justify-between glass rounded-xl px-4 py-3 border border-white/[0.05]">
                <div>
                  <p className="text-sm font-semibold text-white">{c.student_name}</p>
                  <p className="text-xs text-white/40 font-mono mt-0.5">
                    {c.matric_number} · {c.semester} Semester
                  </p>
                </div>
                <button onClick={()=>grantMutation.mutate(c.id)} disabled={grantMutation.isPending}
                  className="btn-primary rounded-xl px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50">
                  <IconCheck size={12}/> Grant
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Exam Form */}
      {showForm && (
        <div className="glass border border-primary/20 rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-sm text-white">
            {editId ? 'Edit Exam' : 'Schedule Exam'}
          </h3>

          {/* Course select — loads from API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Course *</label>
              <select value={form.course} onChange={f('course')} className={inputCls}>
                <option value="">
                  {courses.length === 0 ? '— Loading courses… —' : '— Select course —'}
                </option>
                {courses.map((c:any)=>(
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title} ({c.semester} sem, {c.level}L)
                  </option>
                ))}
              </select>
              {!showForm || courses.length > 0 ? null : (
                <p className="text-[11px] text-white/40 mt-1">
                  Showing all courses across all semesters and levels.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Academic Session *</label>
              <select value={form.session} onChange={f('session')} className={inputCls}>
                <option value="">
                  {sessions.length === 0 ? 'Loading sessions…' : '— Select session —'}
                </option>
                {sessions.map((s:any)=>(
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_current?' (Current)':''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Semester *</label>
              <select value={form.semester} onChange={f('semester')} className={inputCls}>
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Exam Date *</label>
              <input type="date" value={form.exam_date} onChange={f('exam_date')} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Start Time *</label>
              <input type="time" value={form.start_time} onChange={f('start_time')} className={inputCls}/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Venue *</label>
              <input value={form.venue} onChange={f('venue')} placeholder="e.g. Hall A, LT1, CBT Centre"
                className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" min={30} max={480} value={form.duration_minutes}
                onChange={f('duration_minutes')} className={inputCls}/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Instructions (optional)</label>
            <textarea value={form.instructions} onChange={f('instructions')} rows={2}
              placeholder="No mobile phones. Show your exam card at the door."
              className={`${inputCls} resize-none`}/>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={()=>saveMutation.mutate()}
              disabled={saveMutation.isPending||!form.course||!form.session||!form.exam_date||!form.start_time||!form.venue}
              className="btn-primary rounded-xl px-7 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
              {saveMutation.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>
                : <><IconCheck size={14}/>{editId?'Update Exam':'Schedule Exam'}</>}
            </button>
            <button onClick={cancelForm}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Exam Schedule list */}
      <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="font-bold text-sm text-white">
            Exam Schedule — {semesterFilter.charAt(0).toUpperCase()+semesterFilter.slice(1)} Semester
          </h3>
        </div>

        {loadSched ? (
          <div className="p-8 space-y-3">
            {Array.from({length:4}).map((_,i)=><div key={i} className="h-14 skeleton rounded-xl"/>)}
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-20 text-center">
            <IconExam size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40 text-sm">No exams scheduled for this semester.</p>
            <button onClick={()=>setShowForm(true)}
              className="mt-4 btn-primary rounded-xl px-6 py-2 text-xs font-bold text-white flex items-center gap-2 mx-auto">
              <IconPlus size={13}/> Schedule the first exam
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {schedules.map((exam:any)=>{
              const d    = new Date(exam.exam_date)
              const past = d < new Date()
              const days = Math.ceil((d.getTime()-Date.now())/86400000)
              return (
                <div key={exam.id}
                  className={`flex items-center gap-5 px-5 py-4 hover:bg-white/[0.02] transition-colors ${past?'opacity-55':''}`}>

                  {/* Date block */}
                  <div className="text-center rounded-2xl px-3 py-2.5 flex-shrink-0 min-w-[56px]"
                    style={{background:'rgba(0,107,63,0.12)',border:'1px solid rgba(0,168,90,0.2)'}}>
                    <p className="text-[10px] text-white/40 uppercase font-bold">
                      {d.toLocaleDateString('en-NG',{month:'short'})}
                    </p>
                    <p className="text-2xl font-extrabold text-white leading-tight">{d.getDate()}</p>
                    <p className="text-[10px] text-white/30">{d.getFullYear()}</p>
                  </div>

                  {/* Course info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/15 text-primary-light border border-primary/25">
                        {exam.course_code}
                      </span>
                      <span className="text-[10px] capitalize text-white/40 bg-white/[0.05] px-2 py-0.5 rounded-full">
                        {exam.semester} sem
                      </span>
                      {!past && days >= 0 && days <= 7 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${days===0?'bg-red-500/20 text-red-400':days<=3?'bg-amber-500/20 text-amber-400':'bg-blue-500/20 text-blue-400'}`}>
                          {days===0?'Today!':days===1?'Tomorrow':`${days}d`}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{exam.course_title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <IconClock size={11}/> {formatTime(exam.start_time)} · {exam.duration_minutes}min
                      </span>
                      <span className="flex items-center gap-1">
                        <IconCalendar size={11}/> {exam.venue}
                      </span>
                      {exam.session_name && (
                        <span className="hidden md:inline">{exam.session_name}</span>
                      )}
                    </div>
                    {exam.instructions && (
                      <p className="text-[11px] text-white/25 mt-0.5 italic truncate max-w-md">
                        {exam.instructions}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!past && (
                      <button onClick={()=>openEdit(exam)}
                        className="text-[11px] text-white/40 hover:text-primary-light flex items-center gap-1 transition-colors font-semibold">
                        Edit
                      </button>
                    )}
                    <button
                      onClick={()=>window.confirm(`Remove ${exam.course_code} exam?`)&&deleteMutation.mutate(exam.id)}
                      disabled={deleteMutation.isPending}
                      className="text-[11px] text-white/30 hover:text-red-400 flex items-center gap-1 transition-colors font-semibold disabled:opacity-40">
                      <IconTrash size={12}/> Del
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
