/**
 * FUGUSAU — Book Import Tool
 * Search Google Books and Open Library, import directly to the portal
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryAPI } from '@/services/api'
import toast from 'react-hot-toast'

const Ic = {
  Search: (p:any) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus:   (p:any) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check:  (p:any) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>,
  Book:   (p:any) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  Globe:  (p:any) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  X:      (p:any) => <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

const inputCls = "glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50"

interface BookResult {
  id: string
  title: string
  authors: string[]
  isbn: string
  publisher: string
  year: string
  description: string
  thumbnail: string
  source: 'google' | 'openlibrary'
  pages?: number
}

export default function BookImportPage() {
  const qc = useQueryClient()
  const [query, setQuery]         = useState('')
  const [source, setSource]       = useState<'google'|'openlibrary'>('google')
  const [results, setResults]     = useState<BookResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [imported, setImported]   = useState<Set<string>>(new Set())
  const [copies, setCopies]       = useState('1')
  const [categoryId, setCategoryId] = useState('')

  const { data: catsData } = useQuery<any, any>({
    queryKey: ['book-categories'],
    queryFn:  libraryAPI.getCategories,
  })
  const cats: any[] = catsData?.data?.results || catsData?.data || []

  // ── Search Google Books ───────────────────────────────────
  const searchGoogle = async (): Promise<BookResult[]> => {
    const q   = encodeURIComponent(query.trim())
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=20&printType=books&langRestrict=en`)
    const data = await res.json()
    return (data.items || []).map((item: any) => {
      const info = item.volumeInfo || {}
      return {
        id:          item.id,
        title:       info.title || 'Unknown Title',
        authors:     info.authors || ['Unknown Author'],
        isbn:        info.industryIdentifiers?.find((i:any) => i.type === 'ISBN_13')?.identifier ||
                     info.industryIdentifiers?.find((i:any) => i.type === 'ISBN_10')?.identifier || '',
        publisher:   info.publisher || '',
        year:        info.publishedDate?.split('-')[0] || '',
        description: (info.description || '').slice(0, 600),
        thumbnail:   info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '',
        pages:       info.pageCount,
        source:      'google' as const,
      }
    })
  }

  // ── Search Open Library ───────────────────────────────────
  const searchOpenLibrary = async (): Promise<BookResult[]> => {
    const q   = encodeURIComponent(query.trim())
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=20&fields=key,title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,subject`)
    const data = await res.json()
    return (data.docs || []).map((doc: any, i: number) => ({
      id:          doc.key || String(i),
      title:       doc.title || 'Unknown Title',
      authors:     doc.author_name || ['Unknown Author'],
      isbn:        (doc.isbn || [])[0] || '',
      publisher:   (doc.publisher || [])[0] || '',
      year:        String(doc.first_publish_year || ''),
      description: '',
      thumbnail:   doc.isbn?.[0] ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg` : '',
      pages:       doc.number_of_pages_median,
      source:      'openlibrary' as const,
    }))
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    setSelected(new Set())
    try {
      const data = source === 'google' ? await searchGoogle() : await searchOpenLibrary()
      setResults(data)
      if (data.length === 0) toast('No results found. Try different keywords.')
    } catch {
      toast.error('Search failed. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(results.map(r => r.id)))
  const clearAll  = () => setSelected(new Set())

  // ── Import selected books ─────────────────────────────────
  const handleImport = async () => {
    const toImport = results.filter(r => selected.has(r.id))
    if (!toImport.length) { toast.error('Select at least one book.'); return }
    setImporting(true)
    let success = 0, fail = 0
    for (const book of toImport) {
      try {
        const fd = new FormData()
        fd.append('title',         book.title)
        fd.append('author',        book.authors.join(', '))
        fd.append('isbn',          book.isbn)
        fd.append('publisher',     book.publisher)
        fd.append('year',          book.year)
        fd.append('description',   book.description)
        fd.append('total_copies',  copies)
        if (categoryId) fd.append('category', categoryId)
        await libraryAPI.createBook(fd)
        setImported(prev => new Set([...prev, book.id]))
        success++
      } catch {
        fail++
      }
    }
    setImporting(false)
    qc.invalidateQueries({ queryKey: ['admin-books'] })
    if (success) toast.success(`${success} book${success > 1 ? 's' : ''} imported successfully!`)
    if (fail)    toast.error(`${fail} book${fail > 1 ? 's' : ''} failed to import.`)
    setSelected(new Set())
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Ic.Globe size={20} className="text-primary-light"/>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Import Books Online</h2>
          <p className="text-xs text-white/40">Search Google Books or Open Library and import directly</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-4">
        {/* Source toggle */}
        <div className="flex gap-2">
          {(['google','openlibrary'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                source === s ? 'bg-primary text-white' : 'glass border border-white/[0.07] text-white/50 hover:text-white/70'
              }`}>
              {s === 'google' ? <Ic.Globe size={13}/> : <Ic.Book size={13}/>}
              {s === 'google' ? 'Google Books' : 'Open Library'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Ic.Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by title, author, ISBN, subject…"
              className={inputCls + ' pl-9'}
            />
          </div>
          <button onClick={handleSearch} disabled={loading || !query.trim()}
            className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
            <Ic.Search size={14}/>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Import options */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Category:</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="glass-input rounded-lg px-3 py-1.5 text-xs text-white bg-transparent focus:outline-none">
              <option value="">Uncategorised</option>
              {cats.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Copies per book:</label>
            <input type="number" min="1" max="99" value={copies}
              onChange={e => setCopies(e.target.value)}
              className="glass-input rounded-lg px-3 py-1.5 text-xs text-white w-16 text-center focus:outline-none"/>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({length:8}).map((_,i) => (
            <div key={i} className="glass rounded-2xl h-52 skeleton"/>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-white/50">
              <span className="text-white font-bold">{results.length}</span> results ·{' '}
              <span className="text-primary-light font-bold">{selected.size}</span> selected
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll}
                className="glass border border-white/[0.07] rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors">
                Select All
              </button>
              <button onClick={clearAll}
                className="glass border border-white/[0.07] rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors">
                Clear
              </button>
              <button onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="btn-primary rounded-xl px-5 py-2 text-xs font-bold text-white disabled:opacity-40 flex items-center gap-2">
                <Ic.Plus size={12}/>
                {importing ? 'Importing…' : `Import ${selected.size > 0 ? selected.size : ''} Book${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Book grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map(book => {
              const isSelected = selected.has(book.id)
              const isDone     = imported.has(book.id)
              return (
                <button key={book.id} onClick={() => !isDone && toggle(book.id)}
                  disabled={isDone}
                  className={`text-left glass rounded-2xl overflow-hidden border transition-all ${
                    isDone      ? 'border-primary/40 opacity-60 cursor-default' :
                    isSelected  ? 'border-primary-light bg-primary/10' :
                                  'border-white/[0.07] hover:border-primary/40'
                  }`}>
                  {/* Cover */}
                  <div className="relative aspect-[3/4] bg-primary/5">
                    {book.thumbnail ? (
                      <img src={book.thumbnail} alt={book.title}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ic.Book size={32} className="text-white/10"/>
                      </div>
                    )}
                    {/* Selection indicator */}
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDone     ? 'bg-primary border-primary' :
                      isSelected ? 'bg-primary border-primary-light' :
                                   'bg-black/40 border-white/30'
                    }`}>
                      {(isSelected || isDone) && <Ic.Check size={10} className="text-white"/>}
                    </div>
                    {/* Source badge */}
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/60">
                        {book.source === 'google' ? 'G' : 'OL'}
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white leading-tight line-clamp-2">{book.title}</p>
                    <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{book.authors[0]}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-white/25">{book.year}</span>
                      {book.isbn && <span className="text-[9px] text-white/20 font-mono">{book.isbn.slice(-4)}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Bottom import bar */}
          {selected.size > 0 && (
            <div className="sticky bottom-4 glass border border-primary/25 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg"
              style={{ backdropFilter:'blur(12px)' }}>
              <p className="text-sm text-white/70">
                <span className="text-white font-bold">{selected.size}</span> book{selected.size !== 1 ? 's' : ''} selected
                {categoryId && cats.find((c:any) => c.id === categoryId) &&
                  <> · Category: <span className="text-primary-light">{cats.find((c:any) => c.id === categoryId)?.name}</span></>
                }
                {' '}· <span className="text-white/50">{copies} cop{Number(copies)===1?'y':'ies'} each</span>
              </p>
              <button onClick={handleImport} disabled={importing}
                className="btn-primary rounded-xl px-8 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
                <Ic.Plus size={14}/>
                {importing ? 'Importing…' : 'Import to Library'}
              </button>
            </div>
          )}
        </>
      )}

      {!loading && results.length === 0 && query && (
        <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
          <Ic.Globe size={40} className="text-white/10 mx-auto mb-4"/>
          <p className="text-white/40">Search for books above to import them.</p>
          <p className="text-white/25 text-xs mt-2">Try: "Introduction to Algorithms", "Chimamanda Ngozi", or an ISBN</p>
        </div>
      )}

      {!loading && results.length === 0 && !query && (
        <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
          <Ic.Globe size={40} className="text-white/10 mx-auto mb-4"/>
          <p className="text-white/40 mb-2">Search millions of books from Google Books or Open Library</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['Data Structures', 'Nigerian History', 'Engineering Mathematics', 'Computer Science', 'Biochemistry'].map(s => (
              <button key={s} onClick={() => { setQuery(s); }}
                className="glass border border-white/[0.07] rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-primary-light hover:border-primary/30 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
