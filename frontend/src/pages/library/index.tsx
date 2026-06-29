import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Book, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi } from '@/lib/api'

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'books' | 'transactions'>('books')
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: '', total_copies: 1, location: '' })
  const [issueForm, setIssueForm] = useState({ book_id: '', book_title: '', student_id: '', student_name: '', due_date: '' })
  const qc = useQueryClient()
  const { data: booksData, isLoading: booksLoading } = useQuery({ queryKey: ['library-books'], queryFn: libraryApi.getBooks })
  const { data: transData, isLoading: transLoading } = useQuery({ queryKey: ['library-transactions'], queryFn: libraryApi.getTransactions })
  const addBook = useMutation({ mutationFn: libraryApi.addBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); setBookModalOpen(false); setBookForm({ title: '', author: '', isbn: '', category: '', total_copies: 1, location: '' }); toast('Book added', 'success') } })
  const delBook = useMutation({ mutationFn: libraryApi.deleteBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); toast('Book deleted', 'success') } })
  const issueBook = useMutation({ mutationFn: libraryApi.issueBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books', 'library-transactions'] }); setIssueModalOpen(false); setIssueForm({ book_id: '', book_title: '', student_id: '', student_name: '', due_date: '' }); toast('Book issued', 'success') } })
  const returnBook = useMutation({ mutationFn: libraryApi.returnBook, onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books', 'library-transactions'] }); toast('Book returned', 'success') } })

  const books = booksData?.items || []
  const transactions = transData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Library Management</h1><p className="text-secondary-500 mt-1">Manage books and borrowing</p></div>
        <Button onClick={() => setBookModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Book</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'books' ? 'default' : 'outline'} onClick={() => setActiveTab('books')}>Books</Button>
        <Button variant={activeTab === 'transactions' ? 'default' : 'outline'} onClick={() => setActiveTab('transactions')}>Transactions</Button>
      </div>

      {activeTab === 'books' ? (
        booksLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : books.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-secondary-500"><Book className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No books in library</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {books.map((book: any) => (
              <Card key={book.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <Book className="h-8 w-8 text-primary-600" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setIssueForm({...issueForm, book_id: book.id, book_title: book.title}); setIssueModalOpen(true) }}>Issue</Button>
                      <Button variant="ghost" size="icon" onClick={() => delBook.mutate(book.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{book.title}</h3>
                  <p className="text-sm text-secondary-600 mb-2">by {book.author}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-secondary-500">ISBN: {book.isbn || 'N/A'}</p>
                    <p className="text-secondary-500">Category: {book.category}</p>
                    <p className="text-secondary-500">Location: {book.location}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={book.available_copies > 0 ? 'success' : 'secondary'}>{book.available_copies} available</Badge>
                      <span className="text-xs text-secondary-500">of {book.total_copies}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : transLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : transactions.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-secondary-500"><p>No transactions yet</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-secondary-50"><th className="text-left p-3 text-xs uppercase">Book</th><th className="text-left p-3 text-xs uppercase">Student</th><th className="text-left p-3 text-xs uppercase">Issue Date</th><th className="text-left p-3 text-xs uppercase">Due Date</th><th className="text-left p-3 text-xs uppercase">Status</th><th className="text-right p-3 text-xs uppercase">Actions</th></tr></thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-secondary-50">
                      <td className="p-3">{t.book_title}</td>
                      <td className="p-3">{t.student_name}</td>
                      <td className="p-3 text-sm">{t.issue_date}</td>
                      <td className="p-3 text-sm">{t.due_date}</td>
                      <td className="p-3"><Badge variant={t.status === 'issued' ? 'warning' : 'success'}>{t.status}</Badge></td>
                      <td className="p-3 text-right">{t.status === 'issued' && <Button size="sm" onClick={() => returnBook.mutate(t.id)}>Return</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={bookModalOpen} onOpenChange={setBookModalOpen} title="Add Book">
        <form onSubmit={(e) => { e.preventDefault(); addBook.mutate(bookForm) }} className="space-y-4">
          <div><Label>Title *</Label><Input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} required /></div>
          <div><Label>Author *</Label><Input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>ISBN</Label><Input value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} /></div>
            <div><Label>Category</Label><Input value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Total Copies</Label><Input type="number" value={bookForm.total_copies} onChange={e => setBookForm({...bookForm, total_copies: Number(e.target.value)})} /></div>
            <div><Label>Location</Label><Input value={bookForm.location} onChange={e => setBookForm({...bookForm, location: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setBookModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addBook.isPending}>{addBook.isPending ? 'Adding...' : 'Add Book'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={issueModalOpen} onOpenChange={setIssueModalOpen} title="Issue Book">
        <form onSubmit={(e) => { e.preventDefault(); issueBook.mutate(issueForm) }} className="space-y-4">
          <div><Label>Book</Label><Input value={issueForm.book_title} disabled className="bg-secondary-100" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student ID *</Label><Input value={issueForm.student_id} onChange={e => setIssueForm({...issueForm, student_id: e.target.value})} required /></div>
            <div><Label>Student Name *</Label><Input value={issueForm.student_name} onChange={e => setIssueForm({...issueForm, student_name: e.target.value})} required /></div>
          </div>
          <div><Label>Due Date *</Label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm({...issueForm, due_date: e.target.value})} required /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={issueBook.isPending}>{issueBook.isPending ? 'Issuing...' : 'Issue Book'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
