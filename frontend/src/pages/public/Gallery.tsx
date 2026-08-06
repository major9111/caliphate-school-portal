import { useEffect, useState } from 'react'
import { galleryApi, type GalleryItem } from '@/lib/api'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { X, Loader2, ImageOff } from 'lucide-react'
import { Blobs, GeoPattern } from '@/components/public/PublicUI'

export function PublicGallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<GalleryItem | null>(null)

  const heroRef = useScrollReveal<HTMLDivElement>()
  const gridRef = useScrollStagger<HTMLDivElement>()

  useEffect(() => {
    let cancelled = false
    galleryApi.list()
      .then((res) => { if (!cancelled) setItems(res.items) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <section ref={heroRef} className="pub-hero" style={{ padding: '60px 0 48px', textAlign: 'center' }}>
        <Blobs />
        <GeoPattern />
        <div className="wrap max-w-[720px] mx-auto px-4 relative">
          <span data-reveal className="pub-eyebrow light" style={{ justifyContent: 'center' }}><StarSvg color="#E7CD8C" /> Life at Caliphate</span>
          <h1 data-reveal className="pub-hero-title" style={{ fontSize: 'clamp(30px,4.5vw,46px)' }}>Gallery</h1>
          <p data-reveal className="pub-hero-sub" style={{ margin: '0 auto' }}>Photos from our classrooms, campus, and school life.</p>
        </div>
      </section>

      <section className="pub-section-pad" style={{ background: 'var(--pub-paper-2)' }}>
        <div className="wrap max-w-[1360px] mx-auto px-4">
          {loading && (
            <div className="flex justify-center py-16" style={{ color: 'var(--pub-slate)' }}>
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-16" style={{ color: 'var(--pub-slate)' }}>
              <ImageOff className="h-10 w-10" />
              <p>Couldn't load the gallery right now. Please try again later.</p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16" style={{ color: 'var(--pub-slate)' }}>
              <ImageOff className="h-10 w-10" />
              <p>No photos yet. Check back soon.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div ref={gridRef} className="pub-gal-grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  data-reveal-item
                  onClick={() => setSelected(item)}
                  className="pub-gal-item group text-left w-full"
                  style={{ display: 'block' }}
                >
                  <img src={item.url} alt={item.caption || 'Gallery photo'} loading="lazy" />
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(0deg, rgba(10,14,39,.75), transparent)' }}>
                      <p className="text-white text-sm font-medium truncate">{item.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selected.url} alt={selected.caption || 'Gallery photo'} className="w-full h-full object-contain rounded-xl max-h-[70vh]" />
            {(selected.caption || selected.note) && (
              <div className="rounded-xl mt-4 p-4 text-white bg-black/60 backdrop-blur-md border border-white/10">
                {selected.caption && <p className="font-semibold">{selected.caption}</p>}
                {selected.note && <p className="text-sm text-white/80 mt-1">{selected.note}</p>}
              </div>
            )}
          </div>
        </div>
      )}
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

export default PublicGallery
