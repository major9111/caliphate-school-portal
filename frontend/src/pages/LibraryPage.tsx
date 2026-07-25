/**
 * FUGUSAU Portal — Library (Full)
 *
 * GET  /library/              → book list (search, category filter)
 * GET  /library/categories/   → category list
 * GET  /library/my-borrows/   → student's borrow records
 * POST /library/borrow/       → { book_id, borrower_id, days } (admin/lecturer only)
 * POST /library/return/<pk>/  → return a book
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryAPI } from '@/services/api'
import { useRole } from '@/hooks/useRole'
import { formatDate, daysUntil } from '@/utils'
import toast from 'react-hot-toast'
import { MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

// ── Icons ──────────────────────────────────────────────────────
const IconLib     = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
const IconSearch  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconCheck   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconClock   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconWarning = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>

type Tab = 'browse' | 'borrowed'

const CAT_COLORS: Record<string,string> = {
  'Science':'#00A85A','Technology':'#3B82F6','Engineering':'#8B5CF6',
  'Mathematics':'#D4A017','Arts':'#EC4899','Law':'#EF4444',
  'Medicine':'#F97316','Business':'#06B6D4','Education':'#8B5CF6',
}

function BookCard({ book, onReturn, canReturn }: { book:any; onReturn?:(id:string)=>void; canReturn?:boolean }) {
  const color     = CAT_COLORS[book.category_name||book.category?.name] || '#888'
  const available = (book.available_copies||0) > 0

  return (
    <div className="glass glass-hover border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{background:`linear-gradient(90deg,${color},transparent)`}}/>

      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg capitalize"
          style={{background:`${color}18`,color,border:`1px solid ${color}30`}}>
          {book.category_name||book.category?.name||'General'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${
          available
            ? 'bg-primary/15 text-primary-light border-primary/25'
            : 'bg-red-500/15 text-red-400 border-red-500/25'
        }`}>
          {available ? `${book.available_copies} avail.` : 'Unavailable'}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-sm text-white leading-snug line-clamp-2 mb-1">{book.title}</h3>
        <p className="text-xs text-white/45 mb-0.5">{book.author}</p>
        {book.publisher && <p className="text-[11px] text-white/25">{book.publisher}{book.year?` · ${book.year}`:''}</p>}
        {book.shelf_location && (
          <p className="text-[11px] text-white/30 mt-1">Shelf: <span className="font-mono text-white/50">{book.shelf_location}</span></p>
        )}
        {book.isbn && (
          <p className="text-[11px] text-white/25 font-mono mt-0.5">ISBN: {book.isbn}</p>
        )}
      </div>

      <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          <IconLib size={11}/>
          <span>{book.total_copies} cop{book.total_copies!==1?'ies':'y'}</span>
        </div>
        {canReturn && onReturn && (
          <button onClick={()=>onReturn(book.id)}
            className="text-xs text-primary-light/70 hover:text-primary-light font-semibold flex items-center gap-1 transition-colors">
            <IconCheck size={12}/> Return
          </button>
        )}
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const { isAdmin, isLecturer } = useRole()
  const [tab,      setTab]      = useState<Tab>('browse')
  const [search,   setSearch]   = useState('')
  const [catFilter,setCatFilter]= useState('')
  const [page,     setPage]     = useState(1)
  const qc = useQueryClient()

  const { data: booksData, isLoading: loadBooks } = useQuery<any, any>({
    queryKey: ['books', search, catFilter, page],
    queryFn: () => libraryAPI.getBooks({
      search:   search   || undefined,
      category: catFilter|| undefined,
      page,
    }),
  })
  const { data: catsData } = useQuery<any, any>({
    queryKey: ['book-categories'],
    queryFn:  libraryAPI.getCategories,
  })
  const { data: borrowsData, isLoading: loadBorrows } = useQuery<any, any>({
    queryKey: ['my-borrows'],
    queryFn:  libraryAPI.getMyBorrows,
    enabled:  tab === 'borrowed',
  })

  const books:     any[] = booksData?.data?.results || booksData?.data || []
  const totalBooks:number = booksData?.data?.count   || books.length
  const categories:any[] = catsData?.data?.results  || catsData?.data || []
  const borrows:   any[] = borrowsData?.data?.results|| borrowsData?.data || []

  const overdue = borrows.filter(b => b.status==='overdue' || (b.status==='borrowed' && daysUntil(b.due_date)<0))

  const returnMut = useMutation({
    mutationFn: (recordId:string) => libraryAPI.returnBook(recordId),
    onSuccess: () => {
      toast.success('Book returned successfully!')
      qc.invalidateQueries({ queryKey:['my-borrows'] })
      qc.invalidateQueries({ queryKey:['books'] })
    },
    onError: (e:any) => toast.error(e?.response?.data?.error || 'Return failed. Contact the library.'),
  })

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <IconLib size={20} className="text-amber-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Library & eBooks</h2>
            <p className="text-xs text-white/40">{totalBooks.toLocaleString()} books in catalogue</p>
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="glass border border-red-500/25 rounded-2xl px-5 py-4 flex items-center gap-3">
          <IconWarning size={16} className="text-red-400 flex-shrink-0"/>
          <div>
            <p className="text-sm font-bold text-red-300">
              {overdue.length} overdue book{overdue.length!==1?'s':''}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Return overdue books to avoid fines. Fines accrue at ₦50/day.
            </p>
          </div>
          <button onClick={()=>setTab('borrowed')}
            className="ml-auto text-xs text-red-400/70 hover:text-red-400 font-bold transition-colors">
            View →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {([
          { key:'browse',   label:`Browse (${totalBooks})` },
          { key:'borrowed', label:`My Books (${borrows.length})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={()=>setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab===key ? 'bg-primary text-white' : 'text-white/45 hover:text-white/70'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {tab==='browse' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
                placeholder="Search title, author, ISBN…"
                className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
            </div>
            <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPage(1)}}
              className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
              <option value="">All Categories</option>
              {categories.map((c:any)=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {loadBooks ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({length:8}).map((_,i)=>(
                <div key={i} className="glass rounded-2xl h-52 skeleton"/>
              ))}
            </div>
          ) : books.length===0 ? (
            <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
              <IconLib size={48} className="text-white/15 mx-auto mb-4"/>
              <p className="text-white/40">
                {search ? `No books matching "${search}"` : 'No books in catalogue yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {books.map((book:any)=>(
                  <BookCard key={book.id} book={book}/>
                ))}
              </div>

              {/* Pagination */}
              {totalBooks > 20 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-white/40">{totalBooks} total books</p>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                      className="glass border border-white/[0.08] rounded-lg px-4 py-2 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors">
                      Previous
                    </button>
                    <span className="text-xs text-white/40 font-mono">
                      Page {page} of {Math.ceil(totalBooks/20)}
                    </span>
                    <button onClick={()=>setPage(p=>p+1)} disabled={!booksData?.data?.next}
                      className="glass border border-white/[0.08] rounded-lg px-4 py-2 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Library info */}
              <div className="glass border border-white/[0.06] rounded-xl px-5 py-3">
                <p className="text-[11px] text-white/25 leading-relaxed">
                  To borrow a book, visit the Library with your student ID and matric number.
                  A librarian will issue the book for a 14-day loan period.
                  Overdue fines: ₦50 per day. Library hours: Mon–Fri 8am–8pm, Sat 9am–5pm.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MY BORROWS TAB ── */}
      {tab==='borrowed' && (
        loadBorrows ? (
          <div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="glass rounded-xl h-16 skeleton"/>)}</div>
        ) : borrows.length===0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
            <IconLib size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">You have no borrowed books.</p>
            <button onClick={()=>setTab('browse')}
              className="mt-3 text-xs text-primary-light/70 hover:text-primary-light transition-colors">
              Browse catalogue →
            </button>
          </div>
        ) : (
          <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Mobile card list */}
            <div className="md:hidden p-3 flex flex-col gap-2.5">
              <MobileListMeta>{borrows.length} borrows</MobileListMeta>
              {borrows.map((b: any) => {
                const days = daysUntil(b.due_date)
                const isOver = b.status === 'overdue' || (b.status === 'borrowed' && days < 0)
                const returned = b.status === 'returned'
                return (
                  <MobileRow
                    key={b.id}
                    chevron={false}
                    leading={<IconLib size={16} />}
                    leadingClassName={returned ? 'bg-primary/15 text-primary-light' : isOver ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}
                    title={b.book_title}
                    subtitle={b.book_author}
                    caption={
                      returned
                        ? `Returned ${formatDate(b.returned_at, true)}`
                        : `Due ${formatDate(b.due_date, true)} · ${isOver ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `${days}d left`}`
                    }
                    badge={{
                      label: returned ? 'Returned' : isOver ? 'Overdue' : 'Borrowed',
                      className: returned ? 'bg-primary/15 text-primary-light' : isOver ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400',
                    }}
                    footer={
                      <>
                        {b.fine_amount > 0 && (
                          <span className={`text-[11px] font-bold px-3 py-1.5 ${b.fine_paid ? 'text-primary-light' : 'text-red-400'}`}>
                            Fine: ₦{b.fine_amount.toLocaleString()}{b.fine_paid ? ' (paid)' : ''}
                          </span>
                        )}
                        {!returned && (
                          <MobileMiniAction label="Return" icon={<IconCheck size={11} />} onClick={() => returnMut.mutate(b.id)} />
                        )}
                      </>
                    }
                  />
                )
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    {['Book','Borrowed','Due Date','Status','Fine','Action'].map(h=>(
                      <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Fine'].includes(h)?'text-right':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {borrows.map((b:any)=>{
                    const days    = daysUntil(b.due_date)
                    const isOver  = b.status==='overdue' || (b.status==='borrowed' && days<0)
                    const returned= b.status==='returned'

                    return (
                      <tr key={b.id} className={`hover:bg-white/[0.02] transition-colors ${isOver?'bg-red-500/[0.03]':''}`}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-xs text-white line-clamp-1">{b.book_title}</p>
                          <p className="text-[11px] text-white/35 mt-0.5">{b.book_author}</p>
                        </td>
                        <td className="px-5 py-4 text-xs text-white/40">
                          {formatDate(b.borrowed_at, true)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-white/60">{formatDate(b.due_date, true)}</p>
                          {!returned && (
                            <p className={`text-[11px] font-bold mt-0.5 ${
                              isOver ? 'text-red-400' : days<=3 ? 'text-amber-400' : 'text-white/30'
                            }`}>
                              {isOver ? `${Math.abs(days)}d overdue` : days===0 ? 'Due today!' : `${days}d left`}
                            </p>
                          )}
                          {returned && b.returned_at && (
                            <p className="text-[11px] text-white/30 mt-0.5">
                              Returned {formatDate(b.returned_at, true)}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize flex items-center gap-1 w-fit ${
                            returned  ? 'bg-primary/15 text-primary-light border-primary/25' :
                            isOver    ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                            days<=3   ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                                        'bg-blue-500/15 text-blue-400 border-blue-500/25'
                          }`}>
                            {returned ? <><IconCheck size={10}/>Returned</> :
                             isOver   ? <><IconWarning size={10}/>Overdue</> :
                                        <><IconClock size={10}/>Borrowed</>}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {b.fine_amount > 0 ? (
                            <span className={`text-sm font-bold ${b.fine_paid?'text-primary-light':'text-red-400'}`}>
                              ₦{b.fine_amount.toLocaleString()}
                              {b.fine_paid && <span className="text-[10px] ml-1 text-white/30">paid</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-white/25">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {!returned && (
                            <button onClick={()=>returnMut.mutate(b.id)}
                              disabled={returnMut.isPending}
                              className="text-xs text-primary-light/70 hover:text-primary-light font-semibold flex items-center gap-1 transition-colors disabled:opacity-40">
                              <IconCheck size={12}/> Return
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
