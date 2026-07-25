/**
 * FUGUSAU Admin — Students Management (Full)
 * List, search, filter, view detail, add new student via POST /students/register/
 * Note: POST /students/ returns 405 — backend uses /auth/register/ for creation
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI, authAPI } from '@/services/api'
import { relativeTime } from '@/utils'
import toast from 'react-hot-toast'
import { MobileToolbar, MobileRow, MobileListMeta, MobilePager } from '@/components/mobile'

// ── Icons ──────────────────────────────────────────────────────
const Ic = (d: string|string[]) => (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={p.className} style={p.style}>
    {Array.isArray(d) ? d.map((x,i)=><path key={i} d={x}/>) : <path d={d}/>}
  </svg>
)
const IconSearch  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconPlus    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconX       = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconDownload= (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconStudents= (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>

const LEVEL_COLOR: Record<string,string> = {'100':'#00A85A','200':'#3B82F6','300':'#D4A017','400':'#8B5CF6','500':'#EC4899'}
const STATUS_STYLE: Record<string,string> = {
  active:    'bg-primary/15 text-primary-light border-primary/25',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/25',
  graduated: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  deferred:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
}
const NG_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

const EMPTY_FORM = {
  first_name:'', last_name:'', email:'', phone:'',
  department:'', level:'100', admission_year: new Date().getFullYear(),
  admission_session:'', gender:'M', date_of_birth:'',
  state_of_origin:'', lga:'',
  password:'', role:'student',
}

export default function AdminStudentsPage() {
  const [search,      setSearch]      = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [showCreate,  setShowCreate]  = useState(false)
  const [selected,    setSelected]    = useState<any>(null)
  const [form,        setForm]        = useState({...EMPTY_FORM})
  const [page,        setPage]        = useState(1)
  const qc = useQueryClient()

  const { data: deptData } = useQuery<any, any>({ queryKey:['departments-list'], queryFn: () => studentsAPI.getDepartments()})
  const departments: any[] = deptData?.data?.results || deptData?.data || []

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-students', search, levelFilter, statusFilter, page],
    queryFn: () => studentsAPI.getAll({
      search: search||undefined,
      level:  levelFilter||undefined,
      status: statusFilter||undefined,
      page,
    }),
  })

  const students: any[]   = data?.data?.results || data?.data || []
  const totalCount: number = data?.data?.count   || students.length

  const createMutation = useMutation({
    mutationFn: () => authAPI.register({
      ...form,
      level:           parseInt(form.level),
      admission_year:  parseInt(String(form.admission_year)),
      role:            'student',
    }),
    onSuccess: () => {
      toast.success('Student account created!')
      setShowCreate(false)
      setForm({...EMPTY_FORM})
      qc.invalidateQueries({ queryKey:['admin-students'] })
    },
    onError: (err:any) => {
      const d = err?.response?.data
      if (d && typeof d === 'object') {
        const msgs = Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join(' | ')
        toast.error(msgs)
      } else toast.error(d?.detail || 'Creation failed.')
    },
  })

  const f = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(prev => ({...prev, [k]: e.target.value}))

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <IconStudents size={20} className="text-primary-light"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Students</h2>
            <p className="text-xs text-white/40">{totalCount.toLocaleString()} students on record</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="glass border border-white/[0.08] rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-colors">
            <IconDownload size={13}/> Export CSV
          </button>
          <button onClick={()=>setShowCreate(v=>!v)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${showCreate?'glass border border-white/[0.1] text-white/60':'btn-primary text-white'}`}>
            {showCreate ? <><IconX size={13}/> Cancel</> : <><IconPlus size={13}/> Add Student</>}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total',    value:totalCount,                                               accent:'#3B82F6' },
          { label:'Active',   value:students.filter(s=>s.status==='active').length,           accent:'#00A85A' },
          { label:'Suspended',value:students.filter(s=>s.status==='suspended').length,        accent:'#EF4444' },
          { label:'Graduated',value:students.filter(s=>s.status==='graduated').length,        accent:'#D4A017' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass border border-primary/20 rounded-2xl p-6 space-y-5">
          <h3 className="font-bold text-sm text-white">New Student Account</h3>
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/8 px-4 py-3">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-primary-light flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-xs text-white/55 leading-relaxed">The registration number (<span className="text-primary-light font-mono">YY/L/FF/DD/SSS</span>) is <strong className="text-white">generated automatically</strong> from the department's numeric ID and the admission year. Ensure the selected department has a numeric ID configured before creating.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>First Name *</label><input value={form.first_name} onChange={f('first_name')} placeholder="Amina" className={inputCls}/></div>
            <div><label className={labelCls}>Last Name *</label><input value={form.last_name} onChange={f('last_name')} placeholder="Ibrahim" className={inputCls}/></div>
            <div><label className={labelCls}>Gender *</label>
              <select value={form.gender} onChange={f('gender')} className={inputCls}>
                <option value="M">Male</option><option value="F">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Email Address *</label><input type="email" value={form.email} onChange={f('email')} placeholder="student@fugusau.edu.ng" className={inputCls}/></div>
            <div><label className={labelCls}>Phone Number</label><input type="tel" value={form.phone} onChange={f('phone')} placeholder="08012345678" className={inputCls}/></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Department *</label>
              <select value={form.department} onChange={f('department')} className={inputCls}>
                <option value="">Select department…</option>
                {departments.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Level *</label>
              <select value={form.level} onChange={f('level')} className={inputCls}>
                {['100','200','300','400','500'].map(l=><option key={l} value={l}>{l} Level</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Admission Year *</label>
              <input type="number" min={2010} max={2030} value={form.admission_year} onChange={f('admission_year')} className={inputCls}/>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Admission Session</label>
              <input value={form.admission_session} onChange={f('admission_session')} placeholder="2025/2026" className={inputCls}/>
            </div>
            <div><label className={labelCls}>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={f('date_of_birth')} className={inputCls}/>
            </div>
            <div><label className={labelCls}>State of Origin</label>
              <select value={form.state_of_origin} onChange={f('state_of_origin')} className={inputCls}>
                <option value="">Select state…</option>
                {NG_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Temporary Password *</label>
              <input type="text" value={form.password} onChange={f('password')} placeholder="Min 8 characters" className={inputCls}/>
            </div>
            <div><label className={labelCls}>LGA</label>
              <input value={form.lga} onChange={f('lga')} placeholder="Local Government Area" className={inputCls}/>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={()=>createMutation.mutate()}
              disabled={!form.first_name||!form.last_name||!form.email||!form.department||!form.password||createMutation.isPending}
              className="btn-primary rounded-xl px-7 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
              {createMutation.isPending
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating…</>
                : <><IconPlus size={14}/>Create Student</>}
            </button>
            <button onClick={()=>{setShowCreate(false);setForm({...EMPTY_FORM})}}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mobile toolbar */}
      <div className="md:hidden">
        <MobileToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search name, matric, email…"
          chips={[
            { value: '', label: 'All Levels' },
            ...['100', '200', '300', '400', '500'].map(l => ({ value: l, label: `${l}L` })),
          ]}
          activeChip={levelFilter}
          onChipChange={(v) => { setLevelFilter(v); setPage(1) }}
        />
      </div>
      <div className="md:hidden -mt-1">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['', 'active', 'suspended', 'graduated', 'deferred'].map(s => {
            const active = statusFilter === s
            return (
              <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border capitalize
                  ${active ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'glass border-white/[0.08] text-white/40'}`}>
                {s || 'All Status'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
            placeholder="Search name, matric, email…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
        <select value={levelFilter} onChange={e=>{setLevelFilter(e.target.value);setPage(1)}}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Levels</option>
          {['100','200','300','400','500'].map(l=><option key={l} value={l}>{l} Level</option>)}
        </select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {['active','suspended','graduated','deferred'].map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
        ) : students.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <IconStudents size={40} className="text-white/15 mx-auto mb-3"/>
            <p className="text-white/40 text-sm">{search?`No students match "${search}"`:levelFilter||statusFilter?'No students match the selected filters.':'No students yet.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{totalCount.toLocaleString()} students</MobileListMeta>
            {students.map((s: any) => {
              const level = String(s.level || '100')
              const lc = LEVEL_COLOR[level] || '#888'
              const init = (s.full_name || s.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <MobileRow
                  key={s.id}
                  onTap={() => setSelected(s)}
                  leading={init}
                  leadingClassName="text-white"
                  title={s.full_name || s.name}
                  subtitle={s.email}
                  caption={`${s.matric_number || '—'} · ${s.department_name || 'No dept'}`}
                  badge={{ label: s.status || 'active', className: STATUS_STYLE[s.status] || STATUS_STYLE.active }}
                />
              )
            })}
            {data?.data?.count > 20 && (
              <MobilePager page={page} totalPages={Math.ceil(totalCount / 20)} onChange={setPage} />
            )}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : students.length===0 ? (
          <div className="p-20 text-center">
            <IconStudents size={48} className="text-white/15 mx-auto mb-4"/>
            <p className="text-white/40">{search?`No students match "${search}"`:levelFilter||statusFilter?'No students match the selected filters.':'No students yet.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                    {['Student','Matric No.','Department','Level','CGPA','Status','Action'].map(h=>(
                      <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Department','CGPA'].includes(h)?'hidden md:table-cell':''} ${h==='CGPA'?'text-center':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {students.map((s:any)=>{
                    const level = String(s.level||'100')
                    const lc = LEVEL_COLOR[level]||'#888'
                    const init = (s.full_name||s.name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{background:`${lc}20`,color:lc}}>{init}</div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-xs truncate">{s.full_name||s.name}</div>
                              <div className="text-[11px] text-white/40 truncate">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-white/60">{s.matric_number||'—'}</td>
                        <td className="px-5 py-3.5 text-xs text-white/50 hidden md:table-cell truncate max-w-[160px]">{s.department_name||'—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${lc}18`,color:lc,border:`1px solid ${lc}35`}}>{level}L</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-white/80 hidden md:table-cell">
                          {s.cgpa ? parseFloat(s.cgpa).toFixed(2) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[s.status]||STATUS_STYLE.active}`}>
                            {s.status||'active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={()=>setSelected(s)}
                            className="text-xs text-primary-light/70 hover:text-primary-light transition-colors font-semibold">
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data?.data?.count > 20 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                <p className="text-xs text-white/40">{totalCount} total students</p>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="glass border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors">
                    Prev
                  </button>
                  <span className="text-xs text-white/50 font-mono">Page {page} of {Math.ceil(totalCount/20)}</span>
                  <button onClick={()=>setPage(p=>p+1)} disabled={!data?.data?.next}
                    className="glass border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}}
          onClick={()=>setSelected(null)}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl p-7 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-white">{selected.full_name||selected.name}</h3>
                <p className="text-white/40 text-sm font-mono mt-0.5">{selected.matric_number}</p>
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border capitalize ${STATUS_STYLE[selected.status]||STATUS_STYLE.active}`}>
                {selected.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Email',         selected.email],
                ['Department',    selected.department_name],
                ['Level',         selected.level ? `${selected.level} Level` : '—'],
                ['CGPA',          selected.cgpa ? parseFloat(selected.cgpa).toFixed(2) : '—'],
                ['Admission Yr',  selected.admission_year],
                ['Session',       selected.admission_session],
                ['State',         selected.state_of_origin],
                ['Gender',        selected.gender==='M'?'Male':'Female'],
              ].map(([label,val])=>(
                <div key={String(label)}>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-sm text-white font-medium">{String(val||'—')}</div>
                </div>
              ))}
            </div>
            {/* Registration number breakdown */}
            {(selected.reg_year || selected.reg_sequence) && (
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-[10px] text-white/35 uppercase tracking-wider mb-3">Registration Number Breakdown</div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: 'Year', value: selected.reg_year, desc: 'YY' },
                    { label: 'Level', value: selected.reg_entry_level, desc: 'L' },
                    { label: 'Faculty', value: selected.reg_faculty_id, desc: 'FF' },
                    { label: 'Dept', value: selected.reg_dept_id, desc: 'DD' },
                    { label: 'Seq', value: selected.reg_sequence ? String(selected.reg_sequence).padStart(3,'0') : '—', desc: 'SSS' },
                  ].map(({ label, value, desc }) => (
                    <div key={label}>
                      <div className="text-[9px] text-white/25 mb-1">{desc}</div>
                      <div className="font-mono text-base font-bold text-primary-light">{value ?? '—'}</div>
                      <div className="text-[9px] text-white/35 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={()=>setSelected(null)}
              className="mt-6 w-full glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
