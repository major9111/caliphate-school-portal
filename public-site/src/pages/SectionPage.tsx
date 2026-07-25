import { useParams, Navigate } from 'react-router-dom'
import { SECTIONS } from '@/data/nav'

export default function SectionPage() {
  const { slug } = useParams()
  const section = SECTIONS.find(s => s.slug === slug)
  if (!section) return <Navigate to="/" replace />

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <p className="section-label mb-3">{section.label}</p>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-2xl">{section.label}</h1>
        <p className="text-muted max-w-xl mb-12">{section.description}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.items.map(item => {
            const clickable = !!item.href
            const Wrapper = clickable ? 'a' : 'div'
            const props = clickable
              ? { href: item.href, target: item.external ? '_blank' : undefined, rel: item.external ? 'noreferrer' : undefined }
              : {}
            return (
              // @ts-ignore — dynamic element type
              <Wrapper key={item.label} {...props}
                className={`glass-card rounded-2xl p-5 flex items-center justify-between gap-3 transition-all ${
                  clickable ? 'hover:border-primary/40 hover:-translate-y-0.5 cursor-pointer' : 'opacity-70'
                }`}>
                <span className="font-semibold text-sm">{item.label}</span>
                {clickable
                  ? <i className="bi bi-arrow-up-right-circle text-primary text-lg flex-shrink-0" />
                  : <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-black/5 dark:bg-white/5 rounded-full px-2 py-1 flex-shrink-0">Coming soon</span>}
              </Wrapper>
            )
          })}
        </div>
      </div>
    </div>
  )
}
