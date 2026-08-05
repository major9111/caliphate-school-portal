import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useHeroReveal, useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { useCountUp } from '@/hooks/useCountUp'
import { SectionHead, IconChip, Blobs, GeoPattern } from '@/components/public/PublicUI'

const YEAR_FOUNDED = 2013

const galleryPreview = [
  { src: '/images/classroom-1.jpg', alt: 'Students in class' },
  { src: '/images/swing-single.jpg', alt: 'Student on the swing' },
  { src: '/images/classroom-2.jpg', alt: 'Classroom activity' },
  { src: '/images/hero-playground.jpg', alt: 'School playground' },
  { src: '/images/classroom-4.jpg', alt: 'Students learning' },
  { src: '/images/swing-pair.jpg', alt: 'Students playing' },
  { src: '/images/classroom-5.jpg', alt: 'Classroom setting' },
  { src: '/images/classroom-6.jpg', alt: 'Students at their desks' },
]

const testimonials = [
  { body: 'My child has grown so much in confidence and character since joining. The teachers genuinely care about each pupil.', name: 'A. Muhammad', tag: 'Parent, Primary 4' },
  { body: 'The balance between Islamic teaching and academic rigor is exactly what we were looking for. Highly recommended.', name: 'F. Sani', tag: 'Parent, JSS 2' },
  { body: "From nursery to secondary, we've never had to look elsewhere. The results speak for themselves.", name: 'H. Bello', tag: 'Parent, SS 1' },
]

function TrustNumber({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const count = useCountUp(value)
  return (
    <div className="pub-trust-item" data-reveal-item>
      <div className="pub-trust-num">{count}<span className="pub-suffix">{suffix}</span></div>
      <div className="pub-trust-label">{label}</div>
    </div>
  )
}

export function PublicHome() {
  const heroRef = useHeroReveal()
  const trustRef = useScrollStagger<HTMLDivElement>()
  const leadershipRef = useScrollReveal<HTMLDivElement>()
  const bentoRef = useScrollStagger<HTMLDivElement>()
  const journeyRef = useScrollStagger<HTMLDivElement>()
  const facilitiesRef = useScrollReveal<HTMLDivElement>()
  const galleryRef = useScrollStagger<HTMLDivElement>()
  const testiRef = useScrollReveal<HTMLDivElement>()
  const ctaRef = useScrollReveal<HTMLDivElement>()

  return (
    <div>
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="pub-hero">
        <Blobs />
        <GeoPattern />
        <div className="wrap max-w-[1240px] mx-auto px-4 relative">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_.95fr] items-center">
            <div>
              <div data-reveal className="pub-badge-pill">
                <span className="pub-dot"><StarSvg /></span>
                Admissions Open for 2026 / 2027
              </div>
              <h1 data-reveal className="pub-hero-title">
                Building future leaders through <em>faith,</em> knowledge &amp; academic excellence.
              </h1>
              <p data-reveal className="pub-hero-sub">
                Caliphate International Schools has shaped confident, principled learners in Gusau, Zamfara State
                since {YEAR_FOUNDED} — a nurturing home where Islamic values and world-class academics grow together,
                from nursery through secondary.
              </p>
              <div data-reveal className="pub-btn-row">
                <Link to="/admissions" className="pub-btn-primary">
                  Apply Now <ArrowRight className="h-[15px] w-[15px]" />
                </Link>
                <Link to="/gallery" className="pub-btn-secondary">Explore Our Campus</Link>
              </div>
            </div>

            <div className="pub-hero-visual" data-reveal>
              <div className="pub-halo-wrap">
                <div className="pub-halo-glow" />
                <svg className="pub-star-motif" width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute' }} aria-hidden="true">
                  <g opacity="0.4" stroke="url(#pub-hero-gg)" strokeWidth="1" fill="none">
                    <path d="M170 20 L200 90 L270 90 L215 135 L235 205 L170 165 L105 205 L125 135 L70 90 L140 90 Z" />
                  </g>
                  <defs>
                    <linearGradient id="pub-hero-gg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#E7CD8C" />
                      <stop offset="100%" stopColor="#4CC3F0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="pub-halo-ring" />
                <div className="pub-halo-ring pub-r2" />
                <div className="pub-emblem-frame">
                  <img src="/images/logo.jpg" alt="Caliphate International Schools emblem" />
                </div>
              </div>

              <div className="pub-float-card pub-c1">
                <IconChip bg="rgba(201,162,75,.15)" color="var(--pub-gold-soft)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L2 8l10 5 8-4v6M6 10v6c0 1.5 3 3 6 3s6-1.5 6-3v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </IconChip>
                <div><strong>Top Academic<br />Excellence</strong></div>
              </div>
              <div className="pub-float-card pub-c2">
                <IconChip bg="rgba(76,195,240,.15)" color="var(--pub-azure)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </IconChip>
                <div><strong>Qur'an &amp; Deen</strong><p>Integrated daily</p></div>
              </div>
              <div className="pub-float-card pub-c3">
                <IconChip bg="rgba(29,78,216,.18)" color="var(--pub-sapphire-light)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </IconChip>
                <div><strong>Admissions Open</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST STATS ================= */}
      <section className="pub-trust">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <div ref={trustRef} className="pub-trust-grid">
            <div className="pub-trust-item" data-reveal-item>
              <div className="pub-trust-num">{YEAR_FOUNDED}</div>
              <div className="pub-trust-label">Founded</div>
            </div>
            <TrustNumber value={1000} suffix="+" label="Students" />
            <TrustNumber value={98} suffix="%" label="WAEC Success Rate" />
            <div className="pub-trust-item" data-reveal-item>
              <div className="pub-trust-num" style={{ fontSize: 20 }}>Nursery &rarr; Secondary</div>
              <div className="pub-trust-label">Full Programs</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LEADERSHIP MESSAGE ================= */}
      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <div ref={leadershipRef} className="pub-principal-grid">
            <div className="pub-principal-photo" data-reveal>
              <img src="/images/classroom-3.jpg" alt="A classroom at Caliphate International Schools" />
            </div>
            <div data-reveal>
              <span className="pub-eyebrow"><StarSvg color="#1D4ED8" /> A Message From Our School Leadership</span>
              <div className="pub-quote-mark">&ldquo;</div>
              <p className="pub-principal-text">
                At Caliphate International Schools, we believe every child carries the seed of leadership. Our task is
                to nurture that seed with sound Islamic character, rigorous scholarship, and genuine care — so that
                each student leaves us not only well-educated, but well-grounded.
              </p>
              <div className="pub-principal-sign">
                <div className="pub-ln" />
                <span>School Leadership, Caliphate International Schools</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE (BENTO) ================= */}
      <section className="pub-section-pad">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead eyebrow="Why Families Choose Us" title="A learning environment built on faith, rigor, and genuine care." />
          <div ref={bentoRef} className="pub-bento">
            <div className="pub-bento-card pub-b1" data-reveal-item>
              <svg className="pub-geo-mini" width="180" height="180" viewBox="0 0 180 180" aria-hidden="true"><path d="M90 10L104 76L170 90L104 104L90 170L76 104L10 90L76 76Z" fill="none" stroke="#E7CD8C" strokeWidth="1" /></svg>
              <IconChip bg="rgba(201,162,75,.15)" color="var(--pub-gold-soft)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L2 8l10 5 8-4v6M6 10v6c0 1.5 3 3 6 3s6-1.5 6-3v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </IconChip>
              <h3>Islamic values at the core</h3>
              <p>Daily Qur'an, tahfeez, and Islamic studies woven naturally into school life — not an add-on, but a foundation.</p>
            </div>
            <div className="pub-bento-card pub-b2" data-reveal-item>
              <IconChip bg="rgba(29,78,216,.08)" color="var(--pub-sapphire)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 10v6M6 12l6 4 10-6-10-6-10 6 4 2.4v5.1c1.6 1 3.8 1.5 6 1.5s4.4-.5 6-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              </IconChip>
              <h3>WAEC-proven results</h3>
              <p>A 98% success rate reflects an academic culture built on discipline and expert instruction.</p>
            </div>
            <div className="pub-bento-card pub-b3" data-reveal-item>
              <IconChip bg="rgba(76,195,240,.12)" color="var(--pub-azure)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" /></svg>
              </IconChip>
              <h3>Experienced educators</h3>
              <p>Qualified teachers who know every child by name.</p>
            </div>
            <div className="pub-bento-card pub-b4" data-reveal-item>
              <IconChip bg="rgba(29,78,216,.08)" color="var(--pub-sapphire)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </IconChip>
              <h3>Modern facilities</h3>
              <p>Bright classrooms, science labs, and safe play spaces.</p>
            </div>
            <div className="pub-bento-card pub-b5" data-reveal-item>
              <IconChip bg="rgba(201,162,75,.15)" color="var(--pub-gold-soft)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.5l-1-.9a5.5 5.5 0 10-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              </IconChip>
              <h3>Nurturing community</h3>
              <p>A close-knit family where every child is seen and supported.</p>
            </div>
            <div className="pub-bento-card pub-b6" data-reveal-item>
              <IconChip bg="rgba(76,195,240,.12)" color="var(--pub-azure)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /></svg>
              </IconChip>
              <h3>Balanced curriculum</h3>
              <p>Islamic &amp; Western education combined, giving students the best of both worlds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ACADEMIC JOURNEY ================= */}
      <section className="pub-section-pad pub-academics" style={{ position: 'relative' }}>
        <GeoPattern />
        <div className="wrap max-w-[1240px] mx-auto px-4 relative">
          <SectionHead light eyebrow="The Academic Journey" title="One continuous path, from a child's first steps to their final exams." />
          <div ref={journeyRef} className="pub-journey-row">
            <div className="pub-journey-card" data-reveal-item>
              <span className="pub-journey-num">STAGE 01</span>
              <h3>Nursery</h3>
              <p>Ages 3–5. Gentle first steps in literacy, numeracy, and Islamic manners through guided play.</p>
              <ul>
                <li><CheckSvg /> Phonics &amp; early numeracy</li>
                <li><CheckSvg /> Qur'an memorisation begins</li>
                <li><CheckSvg /> Guided play &amp; social skills</li>
              </ul>
            </div>
            <div className="pub-journey-card" data-reveal-item>
              <span className="pub-journey-num">STAGE 02</span>
              <h3>Primary</h3>
              <p>Ages 6–11. A structured foundation across core subjects, tahfeez, and character formation.</p>
              <ul>
                <li><CheckSvg /> National curriculum core subjects</li>
                <li><CheckSvg /> Daily Qur'an &amp; Arabic</li>
                <li><CheckSvg /> Sports, art &amp; clubs</li>
              </ul>
            </div>
            <div className="pub-journey-card" data-reveal-item>
              <span className="pub-journey-num">STAGE 03</span>
              <h3>Secondary</h3>
              <p>Ages 12–17. Exam-focused mastery preparing students for WAEC, NECO, and beyond.</p>
              <ul>
                <li><CheckSvg /> Science, Arts &amp; Commercial tracks</li>
                <li><CheckSvg /> WAEC/NECO exam preparation</li>
                <li><CheckSvg /> University &amp; career guidance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FACILITIES ================= */}
      <section className="pub-section-pad">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead eyebrow="Our Campus" title="Spaces designed for children to learn, play, and grow safely." />
          <div ref={facilitiesRef} className="pub-fac-grid" data-reveal>
            <div className="pub-fac-main">
              <img src="/images/playground-wide.jpg" alt="Playground at Caliphate International Schools" />
              <div className="pub-cap">
                <h3>Open-air play &amp; sports grounds</h3>
                <p>Safe, spacious areas where children build friendships and physical confidence.</p>
              </div>
            </div>
            <div className="pub-fac-side">
              <IconChip bg="rgba(29,78,216,.08)" color="var(--pub-sapphire)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              </IconChip>
              <div><h4>Bright classrooms</h4><p>Well-lit, well-resourced rooms sized for focused learning.</p></div>
            </div>
            <div className="pub-fac-side">
              <IconChip bg="rgba(29,78,216,.08)" color="var(--pub-sapphire)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              </IconChip>
              <div><h4>Science &amp; ICT labs</h4><p>Hands-on facilities that bring the curriculum to life.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= GALLERY PREVIEW ================= */}
      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead center eyebrow="Life at Caliphate" title="A glimpse into our classrooms and campus life." />
          <div ref={galleryRef} className="pub-gal-grid">
            {galleryPreview.map((img) => (
              <div key={img.src} className="pub-gal-item" data-reveal-item>
                <img src={img.src} alt={img.alt} loading="lazy" />
              </div>
            ))}
          </div>
          <div className="text-center mt-10" data-reveal>
            <Link to="/gallery" className="pub-btn-secondary" style={{ color: 'var(--pub-ink)', background: 'var(--pub-paper)', border: '1px solid var(--pub-mist)' }}>
              View Full Gallery <ArrowRight className="h-[15px] w-[15px]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="pub-section-pad">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <SectionHead eyebrow="Parent Voices" title="Trusted by families across Gusau and beyond." />
          <div ref={testiRef} className="pub-testi-track" data-reveal>
            {testimonials.map((t) => (
              <div key={t.name} className="pub-testi-card">
                <div className="pub-stars">★★★★★</div>
                <p className="pub-body">{t.body}</p>
                <div className="pub-testi-who">
                  <div className="pub-avatar-dot">{t.name[0]}</div>
                  <div><strong>{t.name}</strong><span>{t.tag}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="pub-section-pad">
        <div className="wrap max-w-[1240px] mx-auto px-4">
          <div ref={ctaRef} className="pub-cta-box" data-reveal>
            <div className="pub-blob pub-blob-1" style={{ opacity: 0.25 }} />
            <div className="pub-blob pub-blob-2" style={{ opacity: 0.2 }} />
            <span className="pub-eyebrow light" style={{ justifyContent: 'center' }}>
              <StarSvg color="#E7CD8C" /> Admissions Open for 2026/2027
            </span>
            <h2>Ready to join the Caliphate family?</h2>
            <p>Seats are limited across all sections — begin your child's journey with us today.</p>
            <div className="pub-btn-row" style={{ justifyContent: 'center' }}>
              <Link to="/admissions" className="pub-btn-primary">
                Start Application <ArrowRight className="h-[15px] w-[15px]" />
              </Link>
              <Link to="/contact" className="pub-btn-secondary">Contact Admissions</Link>
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

function CheckSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l4 4L19 7" stroke="#C9A24B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default PublicHome
