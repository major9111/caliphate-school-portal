import { useState } from 'react'
import { API_BASE } from '@/lib/api'

const FAQ_KB = [
  { keywords: ['apply', 'admission', 'post-utme', 'post utme'], answer: 'To apply, go to Admissions → Apply Now. It opens the official POST-UTME application form on the student portal.' },
  { keywords: ['status', 'check status', 'application number'], answer: 'Check your status under Admissions → Admission Status using your application number and email.' },
  { keywords: ['password', 'login', 'forgot'], answer: 'On the student portal login page, tap "Forgot password?" to reset it via your registered email.' },
  { keywords: ['fee', 'fees', 'pay', 'payment'], answer: 'Fee information and payment status are available on the student portal under Fees once you sign in.' },
  { keywords: ['result', 'results', 'grade', 'gpa'], answer: 'Results are published on the student portal under Results once released by your department.' },
  { keywords: ['hostel', 'accommodation'], answer: 'Hostel information is available under Students → Hostel.' },
  { keywords: ['transcript'], answer: 'Transcript requests and tracking are available under Online Services → E-Transcript / Transcript Tracking.' },
]

function matchFaq(question: string): string | null {
  const q = question.toLowerCase()
  let best: { answer: string; score: number } | null = null
  for (const entry of FAQ_KB) {
    const score = entry.keywords.filter(k => q.includes(k)).length
    if (score > 0 && (!best || score > best.score)) best = { answer: entry.answer, score }
  }
  return best?.answer ?? null
}

interface SearchResult { type: string; title: string; subtitle: string; url: string }

export default function AIPage() {
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqAnswer, setFaqAnswer] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const askFaq = (e: React.FormEvent) => {
    e.preventDefault()
    const answer = matchFaq(faqQuestion)
    setFaqAnswer(answer ?? "I don't have an answer for that yet — try the Contact page to ask the University directly.")
  }

  const runSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    try {
      const res = await fetch(`${API_BASE}/search/?q=${encodeURIComponent(searchQuery)}&limit=8`)
      const data = await res.json()
      setSearchResults(Array.isArray(data?.results) ? data.results : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <p className="section-label mb-3">AI Features</p>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-2xl">Smarter ways to find what you need</h1>
        <p className="text-muted max-w-xl mb-12">
          Two of these are live and free to run (no paid AI API involved) — the rest are marked honestly as planned, not faked.
        </p>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Smart Search — real, backed by Postgres full-text search */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-lg">Smart Search</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-full px-2 py-0.5">Live</span>
            </div>
            <p className="text-xs text-muted mb-4">Searches real courses, departments and library books via full-text search.</p>
            <form onSubmit={runSmartSearch} className="flex gap-2 mb-4">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. computer science, chemistry…"
                className="flex-1 glass-card border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
              <button className="btn-primary !px-4"><i className="bi bi-search" /></button>
            </form>
            {searching && <p className="text-xs text-muted">Searching…</p>}
            <div className="space-y-2">
              {searchResults.map(r => (
                <a key={r.url + r.title} href={r.url} className="flex items-center justify-between glass-card rounded-xl px-4 py-2.5 hover:border-primary/40 transition-colors">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="text-[10px] uppercase text-muted">{r.type}</span>
                </a>
              ))}
              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="text-xs text-muted">No results yet — try a different term.</p>
              )}
            </div>
          </div>

          {/* AI FAQ — real, rule-based, zero cost */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-lg">AI FAQ Assistant</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-full px-2 py-0.5">Live</span>
            </div>
            <p className="text-xs text-muted mb-4">Keyword-matched answers to common questions — free, runs entirely in your browser.</p>
            <form onSubmit={askFaq} className="flex gap-2 mb-4">
              <input value={faqQuestion} onChange={e => setFaqQuestion(e.target.value)}
                placeholder="Ask about admission, fees, results…"
                className="flex-1 glass-card border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
              <button className="btn-primary !px-4"><i className="bi bi-send" /></button>
            </form>
            {faqAnswer && (
              <div className="glass-card rounded-xl px-4 py-3 text-sm leading-relaxed">{faqAnswer}</div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: 'AI Chat Assistant', desc: 'Full conversational assistant — needs an LLM API budget to run well.' },
            { title: 'Voice Search', desc: 'Speech-to-text search — feasible free via the browser\'s built-in Web Speech API.' },
            { title: 'AI Programme Recommendation', desc: 'Suggests programmes from interests/results — needs a small ranking model or rules engine.' },
            { title: 'AI Document Search', desc: 'Search inside PDFs (handbooks, calendars) — needs documents indexed server-side first.' },
          ].map(f => (
            <div key={f.title} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{f.title}</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted bg-black/5 dark:bg-white/5 rounded-full px-2 py-1">Planned</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
