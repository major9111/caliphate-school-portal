/**
 * FUGUSAU Portal — Timetable
 * Students  : weekly schedule of enrolled courses
 * Lecturers : weekly schedule of assigned courses
 */
import { useQuery } from '@tanstack/react-query'
import { coursesAPI } from '@/services/api'
import type { TimetableEntry } from '@/types'

const DAYS: { key: TimetableEntry['day']; label: string }[] = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
]

const COURSE_COLORS = [
  '#00A85A', '#3B82F6', '#D4A017', '#8B5CF6',
  '#EC4899', '#F97316', '#06B6D4', '#EF4444',
]

function IconCalendar(p: any) {
  return (
    <svg width={p.size || 20} height={p.size || 20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
function IconClock(p: any) {
  return (
    <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  )
}
function IconMap(p: any) {
  return (
    <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={p.className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function fmt12(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

function EmptyDay() {
  return (
    <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-white/[0.08]">
      <span className="text-[11px] text-white/20">No classes</span>
    </div>
  )
}

export default function TimetablePage() {
  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['timetable'],
    queryFn:  coursesAPI.getTimetable,
  })

  const entries: TimetableEntry[] = data?.data?.results ?? data?.data ?? []

  // Assign a stable color to each unique course code
  const courseCodes = [...new Set(entries.map(e => e.course_code))]
  const colorMap: Record<string, string> = {}
  courseCodes.forEach((code, i) => { colorMap[code] = COURSE_COLORS[i % COURSE_COLORS.length] })

  const byDay: Record<string, TimetableEntry[]> = {}
  DAYS.forEach(d => { byDay[d.key] = [] })
  entries.forEach(e => {
    if (byDay[e.day]) byDay[e.day].push(e)
  })
  Object.values(byDay).forEach(arr => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)))

  const totalClasses = entries.length
  const uniqueCourses = courseCodes.length
  const activeDays = DAYS.filter(d => byDay[d.key].length > 0).length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
          <IconCalendar size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Timetable</h1>
          <p className="text-xs text-white/40">Your weekly class schedule</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Classes', value: totalClasses },
          { label: 'Courses',       value: uniqueCourses },
          { label: 'Active Days',   value: activeDays },
        ].map(s => (
          <div key={s.label} className="glass border border-white/[0.07] rounded-2xl p-4">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-extrabold text-primary-light">
              {isLoading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {!isLoading && courseCodes.length > 0 && (
        <div className="glass border border-white/[0.07] rounded-2xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Course Legend</p>
          <div className="flex flex-wrap gap-2">
            {courseCodes.map(code => (
              <span key={code} className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                style={{
                  background: `${colorMap[code]}18`,
                  color: colorMap[code],
                  borderColor: `${colorMap[code]}35`,
                }}>
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {DAYS.slice(0, 5).map(d => (
            <div key={d.key} className="glass border border-white/[0.07] rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mb-3" />
              <div className="h-16 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map(({ key, label }) => {
            const dayEntries = byDay[key]
            const hasClasses = dayEntries.length > 0
            return (
              <div key={key}
                className={`glass border rounded-2xl p-5 ${hasClasses ? 'border-white/[0.07]' : 'border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-white">{label}</span>
                  {hasClasses && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/25">
                      {dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}
                    </span>
                  )}
                </div>
                {hasClasses ? (
                  <div className="space-y-2">
                    {dayEntries.map(entry => {
                      const accent = colorMap[entry.course_code]
                      return (
                        <div key={entry.id} className="rounded-xl p-4 relative overflow-hidden"
                          style={{
                            background: `${accent}10`,
                            border: `1px solid ${accent}30`,
                          }}>
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full"
                            style={{ background: accent }} />
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pl-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                                  style={{ background: `${accent}20`, color: accent }}>
                                  {entry.course_code}
                                </span>
                                <span className="text-sm font-medium text-white truncate">
                                  {entry.course_title}
                                </span>
                              </div>
                              {entry.lecturer_name && (
                                <p className="text-[11px] text-white/40 mt-0.5">{entry.lecturer_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="flex items-center gap-1 text-[11px] text-white/50">
                                <IconClock />
                                {fmt12(entry.start_time)} — {fmt12(entry.end_time)}
                              </span>
                              {entry.venue && (
                                <span className="flex items-center gap-1 text-[11px] text-white/50">
                                  <IconMap />
                                  {entry.venue}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyDay />
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="glass border border-white/[0.07] rounded-2xl p-12 text-center">
          <IconCalendar size={36} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">No timetable entries found for this semester.</p>
          <p className="text-white/25 text-xs mt-1">Timetable is published by the academic office each semester.</p>
        </div>
      )}
    </div>
  )
}
