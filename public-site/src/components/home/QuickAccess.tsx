import { PORTAL_URL } from '@/data/nav'

const CARDS = [
  { icon: 'file-earmark-plus', title: 'Apply Now', desc: 'Start your POST-UTME application', href: `${PORTAL_URL}/admission`, external: true },
  { icon: 'search', title: 'Check Admission Status', desc: 'Track your application', href: `${PORTAL_URL}/admission?check=1`, external: true },
  { icon: 'box-arrow-in-right', title: 'Student Portal', desc: 'Courses, results, fees & more', href: `${PORTAL_URL}/login`, external: true },
  { icon: 'mortarboard', title: 'Academics', desc: 'Faculties & programmes', href: '/academics' },
  { icon: 'building', title: 'Administration', desc: 'Leadership & governance', href: '/administration' },
  { icon: 'journal-bookmark', title: 'Library', desc: 'Digital resources & catalogue', href: '/library' },
]

export default function QuickAccess() {
  return (
    <section id="quick-access" className="container-page py-20">
      <p className="section-label mb-3">Quick Access</p>
      <h2 className="text-2xl sm:text-4xl font-extrabold mb-10 max-w-lg">Everything you need, one tap away</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <a key={c.title} href={c.href} target={c.external ? '_blank' : undefined} rel={c.external ? 'noreferrer' : undefined}
            className="glass-card rounded-2xl p-6 flex items-start gap-4 hover:-translate-y-1 hover:border-primary/40 transition-all group">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <i className={`bi bi-${c.icon}`} />
            </span>
            <div>
              <h3 className="font-bold mb-1">{c.title}</h3>
              <p className="text-sm text-muted">{c.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
