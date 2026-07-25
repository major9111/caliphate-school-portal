/**
 * FUGUSAU Portal — Admission Page (Fully Functional)
 *
 * Wired to real backend endpoints:
 *   POST /api/v1/admissions/      — ApplicationCreateSerializer
 *   GET  /api/v1/admissions/check/ — ApplicationStatusCheckView (?app_no=&email=)
 *   GET  /api/v1/students/departments/ — for programme/dept dropdown
 *   GET  /api/v1/admissions/sessions/  — active session info
 */
import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
// Public axios instance — no auth interceptor, safe for unauthenticated pages
const publicApi = axios.create({ baseURL: '/api/v1' })
import toast from 'react-hot-toast'
import {
  IconArrowRight, IconArrowLeft, IconSearch, IconCheck, IconWarning,
  IconGradCap, IconUser, IconMail, IconClock, IconCalendar,
} from '@/components/icons'

function IconAdmission(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  )
}

const PROGRAMMES = [
  { value:'BSC',  label:'Bachelor of Science (B.Sc.)'         },
  { value:'BEng', label:'Bachelor of Engineering (B.Eng.)'    },
  { value:'BA',   label:'Bachelor of Arts (B.A.)'             },
  { value:'BEd',  label:'Bachelor of Education (B.Ed.)'       },
  { value:'LLB',  label:'Bachelor of Laws (LLB)'              },
  { value:'MBBS', label:'Medicine (MBBS)'                     },
]
const ENTRY_TYPES = [
  { value:'UTME',     label:'UTME / Post-UTME' },
  { value:'DE',       label:'Direct Entry'      },
  { value:'TRANSFER', label:'Inter-University Transfer' },
]
const GENDERS = [{ value:'M', label:'Male' }, { value:'F', label:'Female' }]

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  submitted:   { color:'#3B82F6', bg:'bg-blue-500/15 border-blue-500/25',   label:'Submitted — Awaiting Review'  },
  screening:   { color:'#D4A017', bg:'bg-amber-500/15 border-amber-500/25', label:'Under Screening'               },
  shortlisted: { color:'#8B5CF6', bg:'bg-purple-500/15 border-purple-500/25',label:'Shortlisted'                  },
  offered:     { color:'#00A85A', bg:'bg-primary/15 border-primary/25',     label:'Offer Sent'                   },
  accepted:    { color:'#00A85A', bg:'bg-primary/15 border-primary/25',     label:'Offer Accepted — Enrolled'    },
  declined:    { color:'#EF4444', bg:'bg-red-500/15 border-red-500/25',     label:'Offer Declined'               },
  rejected:    { color:'#EF4444', bg:'bg-red-500/15 border-red-500/25',     label:'Application Rejected'         },
  waitlisted:  { color:'#F97316', bg:'bg-orange-500/15 border-orange-500/25',label:'Waitlisted'                  },
  expired:     { color:'#6B7280', bg:'bg-white/10 border-white/15',         label:'Offer Expired'                },
}

function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full pointer-events-none ${className}`}
    style={{ filter:'blur(80px)', opacity:0.08 }}/>
}

export default function AdmissionPage() {
  const navigate = useNavigate()
  const [params]     = useSearchParams()
  const [tab, setTab] = useState<'apply'|'check'>(params.get('check') ? 'check' : 'apply')
  const [submitted,   setSubmitted]   = useState<any>(null)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [checking,    setChecking]    = useState(false)
  const [checkForm,   setCheckForm]   = useState({ app_no:'', email:'' })

  // Load departments — use publicApi so unauthenticated users don't get 401 → login loop
  const { data: deptData } = useQuery<any, any>({
    queryKey: ['departments-public'],
    queryFn: () => publicApi.get('/students/departments/'),
  })
  const departments: any[] = (Array.isArray(deptData?.data?.results) ? deptData.data.results
                             : Array.isArray(deptData?.data) ? deptData.data : [])

  // Load active session — use publicApi (unauthenticated)
  const { data: sessionData } = useQuery<any, any>({
    queryKey: ['active-session'],
    queryFn: () => publicApi.get('/admissions/sessions/'),
  })
  const sessions: any[] = (Array.isArray(sessionData?.data?.results) ? sessionData.data.results
                          : Array.isArray(sessionData?.data) ? sessionData.data : [])
  const activeSession   = sessions.find((s: any) => s?.is_active) || sessions[0]

  // Form state matching ApplicationCreateSerializer fields exactly
  const [form, setForm] = useState({
    first_name:'', middle_name:'', last_name:'',
    email:'', phone:'',
    date_of_birth:'', gender:'M',
    state_of_origin:'', lga:'',
    home_address:'',
    programme:'BSC', entry_type:'UTME',
    first_choice_dept:'', second_choice_dept:'',
    jamb_reg_no:'', jamb_score:'', jamb_year: new Date().getFullYear(),
    waec_exam_no:'', neco_exam_no:'',
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const applyMutation = useMutation({
    mutationFn: () => publicApi.post('/admissions/', {
      ...form,
      jamb_score: parseInt(String(form.jamb_score)) || 0,
      jamb_year:  parseInt(String(form.jamb_year))  || new Date().getFullYear(),
      second_choice_dept: form.second_choice_dept || undefined,
    }),
    onSuccess: ({ data }) => setSubmitted(data),
    onError: (err: any) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const msgs = Object.entries(d).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join(' | ')
        toast.error(msgs)
      } else {
        toast.error(d?.detail || 'Submission failed. Check all fields and try again.')
      }
    },
  })

  const handleCheck = async () => {
    if (!checkForm.app_no || !checkForm.email) { toast.error('Enter both application number and email.'); return }
    setChecking(true); setCheckResult(null)
    try {
      const { data } = await publicApi.get('/admissions/check/', { params: { app_no: checkForm.app_no, email: checkForm.email } })
      setCheckResult(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Application not found.')
    } finally { setChecking(false) }
  }

  const inputCls = 'glass-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 block mb-1.5'

  return (
    <div className="min-h-screen bg-dark text-white font-sans relative overflow-hidden">
      <Orb className="w-[600px] h-[600px] bg-primary -top-40 -left-40"/>
      <Orb className="w-[400px] h-[400px] bg-primary-light bottom-0 right-0"/>

      {/* Topbar */}
      <header className="glass-strong border-b border-white/[0.06] px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="w-8 h-8 glass rounded-lg border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0">
            <IconArrowLeft size={15}/>
          </button>
          <img src={`${import.meta.env.BASE_URL}fugusau-logo.png`} alt="FUGUSAU" className="w-9 h-9 object-contain"/>
          <div>
            <div className="font-bold text-sm text-white">FUGUSAU Admissions</div>
            <div className="text-[10px] text-primary-light/60 tracking-wider">
              {activeSession ? `${activeSession.session_name} — ${activeSession.is_open ? 'OPEN' : 'CLOSED'}` : 'Post-UTME Portal'}
            </div>
          </div>
        </div>
        <Link to="/login" className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
          <IconArrowRight size={14}/> Student Portal Login
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">

        {/* Session status banner */}
        {activeSession && !activeSession.is_open && (
          <div className="glass border border-red-500/25 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <IconWarning size={16} className="text-red-400 flex-shrink-0"/>
            <p className="text-sm text-red-300">
              Admissions for <strong>{activeSession.session_name}</strong> closed on{' '}
              <strong>{new Date(activeSession.close_date).toLocaleDateString('en-NG')}</strong>.
              Applications are not currently accepted.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-3">
            <IconAdmission size={22} className="text-primary-light"/>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1.5">
            Join Federal University <span className="text-gradient-green">Gusau</span>
          </h1>
          <p className="text-white/45 text-sm max-w-md mx-auto leading-relaxed">
            Apply for POST-UTME screening or check your admission status.
          </p>
        </div>

        {/* Tabs */}
        <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] mb-5">
          {([
            { key:'apply', label:'Apply Now',     Icon:IconAdmission },
            { key:'check', label:'Check Status',  Icon:IconSearch    },
          ] as const).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab===key ? 'bg-primary text-white shadow-glow-sm' : 'text-white/45 hover:text-white/70'
              }`}>
              <Icon size={15}/> {label}
            </button>
          ))}
        </div>

        {/* ── APPLY TAB ── */}
        {tab === 'apply' && (
          submitted ? (
            <div className="glass border border-primary/25 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
                <IconCheck size={32} className="text-primary-light"/>
              </div>
              <h2 className="text-xl font-extrabold text-white mb-2">Application Submitted!</h2>
              <div className="glass border border-primary/20 rounded-xl p-4 mt-3 mb-6 inline-block">
                <p className="text-xs text-white/40 mb-1">Your Application Number</p>
                <p className="text-2xl font-extrabold font-mono text-primary-light">{submitted.application_no}</p>
              </div>
              <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">{submitted.message}</p>
              <button onClick={() => { setTab('check'); setCheckForm(f => ({ ...f, app_no: submitted.application_no })) }}
                className="mt-6 btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white flex items-center gap-2 mx-auto">
                <IconSearch size={14}/> Check My Status
              </button>
            </div>
          ) : (
            <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-5">

              {/* Personal Info */}
              <div>
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <IconUser size={14} className="text-primary-light"/> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>First Name *</label>
                    <input value={form.first_name} onChange={f('first_name')} placeholder="Enter first name" className={inputCls}/></div>
                  <div><label className={labelCls}>Middle Name</label>
                    <input value={form.middle_name} onChange={f('middle_name')} placeholder="(optional)" className={inputCls}/></div>
                  <div><label className={labelCls}>Last Name *</label>
                    <input value={form.last_name} onChange={f('last_name')} placeholder="Enter last name" className={inputCls}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className={labelCls}>Email Address *</label>
                    <input type="email" value={form.email} onChange={f('email')} placeholder="e.g. name@email.com" className={inputCls}/></div>
                  <div><label className={labelCls}>Phone Number *</label>
                    <input type="tel" value={form.phone} onChange={f('phone')} placeholder="080XXXXXXXX" className={inputCls}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div><label className={labelCls}>Date of Birth *</label>
                    <input type="date" value={form.date_of_birth} onChange={f('date_of_birth')} className={inputCls}/></div>
                  <div><label className={labelCls}>Gender *</label>
                    <select value={form.gender} onChange={f('gender')} className={inputCls}>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select></div>
                  <div><label className={labelCls}>State of Origin *</label>
                    <select value={form.state_of_origin} onChange={f('state_of_origin')} className={inputCls}>
                      <option value="">Select state…</option>
                      {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className={labelCls}>LGA *</label>
                    <input value={form.lga} onChange={f('lga')} placeholder="Local Government Area" className={inputCls}/></div>
                  <div><label className={labelCls}>Home Address *</label>
                    <input value={form.home_address} onChange={f('home_address')} placeholder="Full home address" className={inputCls}/></div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]"/>

              {/* Academic Choice */}
              <div>
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <IconGradCap size={14} className="text-primary-light"/> Academic Choice
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}>Programme *</label>
                    <select value={form.programme} onChange={f('programme')} className={inputCls}>
                      {PROGRAMMES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select></div>
                  <div><label className={labelCls}>Entry Type *</label>
                    <select value={form.entry_type} onChange={f('entry_type')} className={inputCls}>
                      {ENTRY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className={labelCls}>First Choice Department *</label>
                    <select value={form.first_choice_dept} onChange={f('first_choice_dept')} className={inputCls}>
                      <option value="">Select department…</option>
                      {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select></div>
                  <div><label className={labelCls}>Second Choice Department</label>
                    <select value={form.second_choice_dept} onChange={f('second_choice_dept')} className={inputCls}>
                      <option value="">Select department (optional)…</option>
                      {departments.filter((d:any) => d.id !== form.first_choice_dept).map((d:any) =>
                        <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select></div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]"/>

              {/* Examination Results */}
              <div>
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <IconGradCap size={14} className="text-primary-light"/> Examination Results
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>JAMB Reg. No. *</label>
                    <input value={form.jamb_reg_no} onChange={f('jamb_reg_no')} placeholder="e.g. 12345678AB" className={`${inputCls} font-mono uppercase`}/></div>
                  <div><label className={labelCls}>JAMB Score *</label>
                    <input type="number" min={0} max={400} value={form.jamb_score} onChange={f('jamb_score')} placeholder="240" className={inputCls}/></div>
                  <div><label className={labelCls}>JAMB Year *</label>
                    <input type="number" min={2015} max={2030} value={form.jamb_year} onChange={f('jamb_year')} className={inputCls}/></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div><label className={labelCls}>WAEC Exam No.</label>
                    <input value={form.waec_exam_no} onChange={f('waec_exam_no')} placeholder="WAEC exam number" className={inputCls}/></div>
                  <div><label className={labelCls}>NECO Exam No.</label>
                    <input value={form.neco_exam_no} onChange={f('neco_exam_no')} placeholder="NECO exam number" className={inputCls}/></div>
                </div>
              </div>

              {/* Notice */}
              {activeSession && (
                <div className="glass border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <IconCalendar size={14} className="text-primary-light mt-0.5 flex-shrink-0"/>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Applying for session <strong className="text-white">{activeSession.session_name}</strong>.
                    Application closes <strong className="text-white">{new Date(activeSession.close_date).toLocaleDateString('en-NG')}</strong>.
                    Slots available: <strong className="text-white">{activeSession.slots_remaining}</strong>.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || !form.first_name || !form.last_name || !form.email || !form.jamb_reg_no || !form.jamb_score || !form.first_choice_dept}
                className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
                {applyMutation.isPending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Submitting…</>
                  : <><IconArrowRight size={16}/> Submit Application</>}
              </button>
            </div>
          )
        )}

        {/* ── CHECK STATUS TAB ── */}
        {tab === 'check' && (
          <div className="space-y-5">
            <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white">Check Application Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Application Number *</label>
                  <input value={checkForm.app_no}
                    onChange={e => setCheckForm(f => ({ ...f, app_no: e.target.value.toUpperCase() }))}
                    placeholder="FUGU/20252026/ABC123" className={`${inputCls} font-mono uppercase`}/></div>
                <div><label className={labelCls}>Email Address *</label>
                  <input type="email" value={checkForm.email}
                    onChange={e => setCheckForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your-application@email.com" className={inputCls}/></div>
              </div>
              <button onClick={handleCheck} disabled={checking || !checkForm.app_no || !checkForm.email}
                className="btn-primary w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
                {checking
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Checking…</>
                  : <><IconSearch size={15}/> Check Status</>}
              </button>
            </div>

            {/* Result card */}
            {checkResult && (() => {
              const meta = STATUS_META[checkResult.status] || STATUS_META.submitted
              return (
                <div className={`glass border rounded-2xl p-6 ${meta.bg}`}>
                  <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
                    <div>
                      <h3 className="text-lg font-extrabold text-white">{checkResult.full_name}</h3>
                      <p className="font-mono text-sm mt-0.5" style={{ color: meta.color }}>{checkResult.application_no}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full border"
                      style={{ background:`${meta.color}20`, color:meta.color, borderColor:`${meta.color}40` }}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                    {[
                      ['Department', checkResult.first_choice_dept],
                      ['JAMB Score', checkResult.jamb_score],
                      ['Applied',    (() => {
                        const d = checkResult.submitted_at ? new Date(checkResult.submitted_at) : null
                        return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-NG') : null
                      })()],
                    ].filter(([,v])=>v).map(([label,value]) => (
                      <div key={String(label)}>
                        <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="text-sm font-bold text-white">{String(value)}</p>
                      </div>
                    ))}
                  </div>

                  {checkResult.message && (
                    <div className="glass border border-white/[0.08] rounded-xl px-4 py-3 mb-3">
                      <p className="text-sm text-white/70 leading-relaxed">{checkResult.message}</p>
                    </div>
                  )}

                  {/* Offer details */}
                  {checkResult.status === 'offered' && (
                    <div className="glass border border-primary/25 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-primary-light flex items-center gap-2">
                        <IconCheck size={14}/> Offered: {checkResult.offered_department}
                      </p>
                      <p className="text-xs text-white/50">
                        Respond within <strong className="text-amber-400">{checkResult.days_to_respond} days</strong>.
                        Expires: {(() => {
                          const d = checkResult.offer_expires_at ? new Date(checkResult.offer_expires_at) : null
                          return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-NG') : '—'
                        })()}
                      </p>
                      <Link to="/login" className="btn-primary rounded-xl px-5 py-2 text-xs font-bold text-white flex items-center gap-2 mt-2 w-fit">
                        <IconArrowRight size={13}/> Login to Accept / Decline
                      </Link>
                    </div>
                  )}

                  {Array.isArray(checkResult.next_steps) && checkResult.next_steps.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Next Steps</p>
                      {checkResult.next_steps.map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary-light text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          <p className="text-xs text-white/60">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        <p className="text-center text-[10px] text-white/20 mt-6">
          © {new Date().getFullYear()} Federal University Gusau ·{' '}
          <span className="text-primary-light/40">admissions@fugusau.edu.ng</span>
        </p>
      </div>
    </div>
  )
}
