/**
 * FUGUSAU Portal — Credential Verifier (Full)
 *
 * Exact backend fields from Credential model:
 *   doc_type, file, original_filename, file_hash
 *   forgery_risk_score (0-100), ai_verdict, ai_findings, extracted_text
 *   external_verified, external_data
 *   status (pending|reviewing|authentic|suspicious|forged|rejected)
 *   reviewed_by_name, reviewed_at, review_notes
 *   student_matric, student_name, uploaded_at
 *
 * Endpoints:
 *   GET/POST /credentials/              → list/upload (multipart: doc_type + file)
 *   POST     /credentials/<pk>/analyze/ → trigger AI re-analysis
 *   POST     /credentials/<pk>/verify/  → external verify (WAEC/NECO/JAMB)
 *   POST     /credentials/<pk>/review/  → admin review (status + notes)
 *   GET      /credentials/<pk>/download/ → download raw file
 */
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialsAPI } from '@/services/api'
import { useRole } from '@/hooks/useRole'
import { relativeTime } from '@/utils'
import toast from 'react-hot-toast'

// ── Icons ──────────────────────────────────────────────────────
const IconUpload = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
const IconCheck  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconX      = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconAI     = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/><circle cx="8.5" cy="14.5" r="1.5"/><circle cx="15.5" cy="14.5" r="1.5"/></svg>
const IconSearch = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconDown   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconEye    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconPlus   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconEdit   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconShield = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

// ── Constants ──────────────────────────────────────────────────
const DOC_TYPES = [
  { value:'WAEC',       label:'WAEC SSCE Result',             ext_verify: true  },
  { value:'NECO',       label:'NECO SSCE Result',             ext_verify: true  },
  { value:'JAMB',       label:'JAMB Result',                  ext_verify: true  },
  { value:'BIRTH_CERT', label:'Birth Certificate',            ext_verify: false },
  { value:'LGC',        label:'Local Government Certificate', ext_verify: false },
  { value:'NYSC',       label:'NYSC Certificate',             ext_verify: false },
  { value:'DEGREE',     label:'University Degree',            ext_verify: false },
  { value:'OTHER',      label:'Other Document',               ext_verify: false },
]

function StatusIcon({ status, size=18 }: { status: string; size?: number }) {
  if (status === 'authentic') return <IconCheck size={size} />
  if (status === 'pending') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  if (status === 'reviewing') return <IconSearch size={size} />
  if (status === 'suspicious') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  return <IconX size={size} />
}

const STATUS = {
  pending:   { cls:'bg-amber-500/15 text-amber-400 border-amber-500/25',   label:'Pending'          },
  reviewing: { cls:'bg-blue-500/15 text-blue-400 border-blue-500/25',      label:'Under Review'     },
  authentic: { cls:'bg-primary/15 text-primary-light border-primary/25',   label:'Authentic'        },
  suspicious:{ cls:'bg-orange-500/15 text-orange-400 border-orange-500/25',label:'Suspicious'       },
  forged:    { cls:'bg-red-500/15 text-red-400 border-red-500/25',         label:'Forged'           },
  rejected:  { cls:'bg-red-500/15 text-red-400 border-red-500/25',         label:'Rejected'         },
}

const RISK_COLOR = (s:number) => s<=20?'#00A85A':s<=50?'#D4A017':s<=75?'#F97316':'#EF4444'
const RISK_LABEL = (s:number) => s<=20?'Very Low':s<=50?'Low':s<=75?'Medium':'High'

// ── External verify form fields by doc type ────────────────────
const EXT_FIELDS: Record<string, {key:string;label:string;placeholder:string}[]> = {
  WAEC: [
    {key:'exam_number', label:'Exam Number',  placeholder:'e.g. 4240101001'},
    {key:'year',        label:'Exam Year',    placeholder:'e.g. 2023'},
    {key:'card_pin',    label:'Scratch Card PIN', placeholder:'16-digit PIN'},
  ],
  NECO: [
    {key:'exam_number', label:'Exam Number',  placeholder:'e.g. NEC/2023/0001'},
    {key:'year',        label:'Exam Year',    placeholder:'e.g. 2023'},
    {key:'token',       label:'Token',        placeholder:'Verification token'},
  ],
  JAMB: [
    {key:'reg_number',  label:'JAMB Reg No.', placeholder:'e.g. 98876543EF'},
    {key:'year',        label:'Exam Year',    placeholder:'e.g. 2023'},
  ],
}

export default function CredentialsPage() {
  const { isAdmin } = useRole()
  const qc = useQueryClient()

  // Upload state
  const [showUpload,   setShowUpload]   = useState(false)
  const [docType,      setDocType]      = useState('')
  const [file,         setFile]         = useState<File|null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Admin review state
  const [reviewingId,  setReviewingId]  = useState<string|null>(null)
  const [reviewStatus, setReviewStatus] = useState('authentic')
  const [reviewNotes,  setReviewNotes]  = useState('')

  // External verify state
  const [verifyingId,  setVerifyingId]  = useState<string|null>(null)
  const [verifyData,   setVerifyData]   = useState<Record<string,string>>({})

  // Expanded detail card
  const [expandedId,   setExpandedId]   = useState<string|null>(null)

  // Search (admin)
  const [search,       setSearch]       = useState('')

  // ── Data ──────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery<any, any>({
    queryKey: ['credentials'],
    queryFn: credentialsAPI.getAll,
    refetchInterval: 30000,
  })

  const all: any[] = data?.data?.results || data?.data || []
  const credentials = isAdmin && search
    ? all.filter((c:any) =>
        (c.student_name||'').toLowerCase().includes(search.toLowerCase()) ||
        (c.student_matric||'').toLowerCase().includes(search.toLowerCase()) ||
        (c.doc_type_display||c.doc_type||'').toLowerCase().includes(search.toLowerCase())
      )
    : all

  const pending   = all.filter(c=>c.status==='pending'||c.status==='reviewing').length
  const authentic = all.filter(c=>c.status==='authentic').length
  const flagged   = all.filter(c=>c.status==='suspicious'||c.status==='forged').length

  // ── Mutations ─────────────────────────────────────────────────

  // Upload — multipart FormData with doc_type + file
  const uploadMut = useMutation({
    mutationFn: () => {
      if (!file || !docType) throw new Error('Select document type and file.')
      const fd = new FormData()
      fd.append('doc_type', docType)
      fd.append('file', file)
      return credentialsAPI.upload(fd)
    },
    onSuccess: () => {
      toast.success('Document uploaded! AI analysis will start shortly.')
      setShowUpload(false); setDocType(''); setFile(null)
      refetch()
    },
    onError: (e:any) => {
      const d = e?.response?.data
      if (d?.file?.[0])     toast.error(d.file[0])
      else if (d?.doc_type?.[0]) toast.error(d.doc_type[0])
      else if (d?.detail)   toast.error(d.detail)
      else toast.error('Upload failed. Please try again.')
    },
  })

  // Re-analyse
  const analyzeMut = useMutation({
    mutationFn: (id:string) => credentialsAPI.analyze(id),
    onSuccess: () => { toast.success('AI re-analysis started.'); refetch() },
    onError:   () => toast.error('Analysis failed.'),
  })

  // External verify
  const verifyMut = useMutation({
    mutationFn: ({ id, data }:{ id:string; data:object }) =>
      credentialsAPI.externalVerify(id, data),
    onSuccess: (res) => {
      const v = (res as any)?.data?.external_verified
      toast.success(v ? 'Externally verified!' : 'Could not verify externally.')
      setVerifyingId(null); setVerifyData({})
      refetch()
    },
    onError: (e:any) => toast.error(e?.response?.data?.error || 'Verification failed.'),
  })

  // Admin review — POST /credentials/<pk>/review/  { status, notes }
  const reviewMut = useMutation({
    mutationFn: () => credentialsAPI.approve(reviewingId!, {
      status: reviewStatus,
      notes:  reviewNotes,
    }),
    onSuccess: () => {
      toast.success('Review saved. Student notified.')
      setReviewingId(null); setReviewNotes(''); setReviewStatus('authentic')
      refetch()
    },
    onError: (e:any) => toast.error(e?.response?.data?.error || 'Review failed.'),
  })

  // Download
  function handleDownload(c:any) {
    if (!c.file) { toast.error('File not available.'); return }
    window.open(c.file, '_blank', 'noopener,noreferrer')
  }

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <IconAI size={20} className="text-amber-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              {isAdmin ? 'Credential Verifier' : 'My Documents'}
            </h2>
            <p className="text-xs text-white/40">
              {isAdmin
                ? `AI-powered document authentication · ${all.length} total`
                : 'Upload and verify your academic documents'
              }
            </p>
          </div>
        </div>
        {!isAdmin && (
          <button onClick={()=>setShowUpload(v=>!v)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              showUpload
                ? 'glass border border-white/[0.1] text-white/60'
                : 'btn-primary text-white'
            }`}>
            {showUpload ? <><IconX size={14}/>Cancel</> : <><IconUpload size={14}/>Upload Document</>}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:'Total',        value:all.length,  accent:'#3B82F6' },
          { label:'Verified',     value:authentic,   accent:'#00A85A' },
          { label:isAdmin?'Pending Review':'Pending', value:pending, accent:'#D4A017' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Admin flagged alert */}
      {isAdmin && flagged > 0 && (
        <div className="glass border border-red-500/25 rounded-2xl px-5 py-4 flex items-center gap-3">
          <IconShield size={16} className="text-red-400 flex-shrink-0"/>
          <p className="text-sm text-red-300">
            <strong>{flagged}</strong> document{flagged!==1?'s':''} flagged as suspicious or forged. Review immediately.
          </p>
        </div>
      )}

      {/* Admin search */}
      {isAdmin && (
        <div className="relative max-w-sm">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by student, matric, doc type…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
      )}

      {/* ── UPLOAD FORM (student only) ── */}
      {showUpload && !isAdmin && (
        <div className="glass border border-primary/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <IconAI size={15} className="text-amber-400"/>
            <h3 className="font-bold text-sm text-white">Upload Document for AI Verification</h3>
          </div>

          {/* Doc type */}
          <div>
            <label className={labelCls}>Document Type *</label>
            <select value={docType} onChange={e=>setDocType(e.target.value)} className={inputCls}>
              <option value="">— Select document type —</option>
              {DOC_TYPES.map(t=>(
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div>
            <label className={labelCls}>Document File * (PDF, JPG, PNG — max 10MB)</label>
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)setFile(f)}}
              onClick={()=>fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary-light bg-primary/10'
                  : file
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-white/10 hover:border-primary/30 hover:bg-white/[0.02]'
              }`}>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e=>setFile(e.target.files?.[0]||null)}/>
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <IconCheck size={18} className="text-primary-light"/>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-white/40">{(file.size/1024).toFixed(1)} KB · Click to change</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setFile(null)}}
                    className="ml-auto text-white/30 hover:text-red-400 transition-colors">
                    <IconX size={16}/>
                  </button>
                </div>
              ) : (
                <>
                  <IconUpload size={32} className="text-white/20 mx-auto mb-3"/>
                  <p className="text-sm text-white/50">Drag & drop or <span className="text-primary-light font-semibold">browse</span></p>
                  <p className="text-xs text-white/25 mt-1">PDF, JPG, PNG up to 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* AI notice */}
          <div className="glass border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <IconAI size={14} className="text-amber-400 mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-white/50 leading-relaxed">
              Your document will be automatically analysed by AI for authenticity.
              Results appear within 2–5 minutes. Authentic documents show a green badge.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={()=>uploadMut.mutate()}
              disabled={!docType||!file||uploadMut.isPending}
              className="btn-primary rounded-xl px-7 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
              {uploadMut.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Uploading…</>
                : <><IconUpload size={14}/>Upload & Analyse</>}
            </button>
            <button onClick={()=>{setShowUpload(false);setFile(null);setDocType('')}}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── CREDENTIAL CARDS ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({length:3}).map((_,i)=>(
            <div key={i} className="glass rounded-2xl h-28 skeleton"/>
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
          <IconShield size={52} className="text-white/10 mx-auto mb-5"/>
          <h3 className="font-bold text-white/50 text-base mb-2">
            {isAdmin ? 'No credentials to review' : 'No documents uploaded yet'}
          </h3>
          <p className="text-white/30 text-sm max-w-xs mx-auto leading-relaxed">
            {isAdmin
              ? 'Students will upload their documents here for AI verification.'
              : 'Upload your WAEC, NECO, JAMB, or other academic documents for verification.'
            }
          </p>
          {!isAdmin && (
            <button onClick={()=>setShowUpload(true)}
              className="mt-5 btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white flex items-center gap-2 mx-auto">
              <IconPlus size={14}/> Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map((c:any)=>{
            const st       = STATUS[c.status as keyof typeof STATUS] || STATUS.pending
            const dt       = DOC_TYPES.find(d=>d.value===c.doc_type)
            const expanded = expandedId === c.id
            const risk     = c.forgery_risk_score || 0
            const isReviewPanel  = reviewingId  === c.id
            const isVerifyPanel  = verifyingId  === c.id
            const extFields      = EXT_FIELDS[c.doc_type] || []

            return (
              <div key={c.id}
                className={`glass border rounded-2xl overflow-hidden transition-all ${
                  c.status==='suspicious'||c.status==='forged'
                    ? 'border-red-500/25'
                    : c.status==='authentic'
                    ? 'border-primary/20'
                    : 'border-white/[0.07]'
                }`}>

                {/* Main row */}
                <div className="p-5 flex items-start gap-4">

                  {/* Status icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${st.cls}`}>
                    <StatusIcon status={c.status} size={18} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-white">
                        {c.doc_type_display || dt?.label || c.doc_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      {c.external_verified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center gap-1">
                          <IconCheck size={9}/> Ext. Verified
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <p className="text-xs text-white/50 mb-1">
                        {c.student_name} · <span className="font-mono">{c.student_matric}</span>
                      </p>
                    )}

                    <p className="text-[11px] text-white/30">
                      {c.original_filename} · Uploaded {relativeTime(c.uploaded_at)}
                    </p>

                    {/* AI verdict + risk bar */}
                    {c.ai_verdict && (
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <IconAI size={11} className="text-amber-400"/>
                          <span className="text-white/40">AI:</span>
                          <span className="font-bold capitalize"
                            style={{color:c.ai_verdict.toLowerCase().includes('authentic')?'#00A85A':'#EF4444'}}>
                            {c.ai_verdict}
                          </span>
                        </div>
                        {risk > 0 && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-white/30">Risk:</span>
                            <div className="w-20 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{width:`${risk}%`,background:RISK_COLOR(risk)}}/>
                            </div>
                            <span className="font-mono text-[10px]" style={{color:RISK_COLOR(risk)}}>
                              {risk}% ({RISK_LABEL(risk)})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review notes */}
                    {c.review_notes && (
                      <div className="mt-1.5 border-l-2 border-white/10 pl-2">
                        <p className="text-[11px] text-white/35 italic">
                          {c.reviewed_by_name ? `${c.reviewed_by_name}: ` : 'Admin: '}{c.review_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    {/* View/download */}
                    {c.file && (
                      <button onClick={()=>handleDownload(c)}
                        className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                        <IconEye size={12}/> View
                      </button>
                    )}

                    {/* Expand details */}
                    <button onClick={()=>setExpandedId(expanded?null:c.id)}
                      className="text-[11px] text-white/40 hover:text-primary-light flex items-center gap-1 transition-colors">
                      {expanded ? 'Less' : 'Details'}
                    </button>

                    {/* Admin: Re-analyze */}
                    {isAdmin && (
                      <button onClick={()=>analyzeMut.mutate(c.id)} disabled={analyzeMut.isPending}
                        className="text-[11px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors disabled:opacity-40">
                        <IconAI size={12}/> Re-analyse
                      </button>
                    )}

                    {/* External verify */}
                    {dt?.ext_verify && !c.external_verified && (
                      <button onClick={()=>{setVerifyingId(isVerifyPanel?null:c.id);setVerifyData({})}}
                        className="text-[11px] text-blue-400/70 hover:text-blue-400 flex items-center gap-1 transition-colors">
                        <IconShield size={12}/> Ext. Verify
                      </button>
                    )}

                    {/* Admin: Review */}
                    {isAdmin && ['pending','reviewing','suspicious'].includes(c.status) && (
                      <button onClick={()=>{setReviewingId(isReviewPanel?null:c.id);setReviewNotes(c.review_notes||'')}}
                        className="text-[11px] text-primary-light/70 hover:text-primary-light flex items-center gap-1 transition-colors">
                        <IconEdit size={12}/> Review
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Expanded details ── */}
                {expanded && (
                  <div className="border-t border-white/[0.06] px-5 py-4 bg-white/[0.01] space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        {label:'File Hash (SHA-256)', value:c.file_hash?.slice(0,16)+'…'},
                        {label:'Status',              value:st.label},
                        {label:'Reviewed At',         value:c.reviewed_at?relativeTime(c.reviewed_at):'Not reviewed'},
                        {label:'Ext. Verified',       value:c.external_verified?'Yes':'No'},
                      ].map(({label,value})=>(
                        <div key={label}>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-xs text-white font-medium">{value||'—'}</p>
                        </div>
                      ))}
                    </div>

                    {/* AI findings */}
                    {c.ai_findings && Object.keys(c.ai_findings).length > 0 && (
                      <div className="glass border border-white/[0.06] rounded-xl p-3">
                        <p className="text-[11px] text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                          <IconAI size={11}/> AI Analysis Findings
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(c.ai_findings)
                            .filter(([k])=>k!=='extracted_text')
                            .map(([k,v])=>(
                            <div key={k} className="text-[11px]">
                              <span className="text-white/35 capitalize">{k.replace(/_/g,' ')}: </span>
                              <span className="text-white/70">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OCR text */}
                    {c.extracted_text && (
                      <div className="glass border border-white/[0.06] rounded-xl p-3">
                        <p className="text-[11px] text-white/40 font-bold mb-2">Extracted Text (OCR)</p>
                        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-4">{c.extracted_text}</p>
                      </div>
                    )}

                    {/* External verification data */}
                    {c.external_verified && c.external_data && Object.keys(c.external_data).length > 0 && (
                      <div className="glass border border-blue-500/20 rounded-xl p-3">
                        <p className="text-[11px] text-blue-400 font-bold mb-2 flex items-center gap-1.5">
                          <IconShield size={11}/> External Verification Data
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(c.external_data).map(([k,v])=>(
                            <div key={k} className="text-[11px]">
                              <span className="text-white/35 capitalize">{k.replace(/_/g,' ')}: </span>
                              <span className="text-white/70">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── External verify panel ── */}
                {isVerifyPanel && (
                  <div className="border-t border-white/[0.06] px-5 py-4 bg-blue-500/[0.03] space-y-3">
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IconShield size={12}/> External Verification — {c.doc_type}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {extFields.map(({key,label,placeholder})=>(
                        <div key={key}>
                          <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1">{label}</label>
                          <input value={verifyData[key]||''}
                            onChange={e=>setVerifyData(d=>({...d,[key]:e.target.value}))}
                            placeholder={placeholder}
                            className="glass-input w-full rounded-lg px-3 py-2 text-xs text-white placeholder-white/20"/>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={()=>verifyMut.mutate({id:c.id,data:verifyData})}
                        disabled={verifyMut.isPending||Object.keys(verifyData).length===0}
                        className="btn-primary rounded-xl px-5 py-2 text-xs font-bold text-white disabled:opacity-40 flex items-center gap-2">
                        <IconShield size={12}/>
                        {verifyMut.isPending?'Verifying…':'Verify with '+c.doc_type}
                      </button>
                      <button onClick={()=>{setVerifyingId(null);setVerifyData({})}}
                        className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs text-white/50 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Admin review panel ── */}
                {isAdmin && isReviewPanel && (
                  <div className="border-t border-white/[0.06] px-5 py-4 bg-white/[0.02] space-y-3">
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Admin Review Decision</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">New Status</label>
                        <select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value)}
                          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                          <option value="authentic">Authentic</option>
                          <option value="suspicious">Suspicious</option>
                          <option value="forged">Forged</option>
                          <option value="rejected">Rejected</option>
                          <option value="reviewing">Keep Under Review</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Review Notes</label>
                        <input value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}
                          placeholder="Reason for this decision…"
                          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>reviewMut.mutate()} disabled={reviewMut.isPending}
                        className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                        <IconCheck size={13}/>{reviewMut.isPending?'Saving…':'Save Review'}
                      </button>
                      <button onClick={()=>{setReviewingId(null);setReviewNotes('')}}
                        className="glass border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-white/25">Student will be notified automatically.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
