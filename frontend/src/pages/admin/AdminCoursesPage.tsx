/**
 * FUGUSAU Admin — Course Management (fixed)
 *
 * Root cause: backend Course model has `department` as a required FK (UUID).
 * Previous page had a plain text input and sent "" → 400 "This field is required".
 *
 * Fixes:
 *   - Fetches /students/departments/ and shows a dropdown
 *   - Validates that department is selected before submitting
 *   - level sent as integer (backend expects IntegerField)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesAPI, studentsAPI } from '@/services/api'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { IconCourses, IconSearch, IconPlus, IconEdit, IconCheck, IconX } from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

const SEM_COLOR: Record<string, string>   = { first: '#00A85A', second: '#3B82F6', both: '#8B5CF6' }
const LEVEL_COLOR: Record<string, string> = { '100': '#00A85A', '200': '#3B82F6', '300': '#D4A017', '400': '#8B5CF6', '500': '#EC4899' }

const EMPTY_FORM = {
  code: '', title: '', department: '',   // department = UUID string
  credit_units: 3, level: 100,           // level is integer on backend
  semester: 'first', is_elective: false, description: '',
}

export default function AdminCoursesPage() {
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form,     setForm]     = useState({ ...EMPTY_FORM })
  
  // Rollover Session states
  const [showRollover, setShowRollover] = useState(false)
  const [rolloverForm, setRolloverForm] = useState({ next_session_name: '', start_date: '', end_date: '' })
  const [rollingOver, setRollingOver] = useState(false)
  
  const qc = useQueryClient()

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: coursesData, isLoading } = useQuery<any, any>({
    queryKey: ['admin-courses', search],
    queryFn:  () => coursesAPI.getAll({ search: search || undefined }),
  })
  const courses: any[] = coursesData?.data?.results || coursesData?.data || []

  const { data: deptData } = useQuery<any, any>({
    queryKey: ['departments'],
    queryFn: () => studentsAPI.getDepartments(),
    staleTime: Infinity,
  })
  const departments: any[] = deptData?.data?.results || deptData?.data || []

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-courses'] })

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: object) => coursesAPI.create(d),
    onSuccess: () => {
      toast.success('Course created!')
      resetForm()
      invalidate()
    },
    onError: (err: any) => {
      const d = err?.response?.data
      const msg = d?.department?.[0] || d?.code?.[0] || d?.detail || 'Failed to create course.'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => coursesAPI.update(id, data),
    onSuccess: () => {
      toast.success('Course updated!')
      resetForm()
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update course.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesAPI.delete(id),
    onSuccess: () => { toast.success('Course deleted.'); invalidate() },
    onError:   () => toast.error('Failed to delete course.'),
  })

  // ── Helpers ────────────────────────────────────────────────────────────
  function resetForm() {
    setShowForm(false)
    setEditId(null)
    setForm({ ...EMPTY_FORM })
  }

  function openEdit(course: any) {
    setForm({
      code:         course.code,
      title:        course.title,
      department:   course.department || '',   // UUID from API
      credit_units: course.credit_units,
      level:        Number(course.level),
      semester:     course.semester,
      is_elective:  course.is_elective,
      description:  course.description || '',
    })
    setEditId(course.id)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error('Course code and title are required.')
      return
    }
    if (!form.department) {
      toast.error('Please select a department.')
      return
    }
    const payload = {
      ...form,
      level: Number(form.level),   // backend expects integer
    }
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleRollover = async () => {
    if (!rolloverForm.next_session_name || !rolloverForm.start_date || !rolloverForm.end_date) {
      toast.error('All rollover fields are required.')
      return
    }
    if (!window.confirm(`CRITICAL ACTION!\n\nThis will roll over the academic session to ${rolloverForm.next_session_name}.\n- All active students with passing CGPA will be promoted.\n- Final year students will be graduated.\n- Fee invoices for the new session will be auto-generated.\n\nAre you sure you want to proceed?`)) {
      return
    }
    setRollingOver(true)
    try {
      await api.post('/courses/sessions/rollover/', rolloverForm)
      toast.success('Session rollover completed successfully!')
      setShowRollover(false)
      setRolloverForm({ next_session_name: '', start_date: '', end_date: '' })
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['student-profile'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Rollover failed.')
    } finally {
      setRollingOver(false)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconCourses size={20} className="text-primary-light" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Course Management</h2>
            <p className="text-xs text-white/40">{courses.length} courses in catalogue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetForm(); setShowRollover(r => !r) }}
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2 transition-colors ${
              showRollover ? 'bg-amber-500/25 border border-amber-500/50 hover:bg-amber-500/35' : 'glass border border-white/[0.1] hover:bg-white/5'
            }`}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            {showRollover ? 'Cancel Rollover' : 'Rollover Session'}
          </button>
          <button
            onClick={() => { setShowRollover(false); (showForm && !editId ? resetForm() : (resetForm(), setShowForm(true))) }}
            className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2"
          >
            {showForm && !editId ? <><IconX size={14} /> Cancel</> : <><IconPlus size={14} /> Add Course</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Courses', value: courses.length,                          accent: '#3B82F6' },
          { label: 'Compulsory',    value: courses.filter((c: any) => !c.is_elective).length, accent: '#00A85A' },
          { label: 'Electives',     value: courses.filter((c: any) => c.is_elective).length,  accent: '#D4A017' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,${accent},transparent)` }} />
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{ color: accent }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Rollover session form */}
      {showRollover && (
        <div className="glass border border-amber-500/25 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Academic Session Rollover & Automatic Student Progression
          </h3>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p className="text-xs text-white/55">
              Warning: This will close the current academic session. All active students with a passing CGPA (&gt;= 1.0) will be promoted to their next level (e.g. 100L -&gt; 200L). Final year students will graduate. New fee invoices will be auto-generated for the new level.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Next Session Name *</label>
              <input
                value={rolloverForm.next_session_name}
                onChange={e => setRolloverForm(f => ({ ...f, next_session_name: e.target.value }))}
                placeholder="2025/2026"
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Start Date *</label>
              <input
                type="date"
                value={rolloverForm.start_date}
                onChange={e => setRolloverForm(f => ({ ...f, start_date: e.target.value }))}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">End Date *</label>
              <input
                type="date"
                value={rolloverForm.end_date}
                onChange={e => setRolloverForm(f => ({ ...f, end_date: e.target.value }))}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRollover}
              disabled={rollingOver}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
            >
              <IconCheck size={14} />
              {rollingOver ? 'Rolling Over...' : 'Initiate Rollover'}
            </button>
            <button
              onClick={() => setShowRollover(false)}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="glass border border-primary/20 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white">{editId ? 'Edit Course' : 'New Course'}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Course Code *</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CSC401"
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Credit Units</label>
              <input
                type="number" min={1} max={6} value={form.credit_units}
                onChange={e => setForm(f => ({ ...f, credit_units: +e.target.value }))}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Course Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Introduction to Algorithms"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20"
            />
          </div>

          {/* Department dropdown — sends UUID to backend */}
          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">
              Department * <span className="text-white/20 normal-case">(required by backend)</span>
            </label>
            <select
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="">Select department…</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.faculty_name ? `(${d.faculty_name})` : ''}
                </option>
              ))}
            </select>
            {departments.length === 0 && (
              <p className="text-[11px] text-amber-400/70 mt-1">
                No departments loaded — create departments first at Admin → Departments.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Level</label>
              <select
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {[100, 200, 300, 400, 500].map(l => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Semester</label>
              <select
                value={form.semester}
                onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
                <option value="both">Both Semesters</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Brief course description…"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, is_elective: !f.is_elective }))}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.is_elective ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_elective ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white/60">Elective course</span>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
            >
              <IconCheck size={14} />
              {isSaving ? 'Saving…' : editId ? 'Update Course' : 'Create Course'}
            </button>
            <button
              onClick={resetForm}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mobile search */}
      <div className="md:hidden">
        <MobileToolbar search={search} onSearchChange={setSearch} placeholder="Search by code or title…" />
      </div>

      {/* Desktop search */}
      <div className="hidden md:block relative max-w-sm">
        <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by code or title…"
          className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
        ) : courses.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <IconCourses size={40} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/40 text-sm">{search ? `No courses match "${search}"` : 'No courses yet. Add your first course above.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{courses.length} courses</MobileListMeta>
            {courses.map((c: any) => {
              const lc = LEVEL_COLOR[String(c.level)] || '#888'
              return (
                <MobileRow
                  key={c.id}
                  chevron={false}
                  leading={c.code?.slice(0, 3)}
                  leadingClassName="bg-primary/15 text-primary-light font-mono text-[11px]"
                  title={c.title}
                  subtitle={`${c.department_name || 'No dept'} · ${c.credit_units} units · ${c.enrolled_count || 0} enrolled`}
                  caption={`${c.code} · ${c.semester} semester${c.is_elective ? ' · Elective' : ''}`}
                  badge={{ label: `${c.level}L`, className: 'border', style: { background: `${lc}18`, color: lc, borderColor: `${lc}35` } }}
                  footer={
                    <>
                      <MobileMiniAction label="Edit" icon={<IconEdit size={11} />} onClick={() => openEdit(c)} />
                      <MobileMiniAction
                        label="Delete"
                        icon={<IconX size={11} />}
                        className="bg-red-500/15 text-red-400"
                        onClick={() => { if (window.confirm(`Delete ${c.code}?`)) deleteMutation.mutate(c.id) }}
                      />
                    </>
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 skeleton rounded-xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-20 text-center">
            <IconCourses size={48} className="text-white/15 mx-auto mb-4" />
            <p className="text-white/40">
              {search ? `No courses match "${search}"` : 'No courses yet. Add your first course above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['Code', 'Title', 'Dept', 'Level', 'Semester', 'Units', 'Type', 'Enrolled', 'Actions'].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 font-semibold text-left
                        ${['Units', 'Enrolled'].includes(h) ? 'text-center' : ''}
                        ${['Dept', 'Level', 'Type', 'Enrolled'].includes(h) ? 'hidden sm:table-cell' : ''}
                        ${h === 'Actions' ? 'text-right' : ''}`}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {courses.map((c: any) => {
                  const sc = SEM_COLOR[c.semester] || '#888'
                  const lc = LEVEL_COLOR[String(c.level)] || '#888'
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-primary-light">{c.code}</td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-white font-medium">{c.title}</div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-white/50">{c.department_name}</td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${lc}18`, color: lc, border: `1px solid ${lc}35` }}>
                          {c.level}L
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35` }}>
                          {c.semester}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-white/60 hidden sm:table-cell">{c.credit_units}</td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          c.is_elective
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                            : 'bg-primary/15 text-primary-light border-primary/25'
                        }`}>
                          {c.is_elective ? 'Elective' : 'Core'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-white/60">{c.enrolled_count || 0}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-[11px] text-white/40 hover:text-primary-light font-semibold flex items-center gap-1 transition-colors"
                          >
                            <IconEdit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => { if (window.confirm(`Delete ${c.code}?`)) deleteMutation.mutate(c.id) }}
                            disabled={deleteMutation.isPending}
                            className="text-[11px] text-white/30 hover:text-red-400 font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                          >
                            <IconX size={12} /> Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
