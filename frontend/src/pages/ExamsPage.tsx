/**
 * FUGUSAU Portal — Exams Page (Redesigned)
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { examsAPI } from '@/services/api'
import { useRole } from '@/hooks/useRole'
import { formatDate, formatTime, daysUntil } from '@/utils'
import type { ExamSchedule } from '@/types'
import {
  IconExam, IconCalendar, IconClock, IconCheck, IconWarning,
  IconDownload, IconChevronRight,
} from '@/components/icons'

type Tab = 'schedule' | 'card'

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return <span className="text-[10px] font-semibold text-white/25 bg-white/5 px-2 py-0.5 rounded-full">Done</span>
  if (days === 0) return <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-full">Today!</span>
  if (days <= 3)  return <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">{days}d left</span>
  return null
}

export default function ExamsPage() {
  const [tab, setTab]         = useState<Tab>('schedule')
  const [semester, setSemester] = useState('second')
  const { isStudent } = useRole()

  const { data: scheduleData, isLoading } = useQuery<any, any>({
    queryKey: ['exam-schedule', semester],
    queryFn: () => examsAPI.getSchedule({ semester }),
  })

  const { data: cardData, isLoading: loadingCard } = useQuery<any, any>({
    queryKey: ['exam-card'],
    queryFn: examsAPI.getExamCard,
    enabled: isStudent && tab === 'card',
  })

  const schedules: ExamSchedule[] = scheduleData?.data?.results || scheduleData?.data || []
  const card = cardData?.data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <IconExam size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Examinations</h2>
            <p className="text-xs text-white/40">{schedules.length} exams scheduled</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Semester select */}
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-sm text-white focus:outline-none">
            <option value="first">First Semester</option>
            <option value="second">Second Semester</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      {isStudent && (
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
          {(['schedule', 'card'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
              }`}>
              {t === 'card' ? 'Exam Card' : 'Schedule'}
            </button>
          ))}
        </div>
      )}

      {/* ── Schedule tab ── */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl h-24 skeleton" />
              ))
            : schedules.length === 0
            ? (
              <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
                <IconExam size={48} className="text-white/15 mx-auto mb-4" />
                <p className="text-white/40">No exams scheduled for this semester yet.</p>
              </div>
            ) : schedules.map(exam => {
              const days = daysUntil(exam.exam_date)
              const d = new Date(exam.exam_date)
              return (
                <div key={exam.id}
                  className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 flex items-center gap-5">
                  {/* Date block */}
                  <div className="text-center rounded-2xl px-4 py-3 flex-shrink-0 min-w-[60px]"
                    style={{ background: 'rgba(0,107,63,0.12)', border: '1px solid rgba(0,168,90,0.2)' }}>
                    <p className="text-[10px] text-white/40 uppercase font-bold">
                      {d.toLocaleDateString('en-NG', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-extrabold text-white leading-tight">{d.getDate()}</p>
                    <p className="text-[10px] text-white/30">{d.getFullYear()}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/15 text-primary-light border border-primary/25">
                        {exam.course_code}
                      </span>
                      <DaysBadge days={days} />
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{exam.course_title}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40">
                      <span className="flex items-center gap-1.5"><IconClock size={12} /> {formatTime(exam.start_time)}</span>
                      <span>{exam.duration_minutes} mins</span>
                      <span className="flex items-center gap-1.5"><IconCalendar size={12} /> {exam.venue}</span>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className={`text-base font-extrabold ${
                      days < 0 ? 'text-white/20' : days <= 3 ? 'text-amber-400' : 'text-white/60'
                    }`}>
                      {days < 0 ? 'Done' : days === 0 ? 'Today' : `${days}d`}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{formatDate(exam.exam_date, true)}</p>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* ── Exam card tab ── */}
      {tab === 'card' && isStudent && (
        <div>
          {loadingCard
            ? <div className="glass rounded-2xl h-80 skeleton" />
            : !card
            ? (
              <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
                <IconExam size={48} className="text-white/15 mx-auto mb-4" />
                <p className="text-white/40">Exam card not available. Contact the registry.</p>
              </div>
            ) : (
              <div>
                {/* Print styles injected inline */}
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #exam-card-print, #exam-card-print * { visibility: visible !important; }
                    #exam-card-print { position: fixed; top: 0; left: 0; width: 100%; }
                    .no-print { display: none !important; }
                  }
                `}</style>

                {/* Screen card */}
                <div id="exam-card-print"
                  className="max-w-2xl rounded-3xl overflow-hidden border border-white/[0.1]"
                  style={{ background: 'linear-gradient(160deg,#0a1f15 0%,#061410 100%)', boxShadow:'0 0 60px rgba(0,107,63,0.2)' }}>

                  {/* Header with real logo */}
                  <div className="px-8 pt-7 pb-5 border-b border-white/[0.07]"
                    style={{ background:'linear-gradient(135deg,rgba(0,107,63,0.25) 0%,rgba(0,40,25,0.35) 100%)' }}>
                    <div className="flex items-center gap-4 mb-5">
                      <img src={`${import.meta.env.BASE_URL}fugusau-logo.png`}
                        alt="FUGUSAU Logo"
                        style={{ width:72,height:72,objectFit:'contain',filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}/>
                      <div>
                        <div className="text-[10px] font-bold tracking-[0.25em] text-primary-light uppercase">Federal University Gusau</div>
                        <div className="text-white font-extrabold text-lg leading-tight">Student Examination Card</div>
                        <div className="text-[11px] text-white/40 mt-0.5 italic">Knowledge, Innovation &amp; Service</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-[10px] text-white/35 uppercase tracking-wider">Session</div>
                        <div className="font-extrabold text-white text-base">{card.session}</div>
                      </div>
                    </div>

                    {/* Student info grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-2">
                      {[
                        { label:'Full Name',     value: card.student?.name },
                        { label:'Matric Number', value: card.student?.matric_number },
                        { label:'Department',    value: card.student?.department },
                        { label:'Level',         value: card.student?.level ? card.student.level + 'L' : '—' },
                      ].map(({label,value})=>(
                        <div key={label}>
                          <div className="text-[10px] text-white/35 uppercase tracking-wider">{label}</div>
                          <div className="font-bold text-sm text-white mt-0.5">{value || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clearance status */}
                  <div className="px-8 py-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">Clearance Status</div>
                    {(card.clearances || []).length === 0 ? (
                      <div className="flex items-center gap-2 py-3">
                        <IconWarning size={14} className="text-amber-400"/>
                        <p className="text-sm text-amber-400">No clearance records found. Contact the Examinations Office.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(card.clearances || []).map((cl: any) => (
                          <div key={cl.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                            cl.is_cleared ? 'bg-primary/10 border border-primary/20' : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <div>
                              <p className="text-sm font-semibold text-white capitalize">{cl.semester} Semester</p>
                              {cl.remarks && <p className="text-xs text-white/40 mt-0.5">{cl.remarks}</p>}
                            </div>
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                              cl.is_cleared
                                ? 'bg-primary/15 text-primary-light border-primary/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              {cl.is_cleared
                                ? <><IconCheck size={11}/> Cleared</>
                                : <><IconWarning size={11}/> Not Cleared</>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-8 py-4 border-t border-white/[0.06] flex items-center justify-between"
                    style={{ background:'rgba(0,0,0,0.2)' }}>
                    <p className="text-[10px] text-white/25 italic">This card is valid for the {card.session} academic session only.</p>
                    <div className="text-[10px] text-white/25">Issued: {new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                {/* Print button — hidden during print */}
                <div className="mt-4 flex justify-center no-print">
                  <button onClick={() => window.print()}
                    className="btn-primary rounded-xl px-8 py-3 text-sm font-bold text-white flex items-center gap-2">
                    <IconDownload size={16}/>
                    Print Exam Card
                  </button>
                </div>
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
