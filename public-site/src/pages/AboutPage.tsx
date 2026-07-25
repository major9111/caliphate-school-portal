const BLOCKS = [
  { id: 'history',  icon: 'clock-history', title: 'Our History', placeholder: 'Add the University\'s founding story, key milestones, and growth timeline here.' },
  { id: 'vision',   icon: 'eye',           title: 'Our Vision',   placeholder: 'Add the official Vision Statement here.' },
  { id: 'mission',  icon: 'bullseye',      title: 'Our Mission',  placeholder: 'Add the official Mission Statement here.' },
  { id: 'values',   icon: 'gem',           title: 'Core Values',  placeholder: 'List the University\'s core values (e.g. Integrity, Excellence, Innovation) here.' },
  { id: 'motto',    icon: 'quote',         title: 'University Motto', placeholder: 'Knowledge · Innovation · Service' },
  { id: 'anthem',   icon: 'music-note-beamed', title: 'University Anthem', placeholder: 'Add anthem lyrics or an embedded audio/video player here.' },
  { id: 'structure',icon: 'diagram-3',     title: 'Organizational Structure', placeholder: 'Add an organogram / structure chart here.' },
  { id: 'map',      icon: 'map',           title: 'Campus Map', placeholder: 'Embed an interactive campus map here.' },
  { id: 'officers', icon: 'person-badge',  title: 'Principal Officers', placeholder: 'List principal officers with photos and titles here.' },
  { id: 'leadership', icon: 'people',      title: 'University Leadership', placeholder: 'Add leadership profiles here — see also the Administration page.' },
]

export default function AboutPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <p className="section-label mb-3">About FUGUSAU</p>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-2xl">
          Knowledge, Innovation<br/>& Service since 2013
        </h1>
        <p className="text-muted max-w-xl mb-6">
          Federal University Gusau is committed to academic excellence, research innovation,
          and producing graduates who serve their communities and nation.
        </p>

        {/* Jump nav */}
        <div className="flex flex-wrap gap-2 mb-14">
          {BLOCKS.map(b => (
            <a key={b.id} href={`#${b.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full glass-card hover:text-primary transition-colors">
              {b.title}
            </a>
          ))}
        </div>

        <div className="space-y-6">
          {BLOCKS.map((b, i) => (
            <section key={b.id} id={b.id} className="glass-card rounded-2xl p-6 md:p-8 scroll-mt-28">
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-lg">
                  <i className={`bi bi-${b.icon}`} />
                </span>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1.5">{i + 1}. {b.title}</h2>
                  <p className="text-sm text-muted italic leading-relaxed">{b.placeholder}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
