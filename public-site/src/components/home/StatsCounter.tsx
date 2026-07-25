import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const STATS = [
  { value: 12000, suffix: '+', label: 'Students' },
  { value: 40, suffix: '+', label: 'Programmes' },
  { value: 6, suffix: '', label: 'Faculties' },
  { value: 13, suffix: '', label: 'Years of Growth' },
]

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('[data-count]')
    if (!els) return
    els.forEach(el => {
      const target = Number(el.dataset.count)
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target,
        duration: 2,
        ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.floor(obj.val).toLocaleString() },
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      })
    })
    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])

  return (
    <section ref={ref} className="container-page -mt-16 sm:-mt-20 relative z-10">
      <div className="glass-card rounded-3xl p-6 sm:p-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 shadow-xl">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-3xl sm:text-5xl font-extrabold text-primary">
              <span data-count={s.value}>0</span>{s.suffix}
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
