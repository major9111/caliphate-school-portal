import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { DataTable } from '@/components/ui/data-table'
import { toast } from '@/components/ui/toast'
import { Plus, BookOpen, RotateCcw, AlertTriangle, Send, Search, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi, libraryOverdueApi, type Book } from '@/lib/api'
import { isAxiosError } from 'axios'

const PAGE_SIZE = 20
const emptyBookForm = { title: '', author: '', isbn: '', category: '', total_copies: 1 }

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'transactions' | 'overdue'>('books')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editBookForm, setEditBookForm] = useState(emptyBookForm)
  const [bookForm, setBookForm] = useState(emptyBookForm)
  const [issueForm, setIssueForm] = useState({ book_id: '', student_id: '', student_name: '', due_date: '' })
  const qc = useQueryClient()

  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['library-books', search, page],
    queryFn: () => libraryApi.getBooks({ page, limit: PAGE_SIZE, search: search || undefined }),
  })
  const { data: transData, isLoading: transLoading } = useQuery({
    queryKey: ['library-transactions'],
    queryFn: () => libraryApi.getTransactions(),
    enabled: tab === 'transactions',
  })
  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['library-overdue'],
    queryFn: () => libraryOverdueApi.list(),
    enabled: tab === 'overdue',
  })

  const addBook = useMutation({
    mutationFn: libraryApi.addBook,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); setBookModalOpen(false); setBookForm(emptyBookForm); toast('Book added', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed' : 'Failed', 'error'),
  })
  const updateBook = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Book> }) => libraryApi.updateBook(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); setEditingBook(null); toast('Book updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to update book' : 'Failed to update book', 'error'),
  })
  const deleteBook = useMutation({
    mutationFn: libraryApi.deleteBook,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); toast('Book removed', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Failed to delete book' : 'Failed to delete book', 'error'),
  })
  const issueBook = useMutation({
    mutationFn: libraryApi.issueBook,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books', 'library-transactions'] }); setIssueModalOpen(false); setIssueForm({ book_id: '', student_id: '', student_name: '', due_date: '' }); toast('Book issued', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'No copies available' : 'Failed', 'error'),
  })
  const returnBook = useMutation({
    mutationFn: libraryApi.returnBook,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books', 'library-transactions', 'library-overdue'] }); toast('Book returned', 'success') },
    onError: () => toast('Failed to return book', 'error'),
  })
  const sendReminders = useMutation({
    mutationFn: libraryOverdueApi.sendReminders,
    onSuccess: (d) => toast((d as { message: string }).message, 'success'),
    onError: () => toast('Failed to send reminders', 'error'),
  })

  const books = booksData?.items || []
  const transactions = transData?.items || []
  const overdue = overdueData?.items || []

  const openEditBook = (b: Book) => {
    setEditingBook(b)
    setEditBookForm({ title: b.title, author: b.author, isbn: b.isbn || '', category: b.category, total_copies: b.total_copies })
  }

  const handleEditBookSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return
    updateBook.mutate({ id: editingBook.id, data: editBookForm })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Library</h1><p className="text-secondary-500 mt-1">Manage books and borrowing</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIssueModalOpen(true)}>Issue Book</Button>
          <Button onClick={() => setBookModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Book</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Books</p><p className="text-2xl font-bold">{booksData?.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Issued</p><p className="text-2xl font-bold">{transactions.filter(t => t.status === 'issued').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500 text-red-600">Overdue</p><p className="text-2xl font-bold text-red-600">{overdueData?.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-secondary-500">Total Fines</p><p className="text-2xl font-bold text-orange-600">₦{(overdueData?.total_fines || 0).toLocaleString()}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['books', 'transactions', 'overdue'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-500 hover:text-secondary-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'books' && (
        <Card><CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input className="pl-10" placeholder="Search title, author, ISBN…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <DataTable
            isLoading={booksLoading}
            data={books}
            rowKey={b => b.id}
            emptyIcon={<BookOpen className="h-10 w-10" />}
            emptyTitle="No books yet"
            emptyDescription="Add your first book to the library catalogue."
            emptyAction={{ label: 'Add Book', onClick: () => setBookModalOpen(true) }}
            columns={[
              { key: 'title', header: 'Title', render: b => <button onClick={() => openEditBook(b)} className="text-left"><p className="font-medium hover:text-primary-600 transition-colors">{b.title}</p><p className="text-xs text-secondary-500">{b.author}</p></button> },
              { key: 'category', header: 'Category', render: b => b.category },
              { key: 'copies', header: 'Available / Total', render: b => <span className={b.available_copies === 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{b.available_copies} / {b.total_copies}</span> },
              { key: 'isbn', header: 'ISBN', render: b => <span className="font-mono text-xs">{b.isbn || '—'}</span> },
              { key: 'actions', header: '', render: b => (
                <div className="flex items-center gap-1 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIssueForm({ ...issueForm, book_id: b.id })} disabled={b.available_copies === 0}>Issue</Button>
                  <button onClick={() => openEditBook(b)} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Remove "${b.title}" from the catalogue?`)) deleteBook.mutate(b.id) }} className="h-8 w-8 flex items-center justify-center rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              )},
            ]}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={booksData?.total || 0} onPageChange={setPage} />
        </CardContent></Card>
      )}

      {tab === 'transactions' && (
        <Card><CardContent className="p-6">
          <DataTable
            isLoading={transLoading}
            data={transactions}
            rowKey={t => t.id}
            emptyIcon={<BookOpen className="h-10 w-10" />}
            emptyTitle="No transactions"
            emptyDescription="No books have been issued yet."
            columns={[
              { key: 'book', header: 'Book', render: t => t.book_title },
              { key: 'student', header: 'Student', render: t => t.student_name },
              { key: 'issued', header: 'Issued', render: t => new Date(t.issued_at).toLocaleDateString() },
              { key: 'due', header: 'Due Date', render: t => t.due_date },
              { key: 'status', header: 'Status', render: t => <Badge variant={t.status === 'returned' ? 'success' : 'warning'}>{t.status}</Badge> },
              { key: 'actions', header: '', render: t => t.status === 'issued' ? (
                <button onClick={() => returnBook.mutate(t.id)} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                  <RotateCcw className="h-3 w-3" />Return
                </button>
              ) : null },
            ]}
          />
        </CardContent></Card>
      )}

      {tab === 'overdue' && (
        <div className="space-y-4">
          {(overdueData?.total || 0) > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => sendReminders.mutate()} disabled={sendReminders.isPending}>
                <Send className="h-4 w-4 mr-2" />{sendReminders.isPending ? 'Sending…' : `Send Reminders (${overdueData?.total})`}
              </Button>
            </div>
          )}
          <Card><CardContent className="p-6">
            <DataTable
              isLoading={overdueLoading}
              data={overdue}
              rowKey={t => t.id}
              emptyIcon={<AlertTriangle className="h-10 w-10" />}
              emptyTitle="No overdue books"
              emptyDescription="All books have been returned on time."
              columns={[
                { key: 'book', header: 'Book', render: t => t.book_title },
                { key: 'student', header: 'Student', render: t => t.student_name },
                { key: 'due', header: 'Due Date', render: t => t.due_date },
                { key: 'days', header: 'Days Overdue', render: t => <span className="text-red-600 font-bold">{t.days_overdue}</span> },
                { key: 'fine', header: 'Fine', render: t => <span className="text-orange-600 font-medium">₦{t.fine.toLocaleString()}</span> },
                { key: 'actions', header: '', render: t => (
                  <button onClick={() => returnBook.mutate(t.id)} className="text-xs text-primary-600 hover:underline">Return</button>
                )},
              ]}
            />
          </CardContent></Card>
        </div>
      )}

      {/* Add Book Modal */}
      <Modal open={bookModalOpen} onOpenChange={setBookModalOpen} title="Add Book">
        <form onSubmit={(e) => { e.preventDefault(); addBook.mutate(bookForm) }} className="space-y-4">
          <div><Label>Title</Label><Input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Author</Label><Input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} /></div>
            <div><Label>ISBN</Label><Input value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category</Label><Input value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} /></div>
            <div><Label>Copies</Label><Input type="number" min={1} value={bookForm.total_copies} onChange={e => setBookForm({...bookForm, total_copies: Number(e.target.value)})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setBookModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addBook.isPending}>{addBook.isPending ? 'Adding…' : 'Add Book'}</Button>
          </div>
        </form>
      </Modal>

      {/* Issue Book Modal */}
      <Modal open={issueModalOpen} onOpenChange={setIssueModalOpen} title="Issue Book">
        <form onSubmit={(e) => { e.preventDefault(); issueBook.mutate(issueForm) }} className="space-y-4">
          <div><Label>Book ID</Label><Input value={issueForm.book_id} onChange={e => setIssueForm({...issueForm, book_id: e.target.value})} placeholder="Paste Book ID from the books tab" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student Name</Label><Input value={issueForm.student_name} onChange={e => setIssueForm({...issueForm, student_name: e.target.value})} required /></div>
            <div><Label>Student ID (optional)</Label><Input value={issueForm.student_id} onChange={e => setIssueForm({...issueForm, student_id: e.target.value})} /></div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm({...issueForm, due_date: e.target.value})} required /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={issueBook.isPending}>{issueBook.isPending ? 'Issuing…' : 'Issue Book'}</Button>
          </div>
        </form>
      </Modal>
      {/* Edit Book Modal */}
      <Modal open={!!editingBook} onOpenChange={(open) => { if (!open) setEditingBook(null) }} title={`Edit — ${editingBook?.title}`}>
        <form onSubmit={handleEditBookSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={editBookForm.title} onChange={e => setEditBookForm({...editBookForm, title: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Author</Label><Input value={editBookForm.author} onChange={e => setEditBookForm({...editBookForm, author: e.target.value})} /></div>
            <div><Label>ISBN</Label><Input value={editBookForm.isbn} onChange={e => setEditBookForm({...editBookForm, isbn: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category</Label><Input value={editBookForm.category} onChange={e => setEditBookForm({...editBookForm, category: e.target.value})} /></div>
            <div><Label>Total Copies</Label><Input type="number" min={1} value={editBookForm.total_copies} onChange={e => setEditBookForm({...editBookForm, total_copies: Number(e.target.value)})} /></div>
          </div>
          <p className="text-xs text-secondary-500 bg-blue-50 rounded p-2">Reducing total copies below the number currently issued may make availability go negative until books are returned.</p>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (editingBook && confirm(`Remove "${editingBook.title}" from the catalogue?`)) { deleteBook.mutate(editingBook.id); setEditingBook(null) } }}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-2"
            >
              <Trash2 className="h-4 w-4" />Delete Book
            </button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingBook(null)}>Cancel</Button>
              <Button type="submit" disabled={updateBook.isPending}>{updateBook.isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
