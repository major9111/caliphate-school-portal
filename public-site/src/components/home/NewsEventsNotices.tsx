import { useEffect, useState } from 'react'

// Sample/placeholder data — wire this up to the backend's news/events models
// once they exist, rather than editing these arrays by hand long-term.
const NEWS = [
  { tag: 'Academics', title: 'Sample news headline goes here', date: 'Jan 2026' },
  { tag: 'Admissions', title: 'Sample announcement about admissions', date: 'Jan 2026' },
  { tag: 'Research', title: 'Sample research highlight headline', date: 'Dec 2025' },
]

const NEXT_EVENT = new Date(Date.now() + 1000 * 60 * 60 * 24 * 18) // sample: 18 days out

function useCountdown(target: Date) {
  const [left, setLeft] = useState(target.getTime() - Date.now())
  useEffect(() => {
    const t = setInterval(() => setLeft(target.getTime() - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  const clamp = Math.max(left, 0)
  return {
    days: Math.floor(clamp / 86400000),
    hours: Math.floor((clamp % 86400000) / 3600000),
    mins: Math.floor((clamp % 3600000) / 60000),
    secs: Math.floor((clamp % 60000) / 1000),
  }
}

const NOTICES = [
  'Sample notice: 2025/2026 registration timelines will be posted here.',
  'Sample notice: hostel allocation updates will be posted here.',
  'Sample notice: exam timetable release will be posted here.',
]

export default function NewsEventsNotices() {
  const cd = useCountdown(NEXT_EVENT)

  return (
    <section className="container-page py-20">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* News */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold">Latest News</h2>
            <a href="/news" className="text-sm font-semibold text-primary">View all <i className="bi bi-arrow-right" /></a>
          </div>
          <div className="space-y-3">
            {NEWS.map(n => (
              <a key={n.title} href="/news" className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-primary/40 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-1 flex-shrink-0">{n.tag}</span>
                <span className="flex-1 text-sm font-semibold">{n.title}</span>
                <span className="text-xs text-muted flex-shrink-0">{n.date}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Event countdown + notice board */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Next Event (sample)</p>
            <h3 className="font-bold mb-4">Matriculation Ceremony</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['Days', cd.days], ['Hrs', cd.hours], ['Min', cd.mins], ['Sec', cd.secs]].map(([label, val]) => (
                <div key={label as string} className="rounded-xl bg-primary/10 py-2.5">
                  <div className="text-lg font-extrabold text-primary">{val}</div>
                  <div className="text-[9px] uppercase text-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              <i className="bi bi-pin-angle" /> Notice Board
            </p>
            <ul className="space-y-3">
              {NOTICES.map(n => (
                <li key={n} className="text-sm text-muted flex gap-2">
                  <i className="bi bi-dot text-primary flex-shrink-0" /> {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
