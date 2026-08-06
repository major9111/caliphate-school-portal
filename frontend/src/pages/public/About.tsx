import { School, Users, GraduationCap, Award, CheckCircle2 } from 'lucide-react'
import { useHeroReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { SectionHead, IconChip, Blobs, GeoPattern } from '@/components/public/PublicUI'

const values = [
  { icon: School, title: 'Our Mission', desc: 'To provide balanced education combining academic excellence with Islamic values.' },
  { icon: Award, title: 'Our Vision', desc: 'To be the leading institution producing well-rounded, morally upright leaders.' },
  { icon: Users, title: 'Our Values', desc: 'Knowledge, Faith, Excellence, Discipline, and Integrity.' },
  { icon: GraduationCap, title: 'Our Approach', desc: 'Holistic education nurturing mind, body, and spirit.' },
]

const stages = [
  { num: 'STAGE 01', title: 'Nursery', desc: "Ages 3–5. Gentle first steps in literacy, numeracy, and Islamic manners through guided play." },
  { num: 'STAGE 02', title: 'Primary', desc: 'Ages 6–11. A structured foundation across core subjects, tahfeez, and character formation.' },
  { num: 'STAGE 03', title: 'Secondary', desc: 'Ages 12–17. Exam-focused mastery preparing students for WAEC, NECO, and beyond.' },
]

const faculty = [
  { role: 'Head of Nursery', dept: 'Early Years', desc: 'Oversees foundational literacy, numeracy, and guided play for our youngest learners.' },
  { role: 'Head of Primary', dept: 'Primary Section', desc: 'Coordinates the core curriculum and character formation across Primary 1–6.' },
  { role: 'Head of Secondary', dept: 'Secondary Section', desc: 'Guides exam preparation and subject specialisation from JSS 1 to SSS 3.' },
  { role: 'Head of Islamic Studies', dept: 'Deen & Tahfeez', desc: 'Leads daily Qur\u2019an, Arabic, and Islamic studies across all sections.' },
]

export function PublicAbout() {
  const heroRef = useHeroReveal()
  const cardsRef = useScrollStagger<HTMLDivElement>()
  const journeyRef = useScrollStagger<HTMLDivElement>()

  return (
    <div>
      <section ref={heroRef} className="pub-hero" style={{ paddingBottom: 60 }}>
        <Blobs />
        <GeoPattern />
        <div className="wrap max-w-[1360px] mx-auto px-4 relative">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            <div>
              <span data-reveal className="pub-eyebrow light"><StarSvg color="#E7CD8C" /> Our Story</span>
              <h1 data-reveal className="pub-hero-title" style={{ fontSize: 'clamp(34px,5vw,54px)' }}>About Caliphate International Schools</h1>
              <p data-reveal className="pub-hero-sub">
                Founded in 2013, Caliphate International Schools has been at the forefront of providing quality
                Islamic and Western education in Gusau, Zamfara State — nurturing confident, principled learners
                from nursery through secondary.
              </p>
            </div>
            <div data-reveal className="pub-principal-photo" style={{ aspectRatio: '4/3' }}>
              <img src="/images/classroom-3.jpg" alt="Students in a Caliphate International Schools classroom" />
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section-pad">
        <div className="wrap max-w-[1360px] mx-auto px-4">
          <SectionHead eyebrow="What Guides Us" title="Mission, vision, and values built into every school day." />
          <div ref={cardsRef} className="grid sm:grid-cols-2 gap-5">
            {values.map((item) => (
              <div key={item.title} data-reveal-item className="pub-bento-card" style={{ minHeight: 0 }}>
                <IconChip bg="rgba(29,78,216,.08)" color="var(--pub-sapphire)"><item.icon className="h-5 w-5" /></IconChip>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="wrap max-w-[1360px] mx-auto px-4">
          <SectionHead center eyebrow="Our People" title="Guided by experienced section leaders." body="Each stage of school life is overseen by a dedicated coordinator who knows every student by name." />
          <div className="pub-faculty-grid">
            {faculty.map((item) => (
              <div key={item.role} className="pub-faculty-card">
                <div className="pub-faculty-photo"><Users className="h-8 w-8" /></div>
                <h4>{item.role}</h4>
                <p className="pub-faculty-role">{item.dept}</p>
                <p className="pub-faculty-meta">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section-pad pub-academics" style={{ position: 'relative' }}>
        <GeoPattern />
        <div className="wrap max-w-[1360px] mx-auto px-4 relative">
          <SectionHead light eyebrow="The Academic Journey" title="One continuous path, from a child's first steps to their final exams." />
          <div ref={journeyRef} className="pub-journey-row">
            {stages.map((s) => (
              <div key={s.num} className="pub-journey-card" data-reveal-item>
                <span className="pub-journey-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section-pad">
        <div className="wrap max-w-[1360px] mx-auto px-4">
          <div className="pub-principal-grid">
            <div data-reveal>
              <span className="pub-eyebrow"><StarSvg /> Our Commitment</span>
              <h2 style={{ fontSize: 'clamp(26px,3.2vw,36px)', color: 'var(--pub-ink)', margin: '16px 0' }}>
                Balanced, holistic, and rooted in genuine care.
              </h2>
              <p style={{ color: 'var(--pub-slate)', lineHeight: 1.7, marginBottom: 22 }}>
                Every student is known by name. Our teachers combine strong subject expertise with patient,
                individual attention — so that academic rigor and Islamic character grow side by side.
              </p>
              <ul className="space-y-3">
                {['Small, attentive class sizes', 'Daily Qur\u2019an and Islamic studies', 'Regular parent communication', 'Safe, well-supervised campus'].map((li) => (
                  <li key={li} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, color: 'var(--pub-charcoal)' }}>
                    <CheckCircle2 className="h-[18px] w-[18px] mt-0.5" style={{ color: 'var(--pub-gold)', flexShrink: 0 }} />
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal className="pub-principal-photo">
              <img src="/images/classroom-5.jpg" alt="Students engaged in class at Caliphate International Schools" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function StarSvg({ color = '#1D4ED8' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="12" height="12">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill={color} />
    </svg>
  )
}

export default PublicAbout
