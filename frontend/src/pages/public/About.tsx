import { School, Users, GraduationCap, Award } from 'lucide-react'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { Card } from '@/components/ui/card'

const items = [
  { icon: School, title: 'Our Mission', desc: 'To provide balanced education combining academic excellence with Islamic values.', tone: 'primary' },
  { icon: Award, title: 'Our Vision', desc: 'To be the leading institution producing well-rounded, morally upright leaders.', tone: 'warn' },
  { icon: Users, title: 'Our Values', desc: 'Knowledge, Faith, Excellence, Discipline, and Integrity.', tone: 'accent' },
  { icon: GraduationCap, title: 'Our Approach', desc: 'Holistic education nurturing mind, body, and spirit.', tone: 'success' },
]

const TONES: Record<string, string> = {
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-300',
  accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
  success: 'bg-success-500/10 text-success-600 dark:text-success-300',
  warn: 'bg-warn-500/10 text-warn-600 dark:text-warn-300',
}

export function PublicAbout() {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const imageRef = useScrollReveal<HTMLDivElement>()
  const cardsRef = useScrollStagger()

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div ref={headingRef} className="grid md:grid-cols-2 gap-8 items-center mb-12">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl mb-6 text-[var(--text)]">About Caliphate Schools</h1>
              <p className="text-lg text-[var(--text-2)]">Founded in 2013, Caliphate International Schools has been at the forefront of providing quality Islamic and Western education in Gusau, Zamfara State.</p>
            </div>
            <div ref={imageRef} className="rounded-2xl overflow-hidden shadow-soft aspect-[4/3]">
              <img src="/images/classroom-3.jpg" alt="Students in a Caliphate International Schools classroom" className="h-full w-full object-cover" />
            </div>
          </div>

          <div ref={cardsRef} className="grid md:grid-cols-2 gap-6 mb-12">
            {items.map((item, i) => (
              <div key={i} data-reveal-item>
                <Card className="p-6">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${TONES[item.tone]}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2 text-[var(--text)]">{item.title}</h3>
                  <p className="text-[var(--text-2)]">{item.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicAbout
