import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, GraduationCap, Award, BookOpen, ArrowRight, Sparkles } from 'lucide-react'
import { useHeroReveal, useScrollStagger } from '@/hooks/useGsapPublic'

const gallery = [
  { src: '/images/hero-playground.jpg', alt: 'Students playing on the playground' },
  { src: '/images/classroom-1.jpg', alt: 'Students in class' },
  { src: '/images/classroom-2.jpg', alt: 'Students at their desks' },
  { src: '/images/swing-single.jpg', alt: 'Student on the swing' },
]

const features = [
  { icon: GraduationCap, title: 'Excellence', desc: 'Outstanding academic results', tone: 'primary' },
  { icon: Users, title: 'Expert Teachers', desc: 'Qualified and experienced staff', tone: 'accent' },
  { icon: BookOpen, title: 'Islamic Values', desc: 'Strong moral foundation', tone: 'warn' },
  { icon: Award, title: 'Modern Facilities', desc: 'State-of-the-art campus', tone: 'success' },
]

const TONES: Record<string, string> = {
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-300',
  accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
  success: 'bg-success-500/10 text-success-600 dark:text-success-300',
  warn: 'bg-warn-500/10 text-warn-600 dark:text-warn-300',
}

export function PublicHome() {
  const heroRef = useHeroReveal()
  const cardsRef = useScrollStagger()
  const galleryRef = useScrollStagger()
  const yearsRunning = new Date().getFullYear() - 2013

  return (
    <div>
      {/* Hero */}
      <section ref={heroRef} className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span data-reveal className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium mb-6 text-[var(--text-2)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--indigo)]" /> Admissions open for 2026/2027
            </span>
            <h1 data-reveal className="font-display font-bold text-4xl md:text-[52px] leading-[1.05] tracking-tight mb-6 text-[var(--text)]">
              Where Islamic values meet academic excellence.
            </h1>
            <p data-reveal className="text-[var(--text-2)] text-[17px] leading-relaxed max-w-md mb-8">
              Caliphate International Schools has shaped confident, principled learners in Gusau, Zamfara State since 2013 — from nursery through secondary.
            </p>
            <div data-reveal className="flex flex-wrap gap-3">
              <Link to="/admissions"><Button size="lg">Apply Now <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
              <Link to="/about"><Button size="lg" variant="outline">Learn More</Button></Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-xl4 overflow-hidden">
              <img src="/images/hero-playground.jpg" alt="Students at Caliphate International Schools" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -left-4 sm:-left-6 bottom-8 bg-[var(--surface)] border border-[var(--border)] shadow-medium rounded-2xl p-4 w-48 hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-success-500/10 text-success-600 dark:text-success-300 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono font-semibold text-lg leading-none text-[var(--text)]">{yearsRunning}</p>
                  <p className="text-[var(--text-3)] text-[11px] mt-1">Years of excellence</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-2 sm:-right-4 top-8 bg-[var(--surface)] border border-[var(--border)] shadow-medium rounded-2xl p-3 w-40 hidden sm:block">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <p className="text-[12px] font-medium text-[var(--text)]">Islamic &amp; Western</p>
              </div>
              <p className="text-[11px] text-[var(--text-3)] pl-10 -mt-1">Curriculum</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4 text-[var(--text)]">Why Choose Us</h2>
            <p className="text-[var(--text-2)] max-w-2xl mx-auto">We combine excellence in education with strong Islamic values.</p>
          </div>
          <div ref={cardsRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, i) => (
              <div key={i} data-reveal-item>
                <Card className="p-6">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${TONES[item.tone]}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-[var(--text)]">{item.title}</h3>
                  <p className="text-[var(--text-2)] text-sm">{item.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 md:py-24 bg-[var(--surface-2)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4 text-[var(--text)]">Life at Caliphate</h2>
            <p className="text-[var(--text-2)] max-w-2xl mx-auto">A glimpse into our classrooms and campus life.</p>
          </div>
          <div ref={galleryRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {gallery.map((img, i) => (
              <div key={i} data-reveal-item className={i % 2 === 1 ? 'lg:mt-8' : ''}>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-soft">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admissions CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div
            className="relative overflow-hidden rounded-xl4 p-10 md:p-14 text-white"
            style={{ background: 'linear-gradient(135deg, #1B1F3B 0%, #12162A 55%, #0B0F14 100%)' }}
          >
            <div
              className="absolute inset-0 opacity-55"
              style={{
                background:
                  'radial-gradient(circle at 15% 20%, rgba(79,70,229,.55), transparent 45%), radial-gradient(circle at 85% 15%, rgba(6,182,212,.35), transparent 40%), radial-gradient(circle at 60% 90%, rgba(16,185,129,.25), transparent 45%)',
              }}
            />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="max-w-lg">
                <h2 className="font-display font-bold text-2xl md:text-[34px] tracking-tight mb-3">Ready to join the Caliphate family?</h2>
                <p className="text-white/70 text-[15px]">Applications for the 2026/2027 session are open now. Seats are limited across all sections.</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link to="/admissions" className="px-5 py-3 rounded-xl bg-white text-[#12162A] font-medium text-sm flex items-center gap-2 hover:bg-white/90 transition-colors">
                  Start Application <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/contact" className="px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-medium text-sm hover:bg-white/20 transition-colors">
                  Contact Admissions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PublicHome
