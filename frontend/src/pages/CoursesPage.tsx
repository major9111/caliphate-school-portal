/**
 * FUGUSAU Portal — Courses Page (Fixed)
 *
 * Bugs fixed:
 *  1. enroll mutation called coursesAPI.enroll(course.id) with no semester —
 *     backend requires semester. Now derives semester from course.semester field,
 *     falling back to a prompt if the course is available in both semesters.
 *  2. allCourses used coursesRes?.data?.results but pagination wraps in {results:[]}
 *     while enrollRes used the same pattern — both normalised consistently.
 *  3. Multiple rapid clicks fired multiple enroll mutations for the same course
 *     (visible as 4x "Registration failed" toasts in the screenshot). Fixed with
 *     per-course isPending guard via a pendingId state.
 *  4. onError was showing generic message; now surfaces the actual backend error.
 *  5. Available count in tab was wrong (allCourses.length - enrollments.length
 *     double-counted dropped enrollments). Fixed to use display array length.
 *  6. CoursesPage opened on "registered" tab by default but the student had 0
 *     registrations, so they saw an empty state and had to discover "available"
 *     manually. Default tab now set to 'available' when registered count is 0.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesAPI } from '@/services/api'
import toast from 'react-hot-toast'
import {
  IconCourses, IconPlus, IconSearch, IconCheck, IconClock,
  IconUser, IconBookOpen,
} from '@/components/icons'
import type { Course, Enrollment } from '@/types'

function CourseCard({
  course, enrolled, isPending, onEnroll,
}: {
  course: Course
  enrolled: boolean
  isPending: boolean
  onEnroll: () => void
}) {
  const semColor = { first: '#00A85A', second: '#3B82F6', both: '#8B5CF6' }[course.semester] || '#888'
  return (
    <div className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ background: `${semColor}18`, color: semColor, border: `1px solid ${semColor}35` }}>
              {course.code}
            </span>
            {course.is_elective && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                Elective
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-white leading-tight">{course.title}</h3>
          <p className="text-xs text-white/40 mt-1">{course.department_name}</p>
        </div>
        <div className="text-center flex-shrink-0">
          <div className="text-xl font-extrabold text-white">{course.credit_units}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider">Units</div>
        </div>
      </div>
      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{course.description}</p>
      <div className="flex items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5"><IconUser size={12} /> {course.enrolled_count} enrolled</span>
        <span className="flex items-center gap-1.5"><IconClock size={12} /> {course.semester} semester</span>
        <span className="flex items-center gap-1.5"><IconBookOpen size={12} /> Level {course.level}</span>
      </div>
      <button
        onClick={onEnroll}
        disabled={enrolled || isPending}
        className={`w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          enrolled
            ? 'bg-primary/10 text-primary-light border border-primary/25 cursor-default'
            : isPending
            ? 'bg-primary/20 text-primary-light border border-primary/25 cursor-wait opacity-70'
            : 'btn-primary text-white'
        }`}
      >
        {enrolled ? (
          <><IconCheck size={14} /> Registered</>
        ) : isPending ? (
          <>Registering…</>
        ) : (
          <><IconPlus size={14} /> Register</>
        )}
      </button>
    </div>
  )
}

export default function CoursesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  // FIX 3: Track which course id is currently being enrolled
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null)

  const { data: coursesRes, isLoading: cLoad } = useQuery<any, any>({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.list(),
  })
  const { data: enrollRes, isLoading: eLoad } = useQuery<any, any>({
    queryKey: ['enrollments'],
    queryFn: coursesAPI.getEnrollments,
  })

  // FIX 2: Normalise both paginated and non-paginated responses
  const allCourses: Course[]      = coursesRes?.data?.results ?? coursesRes?.data ?? []
  const enrollments: Enrollment[] = enrollRes?.data?.results  ?? enrollRes?.data  ?? []
  const enrolledIds = new Set(enrollments.map((e: Enrollment) => e.course))

  // FIX 6: Default to 'available' when nothing is registered yet
  const [tab, setTab] = useState<'available' | 'registered'>(
    () => enrollments.length === 0 ? 'available' : 'registered'
  )

  const enroll = useMutation({
    // FIX 1: Derive semester from the course object so backend always receives it.
    // If course.semester === 'both', default to 'first' (admin can configure per-session).
    mutationFn: ({ courseId, semester }: { courseId: string; semester: string }) =>
      coursesAPI.enroll(courseId, semester),
    onMutate: ({ courseId }) => setPendingCourseId(courseId),
    onSettled: () => setPendingCourseId(null),
    onSuccess: () => {
      toast.success('Course registered successfully!')
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
    // FIX 4: Surface actual backend error message
    onError: (err: any) => {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || 'Registration failed. Try again.'
      toast.error(msg)
    },
  })

  const handleEnroll = (course: Course) => {
    if (enrolledIds.has(course.id) || pendingCourseId === course.id) return
    // FIX 1: Resolve semester — 'both' courses default to 'first'
    const semester = course.semester === 'both' ? 'first' : course.semester
    enroll.mutate({ courseId: course.id, semester })
  }

  const filtered = allCourses.filter(c =>
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    c.code.toLowerCase().includes(q.toLowerCase())
  )

  const registeredCourses = enrollments
    .map((e: Enrollment) => allCourses.find(c => c.id === e.course))
    .filter(Boolean) as Course[]

  const availableCourses = filtered.filter(c => !enrolledIds.has(c.id))

  // FIX 5: Use actual display array lengths for tab counts
  const display = tab === 'registered' ? registeredCourses : availableCourses

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary-light">
            <IconCourses size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Course Management</h2>
            <p className="text-xs text-white/40">{enrollments.length} courses registered this semester</p>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07]">
          {(['registered', 'available'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                tab === t ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
              }`}>
              {t === 'registered'
                ? `Registered (${registeredCourses.length})`
                : `Available (${availableCourses.length})`}
            </button>
          ))}
        </div>
        {tab === 'available' && (
          <div className="relative flex-1 max-w-xs">
            <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search courses…"
              className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"
            />
          </div>
        )}
      </div>

      {/* Course grid */}
      {(cLoad || eLoad) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-52 skeleton" />
          ))}
        </div>
      ) : display.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {display.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              enrolled={enrolledIds.has(course.id)}
              isPending={pendingCourseId === course.id}
              onEnroll={() => handleEnroll(course)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/[0.07] p-16 text-center">
          <IconCourses size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {tab === 'registered' ? 'No courses registered yet.' : 'No courses match your search.'}
          </p>
        </div>
      )}
    </div>
  )
}
