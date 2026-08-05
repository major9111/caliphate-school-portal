import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { Blobs, GeoPattern } from '@/components/public/PublicUI'

export function PublicNews() {
  const news = [
    { title: 'New Academic Session Begins', date: 'September 5, 2026', excerpt: 'We welcome all students back for the 2026/2027 session.' },
    { title: 'Inter-House Sports Competition', date: 'October 15, 2026', excerpt: 'Annual sports competition showcasing athletic talents.' },
    { title: 'Quranic Recitation Competition', date: 'November 20, 2026', excerpt: 'Students demonstrate their memorization skills.' },
  ]

  const heroRef = useScrollReveal<HTMLDivElement>()
  const listRef = useScrollStagger<HTMLDivElement>()

  return (
    <div>
      <section ref={heroRef} className="pub-hero" style={{ padding: '60px 0 48px', textAlign: 'center' }}>
        <Blobs />
        <GeoPattern />
        <div className="wrap max-w-[720px] mx-auto px-4 relative">
          <span data-reveal className="pub-eyebrow light" style={{ justifyContent: 'center' }}><StarSvg color="#E7CD8C" /> Stay Informed</span>
          <h1 data-reveal className="pub-hero-title" style={{ fontSize: 'clamp(30px,4.5vw,46px)' }}>News &amp; Events</h1>
          <p data-reveal className="pub-hero-sub" style={{ margin: '0 auto' }}>Stay updated with the latest happenings at Caliphate International Schools.</p>
        </div>
      </section>

      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="max-w-3xl mx-auto px-4">
          <div ref={listRef} className="space-y-5">
            {news.map((item) => (
              <div key={item.title} data-reveal-item className="pub-bento-card" style={{ minHeight: 0, padding: 30 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pub-sapphire)', marginBottom: 8 }}>{item.date}</p>
                <h2 style={{ fontSize: 22, marginBottom: 8, color: 'var(--pub-ink)' }}>{item.title}</h2>
                <p style={{ color: 'var(--pub-slate)' }}>{item.excerpt}</p>
              </div>
            ))}
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

export default PublicNews
