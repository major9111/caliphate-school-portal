/**
 * FUGUSAU Portal — Attendance
 * Student  : view attendance percentage per course
 * Lecturer : select course, then mark present / absent per student
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { coursesAPI } from '@/services/api'
import type { Enrollment } from '@/types'
import toast from 'react-hot-toast'

function IconAttend(p: any) {
  return (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCheck(p: any) {
  return (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconX(p: any) {
  return (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function pct(val: number) {
  const color = val >= 75 ? '#00A85A' : val >= 50 ? '#D4A017' : '#EF4444'
  return { color, label: val >= 75 ? 'Good' : val >= 50 ? 'Low' : 'Critical' }
}

// ── Student view ─────────────────────────────────────────────────────────────
function StudentAttendanceView() {
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null)

  const { data: enrollData, isLoading: enrollLoading } = useQuery<any, any>({
    queryKey: ['enrollments'],
    queryFn:  coursesAPI.getEnrollments,
  })

  const enrollments: Enrollment[] = enrollData?.data?.results ?? enrollData?.data ?? []
  const active = enrollments.filter(e => e.status === 'registered')

  const { data: attData, isLoading: attLoading } = useQuery<any, any>({
    queryKey: ['attendance', selectedEnrollment],
    queryFn:  () => coursesAPI.getAttendance(selectedEnrollment!),
    enabled:  !!selectedEnrollment,
  })

  const record = attData?.data ?? null

  return (
    <div className="space-y-6">
      {/* Course selector */}
      <div className="glass border border-white/[0.07] rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Select Course</p>
        {enrollLoading ? (
          <div className="h-8 bg-white/5 rounded animate-pulse" />
        ) : active.length === 0 ? (
          <p className="text-sm text-white/40">No active enrollments this semester.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {active.map(e => (
              <button key={e.id}
                onClick={() => setSelectedEnrollment(e.id)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  selectedEnrollment === e.id
                    ? 'bg-primary/25 text-primary-light border-primary/40'
                    : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:border-white/20'
                }`}>
                {e.course_code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance detail */}
      {selectedEnrollment && (
        attLoading ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-6 animate-pulse">
            <div className="h-4 w-40 bg-white/10 rounded mb-4" />
            <div className="h-24 bg-white/5 rounded-xl" />
          </div>
        ) : record ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-base font-bold text-white">{record.course_code} — {record.course_title}</p>
                <p className="text-xs text-white/40">{record.total_classes ?? 0} total classes held</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold" style={{ color: pct(record.percentage ?? 0).color }}>
                  {record.percentage ?? 0}%
                </div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: pct(record.percentage ?? 0).color }}>
                  {pct(record.percentage ?? 0).label}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${record.percentage ?? 0}%`, background: pct(record.percentage ?? 0).color }} />
            </div>

            {/* Per-class log */}
            {Array.isArray(record.records) && record.records.length > 0 && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Class Log</p>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {record.records.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-xs text-white/50">{r.date ?? `Class ${i + 1}`}</span>
                      {r.present ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-light">
                          <IconCheck size={12} /> Present
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                          <IconX size={12} /> Absent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(record.percentage ?? 0) < 75 && (
              <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Attendance below 75%. You may be barred from writing examinations.
                Contact your course coordinator if you have extenuating circumstances.
              </div>
            )}
          </div>
        ) : (
          <div className="glass border border-white/[0.07] rounded-2xl p-8 text-center">
            <p className="text-sm text-white/40">No attendance record found for this course.</p>
          </div>
        )
      )}
    </div>
  )
}

// ── Lecturer view ─────────────────────────────────────────────────────────────
function LecturerAttendanceView() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const qc = useQueryClient()

  const { data: coursesData, isLoading } = useQuery<any, any>({
    queryKey: ['lecturer-courses'],
    queryFn:  () => coursesAPI.getAll({ assigned: true }),
  })

  const courses: any[] = coursesData?.data?.results ?? coursesData?.data ?? []
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  const { data: enrollData } = useQuery<any, any>({
    queryKey: ['course-enrollments', selectedCourseId],
    queryFn:  () => coursesAPI.getAll({ enrollments: selectedCourseId }),
    enabled:  !!selectedCourseId,
  })
  const enrolledStudents: any[] = enrollData?.data?.results ?? enrollData?.data ?? []

  const mutation = useMutation({
    mutationFn: (data: object) => coursesAPI.markAttendance(data),
    onSuccess: () => {
      toast.success('Attendance saved')
      setSubmitted(true)
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: () => toast.error('Failed to save attendance'),
  })

  function toggle(studentId: string) {
    setMarks(prev => ({ ...prev, [studentId]: !prev[studentId] }))
  }
  function markAll(present: boolean) {
    const updated: Record<string, boolean> = {}
    enrolledStudents.forEach(s => { updated[s.id] = present })
    setMarks(updated)
  }
  function submit() {
    if (!selectedCourseId) return
    const attendance = enrolledStudents.map(s => ({ student_id: s.id, present: marks[s.id] ?? false }))
    mutation.mutate({ course_id: selectedCourseId, records: attendance })
  }

  return (
    <div className="space-y-6">
      {/* Course selector */}
      <div className="glass border border-white/[0.07] rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Select Course</p>
        {isLoading ? (
          <div className="h-8 bg-white/5 rounded animate-pulse" />
        ) : courses.length === 0 ? (
          <p className="text-sm text-white/40">No courses assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courses.map(c => (
              <button key={c.id}
                onClick={() => { setSelectedCourseId(c.id); setMarks({}); setSubmitted(false) }}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  selectedCourseId === c.id
                    ? 'bg-primary/25 text-primary-light border-primary/40'
                    : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:border-white/20'
                }`}>
                {c.code ?? c.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Marking sheet */}
      {selectedCourseId && (
        <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-bold text-white">
                {selectedCourse?.code} — {selectedCourse?.title}
              </p>
              <p className="text-xs text-white/40">{enrolledStudents.length} enrolled students</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markAll(true)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/15 text-primary-light border border-primary/25 hover:bg-primary/25 transition-colors">
                Mark All Present
              </button>
              <button onClick={() => markAll(false)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                Mark All Absent
              </button>
            </div>
          </div>

          {enrolledStudents.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-6">No enrollment data available for this course.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {enrolledStudents.map((s: any) => {
                  const present = marks[s.id] ?? false
                  return (
                    <div key={s.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                        present
                          ? 'bg-primary/10 border-primary/25'
                          : 'bg-white/[0.03] border-white/[0.07] hover:border-white/15'
                      }`}
                      onClick={() => toggle(s.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                          {(s.full_name ?? s.name ?? 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{s.full_name ?? s.name}</p>
                          <p className="text-[11px] text-white/40">{s.matric_number}</p>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                        present
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/[0.05] text-white/25 border-white/[0.1]'
                      }`}>
                        {present ? <IconCheck size={14} /> : <IconX size={14} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {submitted ? (
                <div className="flex items-center gap-2 justify-center py-3 rounded-xl bg-primary/15 border border-primary/25 text-primary-light text-sm font-semibold">
                  <IconCheck size={16} /> Attendance submitted successfully
                </div>
              ) : (
                <button onClick={submit} disabled={mutation.isPending}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                  {mutation.isPending ? 'Saving...' : 'Submit Attendance'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuthStore()
  const isLecturer = user?.role === 'lecturer'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
          <IconAttend size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Attendance</h1>
          <p className="text-xs text-white/40">
            {isLecturer ? 'Mark class attendance for your courses' : 'Your attendance record per course'}
          </p>
        </div>
      </div>

      {isLecturer ? <LecturerAttendanceView /> : <StudentAttendanceView />}
    </div>
  )
}
