import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { PORTAL_URL } from '@/data/nav'

const SLIDES = [
  {
    eyebrow: 'Admissions Open',
    title: 'Your Future Starts\nat FUGUSAU',
    subtitle: 'Apply for POST-UTME screening and join a community built on knowledge, innovation and service.',
    cta: { label: 'Apply Now', href: `${PORTAL_URL}/admission` },
    gradient: 'from-primary-dark via-primary to-primary-light',
  },
  {
    eyebrow: 'Excellence in Learning',
    title: 'Faculties Built for\nReal-World Impact',
    subtitle: 'Explore undergraduate and postgraduate programmes across our growing faculties.',
    cta: { label: 'Explore Academics', href: '/academics' },
    gradient: 'from-emerald-900 via-primary to-gold',
  },
  {
    eyebrow: 'Student Life',
    title: 'A Campus That\nFeels Like Home',
    subtitle: 'Hostels, student services, clubs and support — everything you need to thrive.',
    cta: { label: 'Student Portal', href: `${PORTAL_URL}/login` },
    gradient: 'from-primary via-emerald-700 to-primary-dark',
  },
]

export default function HeroSlider() {
  const [index, setIndex] = useState(0)
  const slideRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(contentRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
    return () => { tl.kill() }
  }, [index])

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const slide = SLIDES[index]

  return (
    <section ref={slideRef} className="relative min-h-[100svh] flex items-end overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-1000`} />
      {/* Decorative texture */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />

      <div ref={contentRef} className="relative container-page pb-24 pt-40 text-white">
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-gold-light mb-4">{slide.eyebrow}</p>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6 whitespace-pre-line max-w-3xl">
          {slide.title}
        </h1>
        <p className="text-base sm:text-lg text-white/80 max-w-xl mb-8 leading-relaxed">{slide.subtitle}</p>
        <div className="flex flex-wrap gap-3">
          <a href={slide.cta.href} target={slide.cta.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
            className="btn-primary !bg-white !text-primary-dark !shadow-none hover:!bg-white/90">
            {slide.cta.label} <i className="bi bi-arrow-right" />
          </a>
          <a href="#quick-access" className="btn-outline !border-white/40 !text-white hover:!border-white">
            Explore the University
          </a>
        </div>

        {/* Slide indicators */}
        <div className="flex gap-2 mt-14">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-white' : 'w-4 bg-white/35'}`} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 sm:right-10 text-white/60 text-xs flex items-center gap-2 animate-bounce">
        Scroll <i className="bi bi-arrow-down" />
      </div>
    </section>
  )
}
