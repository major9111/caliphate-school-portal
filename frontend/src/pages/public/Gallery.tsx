import { useEffect, useState } from 'react'
import { galleryApi, type GalleryItem } from '@/lib/api'
import { useScrollReveal, useScrollStagger } from '@/hooks/useGsapPublic'
import { X, Loader2, ImageOff } from 'lucide-react'

export function PublicGallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<GalleryItem | null>(null)

  const headingRef = useScrollReveal<HTMLDivElement>()
  const gridRef = useScrollStagger()

  useEffect(() => {
    let cancelled = false
    galleryApi.list()
      .then((res) => { if (!cancelled) setItems(res.items) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div ref={headingRef} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Gallery</h1>
          <p className="text-secondary-600 max-w-2xl mx-auto">Photos from our classrooms, campus, and school life.</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16 text-secondary-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary-500">
            <ImageOff className="h-10 w-10" />
            <p>Couldn't load the gallery right now. Please try again later.</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary-500">
            <ImageOff className="h-10 w-10" />
            <p>No photos yet. Check back soon.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item) => (
              <button
                key={item.id}
                data-reveal-item
                onClick={() => setSelected(item)}
                className="group text-left aspect-[3/4] rounded-2xl overflow-hidden shadow-soft border border-secondary-200 relative"
              >
                <img src={item.url} alt={item.caption || 'Gallery photo'} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {item.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-medium truncate">{item.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

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
              <div className="glass-dark rounded-xl mt-4 p-4 text-white">
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

export default PublicGallery
