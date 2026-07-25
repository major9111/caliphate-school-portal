/**
 * FUGUSAU Admin — Library Management (Full CRUD)
 *
 * Tabs:
 *   Books      — list + Add / Edit / Delete book modal
 *   Categories — add / delete categories
 *   Borrows    — active loans + return action
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { MobileToolbar, MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

/* ── Icons ──────────────────────────────────────────────────── */
const Ic = {
  Book:   (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  Plus:   (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit:   (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:  (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Search: (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Return: (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 100-.49"/></svg>,
  X:      (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Globe:  (p:any)=><svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Warn:   (p:any)=><svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}

const inputCls  = "glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder-white/25"
const selectCls = "glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 bg-transparent"

const STATUS_CLS: Record<string,string> = {
  available:   'bg-primary/15 text-primary-light border-primary/25',
  borrowed:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  reserved:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  maintenance: 'bg-white/10 text-white/40 border-white/15',
}
const BORROW_CLS: Record<string,string> = {
  borrowed: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  returned: 'bg-primary/15 text-primary-light border-primary/25',
  overdue:  'bg-red-500/15 text-red-400 border-red-500/25',
}

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)' }}>
      <div className="glass border border-white/[0.1] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h3 className="font-extrabold text-white text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
            <Ic.X size={14} className="text-white/60"/>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const EMPTY_BOOK = {
  title:'', author:'', isbn:'', category:'', publisher:'',
  edition:'', year:'', total_copies:'1', shelf_location:'', description:'',
}

export default function AdminLibraryPage() {
  const qc = useQueryClient()
  const [tab, setTab]       = useState<'books'|'categories'|'borrows'>('books')
  const [search, setSearch] = useState('')
  const [bookModal, setBookModal]     = useState<null|'add'|any>(null)
  const [deleteBook, setDeleteBook]   = useState<null|{id:string;title:string}>(null)
  const [deleteCat, setDeleteCat]     = useState<null|{id:string;name:string}>(null)
  const [catName, setCatName]         = useState('')
  const [catDesc, setCatDesc]         = useState('')
  const [bForm, setBForm]             = useState({...EMPTY_BOOK})
  const [coverFile, setCoverFile]     = useState<File|null>(null)
  const [importTab, setImportTab]     = useState<'manual'|'online'>('manual')
  const [gSearch, setGSearch]         = useState('')
  const [gResults, setGResults]       = useState<any[]>([])
  const [gLoading, setGLoading]       = useState(false)
  const [returningId, setReturningId] = useState<string|null>(null)

  /* ── Queries ─────────────────────────────────────────────── */
  const { data: booksData, isLoading: bLoad } = useQuery<any, any>({
    queryKey: ['admin-books', search],
    queryFn:  () => libraryAPI.getBooks({ search: search||undefined }),
  })
  const { data: catsData } = useQuery<any, any>({
    queryKey: ['book-categories'],
    queryFn:  libraryAPI.getCategories,
  })
  const { data: borrowsData, isLoading: brLoad } = useQuery<any, any>({
    queryKey: ['admin-borrows'],
    queryFn:  libraryAPI.getAllBorrows,
    enabled:  tab === 'borrows',
  })

  const books:   any[] = booksData?.data?.results   ?? booksData?.data   ?? []
  const cats:    any[] = catsData?.data?.results    ?? catsData?.data    ?? []
  const borrows: any[] = borrowsData?.data?.results ?? borrowsData?.data ?? []

  const filtered = books.filter(b =>
    !search ||
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn?.includes(search)
  )

  /* ── Mutations ───────────────────────────────────────────── */
  const inv = (keys: string[][]) => keys.forEach(k => qc.invalidateQueries({ queryKey: k }))

  const createBook = useMutation({
    mutationFn: (fd: FormData) => libraryAPI.createBook(fd),
    onSuccess: () => { toast.success('Book added!'); inv([['admin-books']]); setBookModal(null) },
    onError: (e:any) => toast.error(e?.response?.data?.title?.[0] || e?.response?.data?.isbn?.[0] || 'Failed to add book.'),
  })
  const updateBook = useMutation({
    mutationFn: ({id, fd}:{id:string;fd:FormData}) => libraryAPI.updateBook(id, fd),
    onSuccess: () => { toast.success('Book updated!'); inv([['admin-books']]); setBookModal(null) },
    onError: () => toast.error('Failed to update book.'),
  })
  const deleteBookMut = useMutation({
    mutationFn: (id:string) => libraryAPI.deleteBook(id),
    onSuccess: () => { toast.success('Book deleted.'); inv([['admin-books']]); setDeleteBook(null) },
    onError: () => toast.error('Failed to delete book.'),
  })
  const createCat = useMutation({
    mutationFn: () => libraryAPI.createCategory({ name: catName, description: catDesc }),
    onSuccess: () => { toast.success('Category added!'); inv([['book-categories']]); setCatName(''); setCatDesc('') },
    onError: (e:any) => { const d = e?.response?.data; toast.error(d?.name?.[0] || d?.detail || d?.error || JSON.stringify(d) || 'Failed to add category.') },
  })
  const deleteCatMut = useMutation({
    mutationFn: (id:string) => libraryAPI.deleteCategory(id),
    onSuccess: () => { toast.success('Category deleted.'); inv([['book-categories']]); setDeleteCat(null) },
    onError: () => toast.error('Failed to delete category.'),
  })
  const returnMut = useMutation({
    mutationFn: (id:string) => libraryAPI.returnBook(id),
    onMutate:   (id) => setReturningId(id),
    onSettled:  ()  => setReturningId(null),
    onSuccess: () => { toast.success('Book returned.'); inv([['admin-borrows'],['admin-books']]) },
    onError: () => toast.error('Failed to process return.'),
  })

  /* ── Book form helpers ───────────────────────────────────── */
  const openAdd  = () => { setBForm({...EMPTY_BOOK}); setCoverFile(null); setImportTab('manual'); setGSearch(''); setGResults([]); setBookModal('add') }
  const openEdit = (b:any) => { setImportTab('manual'); setGSearch(''); setGResults([]);
    setBForm({
      title: b.title||'', author: b.author||'', isbn: b.isbn||'',
      category: b.category||'', publisher: b.publisher||'',
      edition: b.edition||'', year: String(b.year||''),
      total_copies: String(b.total_copies||1),
      shelf_location: b.shelf_location||'', description: b.description||'',
    })
    setCoverFile(null)
    setBookModal(b)
  }

  // Google Books API search — no API key needed for basic search
  const searchGoogleBooks = async () => {
    if (!gSearch.trim()) return
    setGLoading(true)
    setGResults([])
    try {
      const q   = encodeURIComponent(gSearch.trim())
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=12&printType=books`)
      const data = await res.json()
      setGResults(data.items || [])
    } catch {
      toast.error('Google Books search failed.')
    } finally {
      setGLoading(false)
    }
  }

  const importGoogleBook = (item: any) => {
    const info = item.volumeInfo || {}
    setBForm({
      title:         info.title || '',
      author:        (info.authors || []).join(', '),
      isbn:          (info.industryIdentifiers || []).find((i:any) => i.type === 'ISBN_13')?.identifier ||
                     (info.industryIdentifiers || []).find((i:any) => i.type === 'ISBN_10')?.identifier || '',
      category:      bForm.category,
      publisher:     info.publisher || '',
      edition:       '',
      year:          String(info.publishedDate?.split('-')[0] || ''),
      total_copies:  '1',
      shelf_location:'',
      description:   info.description?.slice(0, 500) || '',
    })
    setGResults([])
    setGSearch('')
    setImportTab('manual')
    toast.success(`"${info.title}" imported — review details and save.`)
  }

  const buildFormData = () => {
    const fd = new FormData()
    Object.entries(bForm).forEach(([k,v]) => { if (v !== '') fd.append(k, v) })
    if (coverFile) fd.append('cover_image', coverFile)
    return fd
  }

  const submitBook = () => {
    const fd = buildFormData()
    if (bookModal === 'add') createBook.mutate(fd)
    else updateBook.mutate({ id: bookModal.id, fd })
  }

  /* ── Stats ───────────────────────────────────────────────── */
  const available     = books.filter(b => b.status === 'available').length
  const activeBorrows = borrows.filter(b => b.status === 'borrowed').length
  const overdue       = borrows.filter(b => b.status === 'overdue').length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Ic.Book size={20} className="text-primary-light"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Library Management</h2>
            <p className="text-xs text-white/40">{books.length} books · {cats.length} categories</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/library/import"
            className="glass border border-primary/30 rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 text-primary-light hover:bg-primary/10 transition-colors">
            <Ic.Globe size={16}/> Import Online
          </Link>
          <button onClick={openAdd}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 text-white">
            <Ic.Plus size={16}/> Add Book
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Books',  value:books.length,  accent:'#00A85A' },
          { label:'Available',    value:available,     accent:'#3B82F6' },
          { label:'On Loan',      value:activeBorrows, accent:'#D4A017' },
          { label:'Overdue',      value:overdue,       accent:'#EF4444' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {(['books','categories','borrows'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab===t?'bg-primary text-white':'text-white/45 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── BOOKS TAB ────────────────────────────────────────── */}
      {tab==='books' && (
        <div className="space-y-4">
          <div className="md:hidden">
            <MobileToolbar search={search} onSearchChange={setSearch} placeholder="Search title, author, ISBN…" />
          </div>
          <div className="hidden md:block relative max-w-sm">
            <Ic.Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search title, author, ISBN…"
              className={inputCls+' pl-9'}/>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {bLoad ? (
              <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
            ) : filtered.length === 0 ? (
              <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
                <Ic.Book size={40} className="text-white/10 mx-auto mb-3"/>
                <p className="text-white/40 text-sm mb-4">No books yet.</p>
                <button onClick={openAdd} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2">
                  <Ic.Plus size={14}/> Add First Book
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <MobileListMeta>{filtered.length} books</MobileListMeta>
                {filtered.map((b: any) => (
                  <MobileRow
                    key={b.id}
                    chevron={false}
                    leading={<Ic.Book size={16} />}
                    leadingClassName="bg-primary/15 text-primary-light"
                    title={b.title}
                    subtitle={`${b.author} · ${b.category_name || 'Uncategorized'}`}
                    caption={`${b.isbn || 'No ISBN'} · ${b.available_copies}/${b.total_copies} available`}
                    badge={{ label: b.status, className: `capitalize ${STATUS_CLS[b.status] ?? ''}` }}
                    footer={
                      <>
                        <MobileMiniAction label="Edit" icon={<Ic.Edit size={11} />} className="bg-white/[0.06] text-white/60" onClick={() => openEdit(b)} />
                        <MobileMiniAction label="Delete" icon={<Ic.Trash size={11} />} className="bg-red-500/15 text-red-400" onClick={() => setDeleteBook({ id: b.id, title: b.title })} />
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
            {bLoad?(
              <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
            ):filtered.length===0?(
              <div className="p-16 text-center">
                <Ic.Book size={40} className="text-white/10 mx-auto mb-3"/>
                <p className="text-white/40 text-sm mb-4">No books yet.</p>
                <button onClick={openAdd} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2">
                  <Ic.Plus size={14}/> Add First Book
                </button>
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                      {['Title','Author','ISBN','Category','Copies','Status',''].map(h=>(
                        <th key={h} className="px-5 py-3.5 font-semibold text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered.map((b:any)=>(
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-xs text-white truncate max-w-[160px]">{b.title}</div>
                          <div className="text-[11px] text-white/30">{b.shelf_location}</div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-white/60">{b.author}</td>
                        <td className="px-5 py-3.5 text-xs font-mono text-white/40">{b.isbn||'—'}</td>
                        <td className="px-5 py-3.5 text-xs text-white/50">{b.category_name||'—'}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-white/70">{b.available_copies}/{b.total_copies}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_CLS[b.status]??''}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button onClick={()=>openEdit(b)}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-primary/20 flex items-center justify-center transition-colors group">
                              <Ic.Edit size={12} className="text-white/40 group-hover:text-primary-light"/>
                            </button>
                            <button onClick={()=>setDeleteBook({id:b.id,title:b.title})}
                              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center transition-colors group">
                              <Ic.Trash size={12} className="text-white/40 group-hover:text-red-400"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ───────────────────────────────────── */}
      {tab==='categories' && (
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Add category form */}
          <div className="glass border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white">Add Category</h3>
            <Field label="Category Name">
              <input value={catName} onChange={e=>setCatName(e.target.value)}
                className={inputCls} placeholder="e.g. Science & Technology"/>
            </Field>
            <Field label="Description (optional)">
              <input value={catDesc} onChange={e=>setCatDesc(e.target.value)}
                className={inputCls} placeholder="Brief description…"/>
            </Field>
            <button onClick={()=>createCat.mutate()}
              disabled={!catName||createCat.isPending}
              className="w-full btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
              <Ic.Plus size={14}/>{createCat.isPending?'Adding…':'Add Category'}
            </button>
          </div>

          {/* Category list */}
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-sm text-white">All Categories ({cats.length})</h3>
            </div>
            {cats.length===0?(
              <div className="p-10 text-center"><p className="text-white/40 text-sm">No categories yet.</p></div>
            ):(
              <div className="divide-y divide-white/[0.04]">
                {cats.map((c:any)=>(
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-semibold text-sm text-white">{c.name}</p>
                      {c.description&&<p className="text-xs text-white/40">{c.description}</p>}
                    </div>
                    <button onClick={()=>setDeleteCat({id:c.id,name:c.name})}
                      className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center transition-colors group">
                      <Ic.Trash size={12} className="text-white/40 group-hover:text-red-400"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BORROWS TAB ──────────────────────────────────────── */}
      {tab==='borrows' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          {brLoad?(
            <div className="p-8 space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 skeleton rounded-xl"/>)}</div>
          ):borrows.length===0?(
            <div className="p-16 text-center">
              <Ic.Book size={40} className="text-white/10 mx-auto mb-3"/>
              <p className="text-white/40 text-sm">No borrow records.</p>
            </div>
          ):(
            <div className="divide-y divide-white/[0.04]">
              {borrows.map((b:any)=>(
                <div key={b.id} className={`flex items-center justify-between px-5 py-4 ${b.status==='overdue'?'bg-red-500/[0.04]':''}`}>
                  <div>
                    <p className="font-semibold text-sm text-white">{b.book_title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {b.borrower_name} · Due: {b.due_date?.slice(0,10)}
                    </p>
                    {b.fine_amount>0&&(
                      <p className="text-[11px] text-red-400 mt-0.5">
                        Fine: ₦{Number(b.fine_amount).toLocaleString()} {b.fine_paid?'(paid)':'(unpaid)'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${BORROW_CLS[b.status]??''}`}>
                      {b.status}
                    </span>
                    {b.status==='borrowed'&&(
                      <button onClick={()=>returnMut.mutate(b.id)} disabled={returningId===b.id}
                        className="text-[11px] text-primary-light font-bold flex items-center gap-1 disabled:opacity-40">
                        <Ic.Return size={11}/>{returningId===b.id?'…':'Return'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* Add / Edit Book */}
      {bookModal!==null&&(
        <Modal title={bookModal==='add'?'Add New Book':'Edit Book'} onClose={()=>setBookModal(null)}>
          {/* Online / Manual toggle */}
          <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] mb-2">
            {(['manual','online'] as const).map(t => (
              <button key={t} onClick={() => setImportTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all flex items-center justify-center gap-1.5 ${
                  importTab===t ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
                }`}>
                {t === 'online' ? <Ic.Search size={12}/> : <Ic.Edit size={12}/>}
                <span>{t === 'online' ? 'Search Online (Google Books)' : 'Manual Entry'}</span>
              </button>
            ))}
          </div>

          {/* Online search panel */}
          {importTab === 'online' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={gSearch}
                  onChange={e => setGSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGoogleBooks()}
                  className={inputCls + ' flex-1'} placeholder="Search by title, author, ISBN…"/>
                <button onClick={searchGoogleBooks} disabled={gLoading || !gSearch.trim()}
                  className="btn-primary rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex-shrink-0">
                  {gLoading ? '…' : 'Search'}
                </button>
              </div>
              {gLoading && (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({length:4}).map((_,i) => <div key={i} className="h-24 skeleton rounded-xl"/>)}
                </div>
              )}
              {gResults.length > 0 && (
                <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {gResults.map((item:any) => {
                    const info = item.volumeInfo || {}
                    const thumb = info.imageLinks?.smallThumbnail || info.imageLinks?.thumbnail
                    return (
                      <button key={item.id} onClick={() => importGoogleBook(item)}
                        className="text-left glass border border-white/[0.07] hover:border-primary/40 rounded-xl p-3 flex gap-2.5 transition-all group">
                        {thumb ? (
                          <img src={thumb} alt={info.title}
                            className="w-10 h-14 object-cover rounded-lg flex-shrink-0 shadow-md"/>
                        ) : (
                          <div className="w-10 h-14 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center">
                            <Ic.Book size={14} className="text-primary-light/40"/>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white leading-tight line-clamp-2 group-hover:text-primary-light transition-colors">
                            {info.title}
                          </p>
                          <p className="text-[10px] text-white/40 mt-1 line-clamp-1">
                            {(info.authors||[]).join(', ')}
                          </p>
                          <p className="text-[10px] text-white/25 mt-0.5">
                            {info.publishedDate?.split('-')[0]}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {!gLoading && gSearch && gResults.length === 0 && (
                <p className="text-xs text-white/40 text-center py-4">No results. Try a different search.</p>
              )}
              <p className="text-[10px] text-white/25 text-center">
                Powered by Google Books API · Click a book to auto-fill the form
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Field label="Title *">
              <input value={bForm.title} onChange={e=>setBForm(f=>({...f,title:e.target.value}))}
                className={inputCls} placeholder="Book title"/>
            </Field>
            <Field label="Author *">
              <input value={bForm.author} onChange={e=>setBForm(f=>({...f,author:e.target.value}))}
                className={inputCls} placeholder="Author name"/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ISBN">
                <input value={bForm.isbn} onChange={e=>setBForm(f=>({...f,isbn:e.target.value}))}
                  className={inputCls} placeholder="978-…"/>
              </Field>
              <Field label="Category">
                <select value={bForm.category} onChange={e=>setBForm(f=>({...f,category:e.target.value}))} className={selectCls}>
                  <option value="">Select…</option>
                  {cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Publisher">
                <input value={bForm.publisher} onChange={e=>setBForm(f=>({...f,publisher:e.target.value}))}
                  className={inputCls} placeholder="Publisher"/>
              </Field>
              <Field label="Edition">
                <input value={bForm.edition} onChange={e=>setBForm(f=>({...f,edition:e.target.value}))}
                  className={inputCls} placeholder="e.g. 3rd"/>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year">
                <input type="number" value={bForm.year} onChange={e=>setBForm(f=>({...f,year:e.target.value}))}
                  className={inputCls} placeholder="2023"/>
              </Field>
              <Field label="Total Copies">
                <input type="number" min="1" value={bForm.total_copies}
                  onChange={e=>setBForm(f=>({...f,total_copies:e.target.value}))}
                  className={inputCls} placeholder="1"/>
              </Field>
            </div>
            <Field label="Shelf Location">
              <input value={bForm.shelf_location} onChange={e=>setBForm(f=>({...f,shelf_location:e.target.value}))}
                className={inputCls} placeholder="e.g. A-12"/>
            </Field>
            <Field label="Description">
              <textarea value={bForm.description} onChange={e=>setBForm(f=>({...f,description:e.target.value}))}
                rows={3} className={inputCls+' resize-none'} placeholder="Brief description…"/>
            </Field>
            <Field label="Cover Image (optional)">
              <input type="file" accept="image/*"
                onChange={e=>setCoverFile(e.target.files?.[0]||null)}
                className="text-xs text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 cursor-pointer w-full"/>
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setBookModal(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white/50 glass border border-white/[0.07] hover:bg-white/[0.05] transition-colors">
                Cancel
              </button>
              <button onClick={submitBook}
                disabled={!bForm.title||!bForm.author||(createBook.isPending||updateBook.isPending)}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {(createBook.isPending||updateBook.isPending)?'Saving…':bookModal==='add'?'Add Book':'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Book */}
      {deleteBook&&(
        <Modal title="Delete Book" onClose={()=>setDeleteBook(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20">
              <Ic.Warn size={18} className="text-red-400 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-white/70">
                Delete <span className="font-bold text-white">"{deleteBook.title}"</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteBook(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white/50 glass border border-white/[0.07]">
                Cancel
              </button>
              <button onClick={()=>deleteBookMut.mutate(deleteBook.id)} disabled={deleteBookMut.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-50">
                {deleteBookMut.isPending?'Deleting…':'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Category */}
      {deleteCat&&(
        <Modal title="Delete Category" onClose={()=>setDeleteCat(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20">
              <Ic.Warn size={18} className="text-red-400 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-white/70">
                Delete category <span className="font-bold text-white">"{deleteCat.name}"</span>? Books in this category will be uncategorised.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteCat(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white/50 glass border border-white/[0.07]">
                Cancel
              </button>
              <button onClick={()=>deleteCatMut.mutate(deleteCat.id)} disabled={deleteCatMut.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-50">
                {deleteCatMut.isPending?'Deleting…':'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
