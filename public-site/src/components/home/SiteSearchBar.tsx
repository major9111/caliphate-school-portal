import { useState } from 'react'
import { API_BASE } from '@/lib/api'

interface SearchResult { type: string; title: string; subtitle: string; url: string }

export default function SiteSearchBar() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const search = async (value: string) => {
    setQ(value)
    if (value.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch(`${API_BASE}/search/?q=${encodeURIComponent(value)}&limit=6`)
      const data = await res.json()
      setResults(Array.isArray(data?.results) ? data.results : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative max-w-xl mx-auto -mt-8 mb-4 z-20 px-4">
      <div className="glass-card rounded-2xl shadow-lg flex items-center gap-3 px-5 py-4">
        <i className="bi bi-search text-primary" />
        <input
          value={q}
          onChange={e => search(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search courses, departments, library…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {open && (
        <div className="absolute inset-x-4 mt-2 glass-card rounded-2xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {loading && <p className="px-5 py-4 text-xs text-muted">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-5 py-4 text-xs text-muted">No results for "{q}"</p>}
          {results.map(r => (
            <a key={r.url + r.title} href={r.url} className="flex items-center justify-between px-5 py-3 hover:bg-primary/5 transition-colors">
              <span>
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="block text-xs text-muted">{r.subtitle}</span>
              </span>
              <span className="text-[10px] uppercase text-muted">{r.type}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
