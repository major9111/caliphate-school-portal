const TESTIMONIALS = [
  { name: 'Sample Student', role: '300L, Computer Science', quote: 'Sample testimonial quote goes here — replace with a real student\'s words.' },
  { name: 'Sample Alumnus', role: 'Class of 2022', quote: 'Sample alumni testimonial goes here — replace with a real graduate\'s story.' },
  { name: 'Sample Parent', role: 'Parent of a student', quote: 'Sample parent testimonial goes here.' },
]

const PARTNERS = ['TETFund', 'NUC', 'JAMB', 'NITDA', 'Sample Partner']

export default function TestimonialsPartners() {
  return (
    <section className="py-20">
      <div className="container-page">
        <p className="section-label mb-3">What People Say</p>
        <h2 className="text-2xl sm:text-4xl font-extrabold mb-10 max-w-lg">Sample testimonials — swap in real voices</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="glass-card rounded-2xl p-6">
              <i className="bi bi-quote text-3xl text-primary/40" />
              <p className="text-sm text-muted italic leading-relaxed mb-4">{t.quote}</p>
              <p className="font-bold text-sm">{t.name}</p>
              <p className="text-xs text-muted">{t.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 overflow-hidden">
        <p className="text-center section-label mb-6">Affiliations & Partners (sample)</p>
        <div className="flex gap-16 animate-marquee whitespace-nowrap opacity-60">
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <span key={i} className="text-xl font-extrabold text-muted flex-shrink-0">{p}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
