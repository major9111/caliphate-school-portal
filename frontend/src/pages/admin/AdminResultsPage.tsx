/**
 * FUGUSAU Admin — Results Management (Full Featured)
 * Features: View all results, Upload single, Bulk CSV upload, Edit,
 *           Approve single, Batch senate approve, Export CSV, Filter by session/status
 */
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examsAPI } from '@/services/api'
import api from '@/services/api'
import { downloadBlob } from '@/utils'
import toast from 'react-hot-toast'
import {
  IconSearch, IconCheck, IconClock, IconWarning,
  IconDownload, IconPlus, IconX, IconEdit, IconFilter,
} from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

function IconUpload(p: any) {
  return <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
}
function IconCSV(p: any) {
  return <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
}
function IconResults(p: any) {
  return <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}

const GRADE_COLOR: Record<string, string> = {
  A:'#00A85A', 'A-':'#00A85A', 'B+':'#3B82F6', B:'#3B82F6', 'B-':'#3B82F6',
  'C+':'#D4A017', C:'#D4A017', 'C-':'#D4A017', D:'#F97316', E:'#EF4444', F:'#EF4444',
}

const EMPTY_SINGLE = {
  matric_number: '', course_code: '', ca_score: '', exam_score: '', remarks: '', semester: 'first',
}

export default function AdminResultsPage() {
  const [search,        setSearch]        = useState('')
  const [session,       setSession]       = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [tab,           setTab]           = useState<'all'|'pending'>('all')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [showUpload,    setShowUpload]    = useState(false)
  const [uploadMode,    setUploadMode]    = useState<'single'|'bulk'>('single')
  const [singleForm,    setSingleForm]    = useState({ ...EMPTY_SINGLE })
  const [csvFile,       setCsvFile]       = useState<File|null>(null)
  const [csvSemester,   setCsvSemester]   = useState('first')
  const [editingResult, setEditingResult] = useState<any|null>(null)
  const [editForm,      setEditForm]      = useState({ ca_score:'', exam_score:'', remarks:'' })
  const [bulkResult,    setBulkResult]    = useState<any|null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  // ── Fetch all results (admin endpoint) ──────────────────────────────────
  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-results', search, session, statusFilter],
    queryFn:  () => api.get('/exams/results/admin/', {
      params: { search: search||undefined, session: session||undefined, status: statusFilter||undefined }
    }),
  })

  // ── Fetch sessions for filter dropdown ───────────────────────────────────
  const { data: sessionsData } = useQuery<any, any>({
    queryKey: ['academic-sessions'],
    queryFn:  () => api.get('/courses/sessions/'),
  })

  const results: any[]  = data?.data?.results ?? data?.data ?? []
  const sessions: any[] = sessionsData?.data?.results ?? sessionsData?.data ?? []
  const pending   = results.filter(r => !r.is_senate_approved)
  const approved  = results.filter(r => r.is_senate_approved)
  const display   = tab === 'pending' ? pending : results

  const allSelected  = display.length > 0 && selected.size === display.length
  const someSelected = selected.size > 0

  // ── Mutations ────────────────────────────────────────────────────────────
  const uploadSingleMutation = useMutation({
    mutationFn: (d: object) => api.post('/exams/results/upload/', d),
    onSuccess: () => {
      toast.success('Result uploaded!')
      qc.invalidateQueries({ queryKey: ['admin-results'] })
      setSingleForm({ ...EMPTY_SINGLE })
      setShowUpload(false)
    },
    onError: (e: any) => {
      const msg = e?.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(', ') : 'Upload failed')
    },
  })

  const bulkUploadMutation = useMutation({
    mutationFn: (fd: FormData) => api.post('/exams/results/bulk-upload/', fd),
    onSuccess: (res) => {
      toast.success('Bulk upload complete!')
      setBulkResult((res as any).data)
      qc.invalidateQueries({ queryKey: ['admin-results'] })
      setCsvFile(null)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || 'Bulk upload failed'
      toast.error(msg)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => examsAPI.approveResult(id),
    onSuccess: () => { toast.success('Result approved!'); qc.invalidateQueries({ queryKey: ['admin-results'] }) },
    onError:   () => toast.error('Approval failed'),
  })

  const batchApproveMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/exams/results/senate-approve/', { result_ids: ids }),
    onSuccess: (res) => {
      toast.success(`${(res as any).data?.approved || selected.size} results approved!`)
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['admin-results'] })
    },
    onError: () => toast.error('Batch approval failed'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/exams/results/${id}/`, data),
    onSuccess: () => {
      toast.success('Result updated!')
      qc.invalidateQueries({ queryKey: ['admin-results'] })
      setEditingResult(null)
    },
    onError: (e: any) => {
      const msg = e?.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(', ') : 'Update failed')
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(display.map((r: any) => r.id)))
  }

  function handleSingleUpload() {
    const { matric_number, course_code, ca_score, exam_score, semester, remarks } = singleForm
    if (!matric_number || !course_code || !ca_score || !exam_score) {
      toast.error('Matric number, course code, CA and exam scores are required')
      return
    }
    uploadSingleMutation.mutate({
      matric_number, course_code,
      ca_score: parseFloat(ca_score),
      exam_score: parseFloat(exam_score),
      semester, remarks: remarks || undefined,
    })
  }

  function handleBulkUpload() {
    if (!csvFile) { toast.error('Select a CSV file'); return }
    const fd = new FormData()
    fd.append('file', csvFile)
    fd.append('semester', csvSemester)
    bulkUploadMutation.mutate(fd)
  }

  function handleEditSubmit() {
    if (!editingResult) return
    editMutation.mutate({
      id: editingResult.id,
      data: {
        ca_score:   parseFloat(editForm.ca_score),
        exam_score: parseFloat(editForm.exam_score),
        remarks:    editForm.remarks || undefined,
      },
    })
  }

  async function handleExport() {
    try {
      const res = await api.get('/exams/results/admin/', {
        params: { export: 'csv', session: session||undefined },
        responseType: 'blob',
      })
      downloadBlob(new Blob([(res as any).data]), `results-${session||'all'}.csv`)
    } catch { toast.error('Export failed — endpoint may need configuration') }
  }

  function downloadTemplate() {
    const csv = 'matric_number,course_code,ca_score,exam_score,remarks\nFUG/2024/CSC/001,CSC301,35,52,\nFUG/2024/CSC/002,CSC301,28,44,\n'
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'results-template.csv')
    toast.success('Template downloaded')
  }

  // ── Grade boundary reference ───────────────────────────────────────────
  const GRADE_BANDS = [
    { range:'70-100', grade:'A',  gp:'5.0', color:'#00A85A' },
    { range:'60-69',  grade:'B',  gp:'4.0', color:'#3B82F6' },
    { range:'50-59',  grade:'C',  gp:'3.0', color:'#D4A017' },
    { range:'45-49',  grade:'D',  gp:'2.0', color:'#F97316' },
    { range:'40-44',  grade:'E',  gp:'1.0', color:'#EF4444' },
    { range:'0-39',   grade:'F',  gp:'0.0', color:'#EF4444' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconResults size={20} className="text-primary-light"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Results Management</h2>
            <p className="text-xs text-white/40">{results.length} results · {pending.length} pending approval</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport}
            className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-all">
            <IconDownload size={14}/> Export CSV
          </button>
          {someSelected && (
            <button
              onClick={() => batchApproveMutation.mutate(Array.from(selected))}
              disabled={batchApproveMutation.isPending}
              className="glass border border-primary/30 bg-primary/10 rounded-xl px-4 py-2 text-xs font-bold text-primary-light hover:bg-primary/20 flex items-center gap-2 transition-all disabled:opacity-50">
              <IconCheck size={14}/> Approve Selected ({selected.size})
            </button>
          )}
          <button onClick={() => { setShowUpload(true); setBulkResult(null) }}
            className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
            <IconUpload size={14}/> Upload Results
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Results',  value:results.length,  accent:'#3B82F6' },
          { label:'Approved',       value:approved.length, accent:'#00A85A' },
          { label:'Pending',        value:pending.length,  accent:'#D4A017' },
          { label:'Distinctions',   value:results.filter(r=>r.grade==='A').length, accent:'#8B5CF6' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,${accent},transparent)` }}/>
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{label}</div>
            <div className="text-3xl font-extrabold" style={{ color:accent }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Mobile toolbar */}
      <div className="md:hidden flex flex-col gap-2.5">
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
          {(['all','pending'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(new Set()) }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab===t ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45'
              }`}>
              {t==='pending' ? `Pending (${pending.length})` : `All (${results.length})`}
            </button>
          ))}
        </div>
        <MobileToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search student, matric, course…"
          chips={[
            { value: '', label: 'All Status' },
            { value: 'approved', label: 'Approved' },
            { value: 'pending', label: 'Pending' },
          ]}
          activeChip={statusFilter}
          onChipChange={setStatusFilter}
        />
      </div>

      {/* Desktop Tabs + Filters */}
      <div className="hidden md:flex flex-wrap gap-3 items-center">
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07]">
          {(['all','pending'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(new Set()) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                tab===t ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
              }`}>
              {t==='pending' ? `Pending (${pending.length})` : `All (${results.length})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search student, matric, course…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
        <select value={session} onChange={e=>setSession(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Sessions</option>
          {sessions.map((s:any) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Grade boundary reference */}
      <div className="hidden md:flex glass border border-white/[0.07] rounded-xl px-5 py-3 items-center gap-6 flex-wrap">
        <span className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Grade Scale:</span>
        {GRADE_BANDS.map(b => (
          <div key={b.grade} className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold" style={{ color:b.color }}>{b.grade}</span>
            <span className="text-[10px] text-white/30">{b.range}% · {b.gp}GP</span>
          </div>
        ))}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
        ) : display.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <IconResults size={40} className="text-white/15 mx-auto mb-3"/>
            <p className="text-white/40 text-sm mb-1">No results found.</p>
            <p className="text-white/25 text-xs">Upload results using the button above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{display.length} results</MobileListMeta>
            {display.map((r: any) => (
              <MobileRow
                key={r.id}
                chevron={false}
                leading={r.grade || '—'}
                leadingClassName="font-extrabold text-base bg-white/[0.06]"
                leadingStyle={{ color: GRADE_COLOR[r.grade] || '#888' }}
                title={r.student_name}
                subtitle={`${r.course_code} · ${r.course_title || ''}`}
                caption={`${r.matric_number} · Total ${r.total_score}`}
                badge={{
                  label: r.is_senate_approved ? 'Approved' : 'Pending',
                  className: r.is_senate_approved ? 'bg-primary/15 text-primary-light' : 'bg-amber-500/15 text-amber-400',
                }}
                footer={!r.is_senate_approved ? (
                  <>
                    <MobileMiniAction
                      label="Edit"
                      icon={<IconEdit size={11} />}
                      className="bg-white/[0.06] text-white/60"
                      onClick={() => { setEditingResult(r); setEditForm({ ca_score: String(r.ca_score), exam_score: String(r.exam_score), remarks: r.remarks || '' }) }}
                    />
                    <MobileMiniAction label="Approve" icon={<IconCheck size={11} />} onClick={() => approveMutation.mutate(r.id)} />
                  </>
                ) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : display.length === 0 ? (
          <div className="p-20 text-center">
            <IconResults size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40 mb-2">No results found.</p>
            <p className="text-white/25 text-xs">Upload results using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  <th className="px-4 py-3.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 cursor-pointer accent-primary"/>
                  </th>
                  {['Student','Course','Session','Sem','CA','Exam','Total','Grade','Status','Actions'].map(h => (
                    <th key={h} className={`px-4 py-3.5 font-semibold text-left ${
                      ['CA','Exam','Total'].includes(h) ? 'text-right hidden md:table-cell' : ''
                    } ${['Session','Sem'].includes(h) ? 'hidden md:table-cell' : ''
                    } ${['Grade','Status'].includes(h) ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {display.map((r: any) => {
                  const isSel = selected.has(r.id)
                  return (
                    <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${isSel ? 'bg-primary/[0.04]' : ''}`}>
                      <td className="px-4 py-3.5">
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(r.id)}
                          className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 cursor-pointer accent-primary"/>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-xs text-white">{r.student_name}</div>
                        <div className="text-[11px] text-white/40 font-mono">{r.matric_number}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-primary-light">{r.course_code}</div>
                        <div className="text-[11px] text-white/40 truncate max-w-[120px]">{r.course_title}</div>
                      </td>
                      <td className="px-4 py-3.5 text-white/40 text-xs hidden md:table-cell">{r.session}</td>
                      <td className="px-4 py-3.5 text-white/40 text-xs hidden md:table-cell capitalize">{r.semester}</td>
                      <td className="px-4 py-3.5 text-right text-white/55 text-xs hidden md:table-cell">{r.ca_score}</td>
                      <td className="px-4 py-3.5 text-right text-white/55 text-xs hidden md:table-cell">{r.exam_score}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">{r.total_score}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-base font-extrabold" style={{ color: GRADE_COLOR[r.grade] || '#888' }}>
                          {r.grade || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[10px] font-bold flex items-center justify-center gap-1 ${
                          r.is_senate_approved ? 'text-primary-light' : 'text-amber-400'
                        }`}>
                          {r.is_senate_approved
                            ? <><IconCheck size={10}/> Approved</>
                            : <><IconClock size={10}/> Pending</>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {!r.is_senate_approved && (
                            <>
                              <button onClick={() => { setEditingResult(r); setEditForm({ ca_score: String(r.ca_score), exam_score: String(r.exam_score), remarks: r.remarks||'' }) }}
                                className="text-xs text-white/40 hover:text-white font-semibold flex items-center gap-1 transition-colors">
                                <IconEdit size={11}/> Edit
                              </button>
                              <button onClick={() => approveMutation.mutate(r.id)}
                                disabled={approveMutation.isPending}
                                className="text-xs text-primary-light/70 hover:text-primary-light font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors">
                                <IconCheck size={11}/> Approve
                              </button>
                            </>
                          )}
                          {r.uploaded_by_name && (
                            <span className="text-[10px] text-white/20 hidden lg:block">by {r.uploaded_by_name}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={() => { setShowUpload(false); setBulkResult(null) }}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <IconUpload size={16} className="text-primary-light"/>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Upload Results</h3>
                  <p className="text-xs text-white/40">Enter one result or upload a CSV for bulk entry</p>
                </div>
              </div>
              <button onClick={() => { setShowUpload(false); setBulkResult(null) }}
                className="w-8 h-8 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/50 hover:text-white">
                <IconX size={16}/>
              </button>
            </div>

            {/* Mode toggle */}
            <div className="px-7 pt-5 pb-3">
              <div className="flex gap-1 p-1 glass rounded-xl border border-white/[0.06]">
                <button onClick={() => setUploadMode('single')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    uploadMode==='single' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <IconPlus size={13}/> Single Entry
                </button>
                <button onClick={() => setUploadMode('bulk')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    uploadMode==='bulk' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <IconCSV size={13}/> Bulk CSV Upload
                </button>
              </div>
            </div>

            {/* Single entry form */}
            {uploadMode === 'single' && (
              <div className="px-7 pb-7 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Matric Number <span className="text-red-400">*</span></label>
                    <input value={singleForm.matric_number} onChange={e=>setSingleForm(f=>({...f,matric_number:e.target.value}))}
                      placeholder="e.g. FUG/2024/CSC/001"
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-white/25"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Course Code <span className="text-red-400">*</span></label>
                    <input value={singleForm.course_code} onChange={e=>setSingleForm(f=>({...f,course_code:e.target.value.toUpperCase()}))}
                      placeholder="e.g. CSC301"
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-white/25"/>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">CA Score <span className="text-red-400">*</span> <span className="text-white/20">(0–40)</span></label>
                    <input value={singleForm.ca_score} onChange={e=>setSingleForm(f=>({...f,ca_score:e.target.value}))}
                      type="number" min="0" max="40" step="0.5" placeholder="0.0"
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Exam Score <span className="text-red-400">*</span> <span className="text-white/20">(0–60)</span></label>
                    <input value={singleForm.exam_score} onChange={e=>setSingleForm(f=>({...f,exam_score:e.target.value}))}
                      type="number" min="0" max="60" step="0.5" placeholder="0.0"
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Semester</label>
                    <select value={singleForm.semester} onChange={e=>setSingleForm(f=>({...f,semester:e.target.value}))}
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                      <option value="first">First</option>
                      <option value="second">Second</option>
                    </select>
                  </div>
                </div>
                {/* Live preview */}
                {singleForm.ca_score && singleForm.exam_score && (
                  <div className="glass border border-white/[0.07] rounded-xl px-5 py-3 flex items-center gap-6">
                    <div>
                      <div className="text-[10px] text-white/35 uppercase">Total</div>
                      <div className="text-xl font-extrabold text-white">
                        {(parseFloat(singleForm.ca_score||'0') + parseFloat(singleForm.exam_score||'0')).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/35 uppercase">Expected Grade</div>
                      <div className="text-xl font-extrabold" style={{ color: (() => {
                        const total = parseFloat(singleForm.ca_score||'0') + parseFloat(singleForm.exam_score||'0')
                        if (total >= 70) return '#00A85A'; if (total >= 60) return '#3B82F6'
                        if (total >= 50) return '#D4A017'; if (total >= 45) return '#F97316'
                        if (total >= 40) return '#EF4444'; return '#EF4444'
                      })() }}>
                        {(() => {
                          const total = parseFloat(singleForm.ca_score||'0') + parseFloat(singleForm.exam_score||'0')
                          if (total >= 70) return 'A'; if (total >= 60) return 'B'
                          if (total >= 50) return 'C'; if (total >= 45) return 'D'
                          if (total >= 40) return 'E'; return 'F'
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Remarks (optional)</label>
                  <input value={singleForm.remarks} onChange={e=>setSingleForm(f=>({...f,remarks:e.target.value}))}
                    placeholder="e.g. Absent from exam, Medical excuse…"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowUpload(false); setSingleForm({...EMPTY_SINGLE}) }}
                    className="flex-1 glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSingleUpload} disabled={uploadSingleMutation.isPending}
                    className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploadSingleMutation.isPending
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Uploading…</>
                      : <><IconCheck size={15}/> Upload Result</>}
                  </button>
                </div>
              </div>
            )}

            {/* Bulk CSV form */}
            {uploadMode === 'bulk' && (
              <div className="px-7 pb-7 space-y-5">
                {/* Template download */}
                <div className="glass border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">CSV Template</p>
                    <p className="text-xs text-white/40 mt-0.5">Download and fill in the template, then upload below</p>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">matric_number, course_code, ca_score, exam_score, remarks</p>
                  </div>
                  <button onClick={downloadTemplate}
                    className="glass border border-primary/30 rounded-xl px-4 py-2 text-xs font-bold text-primary-light hover:bg-primary/10 flex items-center gap-2 flex-shrink-0">
                    <IconDownload size={13}/> Template
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Semester</label>
                  <select value={csvSemester} onChange={e=>setCsvSemester(e.target.value)}
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </div>

                {/* File drop zone */}
                <div
                  onClick={() => csvInputRef.current?.click()}
                  className={`glass border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    csvFile ? 'border-primary/50 bg-primary/[0.05]' : 'border-white/15 hover:border-white/30'
                  }`}>
                  <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if(f) setCsvFile(f) }}/>
                  <IconCSV size={32} className={`mx-auto mb-3 ${csvFile?'text-primary-light':'text-white/20'}`}/>
                  {csvFile ? (
                    <>
                      <p className="text-sm font-semibold text-white">{csvFile.name}</p>
                      <p className="text-xs text-white/40 mt-1">{(csvFile.size/1024).toFixed(1)} KB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white/60">Click to select CSV file</p>
                      <p className="text-xs text-white/30 mt-1">or drag and drop</p>
                    </>
                  )}
                </div>

                {/* Bulk result summary */}
                {bulkResult && (
                  <div className="glass border border-white/[0.07] rounded-xl p-5 space-y-3">
                    <p className="text-sm font-bold text-white">Upload Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label:'Created',  value:bulkResult.created,  color:'#00A85A' },
                        { label:'Updated',  value:bulkResult.updated,  color:'#3B82F6' },
                        { label:'Errors',   value:bulkResult.error_count||bulkResult.errors?.length||0, color:'#EF4444' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="glass border border-white/[0.07] rounded-xl p-3 text-center">
                          <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
                          <div className="text-[10px] text-white/40 mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                    {bulkResult.errors?.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {bulkResult.errors.map((err: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-red-400/80">
                            <IconWarning size={11} className="flex-shrink-0 mt-0.5"/>
                            <span>Row {err.row}: {err.error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setShowUpload(false); setCsvFile(null); setBulkResult(null) }}
                    className="flex-1 glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                    {bulkResult ? 'Close' : 'Cancel'}
                  </button>
                  {!bulkResult && (
                    <button onClick={handleBulkUpload} disabled={!csvFile || bulkUploadMutation.isPending}
                      className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                      {bulkUploadMutation.isPending
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Processing…</>
                        : <><IconCSV size={15}/> Upload CSV</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Result Modal ── */}
      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={() => setEditingResult(null)}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-lg font-extrabold text-white">Edit Result</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {editingResult.student_name} · {editingResult.course_code}
                </p>
              </div>
              <button onClick={() => setEditingResult(null)}
                className="w-8 h-8 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/50 hover:text-white">
                <IconX size={16}/>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">CA Score <span className="text-white/20">(0–40)</span></label>
                  <input value={editForm.ca_score} onChange={e=>setEditForm(f=>({...f,ca_score:e.target.value}))}
                    type="number" min="0" max="40" step="0.5"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white"/>
                </div>
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Exam Score <span className="text-white/20">(0–60)</span></label>
                  <input value={editForm.exam_score} onChange={e=>setEditForm(f=>({...f,exam_score:e.target.value}))}
                    type="number" min="0" max="60" step="0.5"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white"/>
                </div>
              </div>
              {editForm.ca_score && editForm.exam_score && (
                <div className="glass border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-5">
                  <span className="text-xs text-white/40">New Total:</span>
                  <span className="text-xl font-extrabold text-white">
                    {(parseFloat(editForm.ca_score||'0') + parseFloat(editForm.exam_score||'0')).toFixed(1)}
                  </span>
                  <span className="text-xs text-white/30">vs current {editingResult.total_score}</span>
                </div>
              )}
              <div>
                <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Remarks</label>
                <input value={editForm.remarks} onChange={e=>setEditForm(f=>({...f,remarks:e.target.value}))}
                  placeholder="Reason for edit…"
                  className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
              </div>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setEditingResult(null)}
                className="flex-1 glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleEditSubmit} disabled={editMutation.isPending}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                {editMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>
                  : <><IconCheck size={15}/> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
