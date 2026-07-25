/**
 * FUGUSAU Portal — Global Search
 * Cmd/Ctrl+K command-palette style search across courses, departments and
 * library books, backed by the free Postgres full-text search endpoint
 * (GET /api/v1/search/) — no Elasticsearch cluster required.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { IconSearch, IconCourses, IconDepts, IconLibrary } from '@/components/icons'

interface SearchResult {
  type: 'course' | 'department' | 'book'
  id: string
  title: string
  subtitle: string
  url: string
  available?: boolean
}

const TYPE_ICON: Record<SearchResult['type'], any> = {
  course: IconCourses, department: IconDepts, book: IconLibrary,
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Cmd/Ctrl+K opens search from anywhere in the portal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]); setActiveIndex(0) }
  }, [open])

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/search/', { params: { q, limit: 6 } })
        setResults(Array.isArray(data?.results) ? data.results : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    setActiveIndex(0)
    runSearch(v)
  }

  const goTo = (r: SearchResult) => {
    setOpen(false)
    navigate(r.url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIndex]) goTo(results[activeIndex])
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Search"
        className="w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0">
        <IconSearch size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
             onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()}
               className="relative w-full max-w-lg glass-strong rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
              <IconSearch size={16} className="text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search courses, departments, library books…"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
              <kbd className="hidden sm:block text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">Esc</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-xs text-white/30">Searching…</div>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-white/30">No results for "{query}"</div>
              )}
              {!loading && query.trim().length < 2 && (
                <div className="px-4 py-6 text-center text-xs text-white/25">Type at least 2 characters…</div>
              )}
              {results.map((r, i) => {
                const Icon = TYPE_ICON[r.type] || IconSearch
                return (
                  <button key={`${r.type}-${r.id}`} onClick={() => goTo(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIndex ? 'bg-primary/15' : 'hover:bg-white/[0.04]'
                    }`}>
                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-light flex-shrink-0">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">{r.title}</span>
                      <span className="block text-[11px] text-white/40 truncate">{r.subtitle}</span>
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-white/25 flex-shrink-0">{r.type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
