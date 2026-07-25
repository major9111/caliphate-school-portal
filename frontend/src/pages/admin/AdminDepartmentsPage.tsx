/**
 * FUGUSAU Admin — Departments & Faculties (Full CRUD)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI } from '@/services/api'
import toast from 'react-hot-toast'

const IconDepts    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>
const IconPlus     = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconX        = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconCheck    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconEdit     = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconTrash    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>

const FAC_COLORS = ['#00A85A','#3B82F6','#D4A017','#8B5CF6','#EC4899','#F97316','#EF4444','#06B6D4']

const EMPTY_FAC  = { name:'', code:'', numeric_id:'', description:'' }
const EMPTY_DEPT = { name:'', code:'', numeric_id:'', faculty:'', hod_name:'', description:'' }

export default function AdminDepartmentsPage() {
  const [tab, setTab] = useState<'departments'|'faculties'>('departments')
  const [showFacForm,  setShowFacForm]  = useState(false)
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [editFac,      setEditFac]      = useState<any>(null)
  const [editDept,     setEditDept]     = useState<any>(null)
  const [facForm,      setFacForm]      = useState({...EMPTY_FAC})
  const [deptForm,     setDeptForm]     = useState({...EMPTY_DEPT})
  const qc = useQueryClient()

  const { data: facData,  isLoading: loadFac  } = useQuery<any, any>({ queryKey:['faculties'],    queryFn:studentsAPI.getFaculties   })
  const { data: deptData, isLoading: loadDept } = useQuery<any, any>({ queryKey:['departments-list'], queryFn: () => studentsAPI.getDepartments() })

  const faculties:   any[] = facData?.data?.results  || facData?.data  || []
  const departments: any[] = deptData?.data?.results || deptData?.data || []

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  // ── Faculty mutations ──────────────────────────────────────
  const createFac = useMutation({
    mutationFn: () => studentsAPI.createFaculty(facForm),
    onSuccess:  () => { toast.success('Faculty created!'); setShowFacForm(false); setFacForm({...EMPTY_FAC}); qc.invalidateQueries({queryKey:['faculties']}) },
    onError:    (e:any) => toast.error(e?.response?.data?.name?.[0]||'Failed.'),
  })
  const updateFac = useMutation({
    mutationFn: () => studentsAPI.updateFaculty(editFac.id, facForm),
    onSuccess:  () => { toast.success('Faculty updated!'); setEditFac(null); setFacForm({...EMPTY_FAC}); qc.invalidateQueries({queryKey:['faculties']}) },
    onError:    () => toast.error('Update failed.'),
  })
  const deleteFac = useMutation({
    mutationFn: (id:string) => studentsAPI.deleteFaculty(id),
    onSuccess:  () => { toast.success('Faculty deleted.'); qc.invalidateQueries({queryKey:['faculties']}) },
    onError:    () => toast.error('Delete failed. Remove all departments first.'),
  })

  // ── Department mutations ───────────────────────────────────
  const createDept = useMutation({
    mutationFn: () => studentsAPI.createDepartment(deptForm),
    onSuccess:  () => { toast.success('Department created!'); setShowDeptForm(false); setDeptForm({...EMPTY_DEPT}); qc.invalidateQueries({queryKey:['departments-list']}) },
    onError:    (e:any) => toast.error(e?.response?.data?.name?.[0]||'Failed.'),
  })
  const updateDept = useMutation({
    mutationFn: () => studentsAPI.updateDepartment(editDept.id, deptForm),
    onSuccess:  () => { toast.success('Department updated!'); setEditDept(null); setDeptForm({...EMPTY_DEPT}); qc.invalidateQueries({queryKey:['departments-list']}) },
    onError:    () => toast.error('Update failed.'),
  })
  const deleteDept = useMutation({
    mutationFn: (id:string) => studentsAPI.deleteDepartment(id),
    onSuccess:  () => { toast.success('Department deleted.'); qc.invalidateQueries({queryKey:['departments-list']}) },
    onError:    () => toast.error('Delete failed.'),
  })

  function openEditFac(fac:any) {
    setFacForm({ name:fac.name, code:fac.code||'', numeric_id:fac.numeric_id||'', description:fac.description||'' })
    setEditFac(fac); setShowFacForm(true)
  }
  function openEditDept(dept:any) {
    setDeptForm({ name:dept.name, code:dept.code||'', numeric_id:dept.numeric_id||'', faculty:dept.faculty||'', hod_name:dept.hod_name||'', description:dept.description||'' })
    setEditDept(dept); setShowDeptForm(true)
  }
  function cancelFac()  { setShowFacForm(false);  setEditFac(null);  setFacForm({...EMPTY_FAC})  }
  function cancelDept() { setShowDeptForm(false); setEditDept(null); setDeptForm({...EMPTY_DEPT}) }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <IconDepts size={20} className="text-purple-400"/>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Departments & Faculties</h2>
            <p className="text-xs text-white/40">{faculties.length} faculties · {departments.length} departments</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:'Faculties',    value:faculties.length,    accent:'#8B5CF6' },
          { label:'Departments',  value:departments.length,  accent:'#3B82F6' },
          { label:'Total Students',value:departments.reduce((s:number,d:any)=>s+(d.student_count||0),0), accent:'#00A85A' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {(['departments','faculties'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab===t?'bg-primary text-white':'text-white/45 hover:text-white/70'}`}>
            {t} ({t==='departments'?departments.length:faculties.length})
          </button>
        ))}
      </div>

      {/* ── DEPARTMENTS ── */}
      {tab==='departments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>showDeptForm&&!editDept?cancelDept():(cancelDept(),setShowDeptForm(true))}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${showDeptForm&&!editDept?'glass border border-white/[0.1] text-white/60':'btn-primary text-white'}`}>
              {showDeptForm&&!editDept?<><IconX size={13}/>Cancel</>:<><IconPlus size={13}/>Add Department</>}
            </button>
          </div>

          {showDeptForm && (
            <div className="glass border border-primary/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white">{editDept?'Edit Department':'New Department'}</h3>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-xs text-white/55">The <span className="text-amber-400 font-mono">Numeric ID</span> (DD) is required for automatic registration number generation. Use a unique 2-digit code, e.g. <span className="font-mono text-white">08</span>.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelCls}>Department Name *</label>
                  <input value={deptForm.name} onChange={e=>setDeptForm(f=>({...f,name:e.target.value}))} placeholder="Computer Science" className={inputCls}/></div>
                <div><label className={labelCls}>Code *</label>
                  <input value={deptForm.code} onChange={e=>setDeptForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="CSC" className={`${inputCls} font-mono uppercase`}/></div>
                <div><label className={labelCls}>Numeric ID (DD) *</label>
                  <input value={deptForm.numeric_id} maxLength={2} onChange={e=>setDeptForm(f=>({...f,numeric_id:e.target.value.replace(/\D/g,'').slice(0,2)}))} placeholder="08" className={`${inputCls} font-mono`}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Faculty *</label>
                  <select value={deptForm.faculty} onChange={e=>setDeptForm(f=>({...f,faculty:e.target.value}))} className={inputCls}>
                    <option value="">Select faculty…</option>
                    {faculties.map((fac:any)=><option key={fac.id} value={fac.id}>{fac.name}</option>)}
                  </select></div>
                <div><label className={labelCls}>HOD Name</label>
                  <input value={deptForm.hod_name} onChange={e=>setDeptForm(f=>({...f,hod_name:e.target.value}))} placeholder="Prof. Abubakar Sadiq" className={inputCls}/></div>
              </div>
              <div><label className={labelCls}>Description</label>
                <textarea value={deptForm.description} onChange={e=>setDeptForm(f=>({...f,description:e.target.value}))} rows={2} className={`${inputCls} resize-none`} placeholder="Brief description…"/></div>
              <div className="flex gap-3">
                <button onClick={()=>editDept?updateDept.mutate():createDept.mutate()}
                  disabled={!deptForm.name||!deptForm.code||!deptForm.faculty||!deptForm.numeric_id||createDept.isPending||updateDept.isPending}
                  className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                  <IconCheck size={14}/>{(createDept.isPending||updateDept.isPending)?'Saving…':editDept?'Update':'Create'}
                </button>
                <button onClick={cancelDept} className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Group departments by faculty */}
          {loadDept ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="glass rounded-2xl h-32 skeleton"/>)}</div>
          ) : faculties.map((fac:any, fi:number) => {
            const facDepts = departments.filter(d=>d.faculty===fac.id||d.faculty_name===fac.name)
            if (!facDepts.length) return null
            const accent = FAC_COLORS[fi%FAC_COLORS.length]
            return (
              <div key={fac.id} className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3" style={{background:`${accent}08`}}>
                  <div className="w-2 h-2 rounded-full" style={{background:accent}}/>
                  <h3 className="font-bold text-sm text-white">{fac.name}</h3>
                  <span className="text-[11px] text-white/40 ml-auto">{facDepts.length} dept{facDepts.length!==1?'s':''}</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {facDepts.map((d:any)=>(
                    <div key={d.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{d.name}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{background:`${accent}15`,color:accent}}>{d.code}</span>
                          {d.numeric_id
                            ? <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary-light border border-primary/25">ID:{d.numeric_id}</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">No Numeric ID</span>
                          }
                        </div>
                        {d.hod_name && <p className="text-xs text-white/40 mt-0.5">HOD: {d.hod_name}</p>}
                      </div>
                      <div className="flex gap-4 text-center hidden sm:flex">
                        {[
                          {label:'Students',value:d.student_count||0},
                          {label:'Staff',   value:d.lecturer_count||0},
                          {label:'Courses', value:d.course_count||0},
                        ].map(({label,value})=>(
                          <div key={label} className="glass rounded-lg px-3 py-2 min-w-[56px]">
                            <div className="text-sm font-bold text-white">{value}</div>
                            <div className="text-[9px] text-white/30 uppercase">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>openEditDept(d)} className="text-[11px] text-white/40 hover:text-primary-light flex items-center gap-1 transition-colors">
                          <IconEdit size={12}/> Edit
                        </button>
                        <button onClick={()=>window.confirm(`Delete ${d.name}?`)&&deleteDept.mutate(d.id)}
                          className="text-[11px] text-white/30 hover:text-red-400 flex items-center gap-1 transition-colors">
                          <IconTrash size={12}/> Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {departments.length===0&&!loadDept&&(
            <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
              <IconDepts size={40} className="text-white/15 mx-auto mb-3"/>
              <p className="text-white/40 text-sm">No departments yet. Add faculties first, then departments.</p>
            </div>
          )}
        </div>
      )}

      {/* ── FACULTIES ── */}
      {tab==='faculties' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>showFacForm&&!editFac?cancelFac():(cancelFac(),setShowFacForm(true))}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${showFacForm&&!editFac?'glass border border-white/[0.1] text-white/60':'btn-primary text-white'}`}>
              {showFacForm&&!editFac?<><IconX size={13}/>Cancel</>:<><IconPlus size={13}/>Add Faculty</>}
            </button>
          </div>

          {showFacForm && (
            <div className="glass border border-primary/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white">{editFac?'Edit Faculty':'New Faculty'}</h3>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-xs text-white/55">The <span className="text-amber-400 font-mono">Numeric ID</span> (FF) must be unique and 2 digits. It is embedded in every student registration number issued by this faculty, e.g. <span className="font-mono text-white">03</span>.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelCls}>Faculty Name *</label>
                  <input value={facForm.name} onChange={e=>setFacForm(f=>({...f,name:e.target.value}))} placeholder="Science & Technology" className={inputCls}/></div>
                <div><label className={labelCls}>Code *</label>
                  <input value={facForm.code} onChange={e=>setFacForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="FST" className={`${inputCls} font-mono uppercase`}/></div>
                <div><label className={labelCls}>Numeric ID (FF) *</label>
                  <input value={facForm.numeric_id} maxLength={2} onChange={e=>setFacForm(f=>({...f,numeric_id:e.target.value.replace(/\D/g,'').slice(0,2)}))} placeholder="03" className={`${inputCls} font-mono`}/></div>
              </div>
              <div><label className={labelCls}>Description</label>
                <textarea value={facForm.description} onChange={e=>setFacForm(f=>({...f,description:e.target.value}))} rows={2} className={`${inputCls} resize-none`} placeholder="Brief description…"/></div>
              <div className="flex gap-3">
                <button onClick={()=>editFac?updateFac.mutate():createFac.mutate()}
                  disabled={!facForm.name||!facForm.code||!facForm.numeric_id||createFac.isPending||updateFac.isPending}
                  className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                  <IconCheck size={14}/>{(createFac.isPending||updateFac.isPending)?'Saving…':editFac?'Update':'Create'}
                </button>
                <button onClick={cancelFac} className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {loadFac ? (
            <div className="grid sm:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="glass rounded-2xl h-32 skeleton"/>)}</div>
          ) : faculties.length===0 ? (
            <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
              <IconDepts size={40} className="text-white/15 mx-auto mb-3"/>
              <p className="text-white/40 text-sm">No faculties yet. Create your first faculty.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {faculties.map((fac:any, fi:number)=>{
                const accent = FAC_COLORS[fi%FAC_COLORS.length]
                const facDepts = departments.filter(d=>d.faculty===fac.id||d.faculty_name===fac.name)
                return (
                  <div key={fac.id} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-white">{fac.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{background:`${accent}15`,color:accent}}>{fac.code}</span>
                          {fac.numeric_id
                            ? <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary-light border border-primary/25">FF:{fac.numeric_id}</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">No Numeric ID</span>
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>openEditFac(fac)} className="text-[11px] text-white/40 hover:text-primary-light flex items-center gap-1 transition-colors"><IconEdit size={12}/> Edit</button>
                        <button onClick={()=>window.confirm(`Delete ${fac.name}? All departments will also be deleted.`)&&deleteFac.mutate(fac.id)}
                          className="text-[11px] text-white/30 hover:text-red-400 flex items-center gap-1 transition-colors"><IconTrash size={12}/> Del</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        {label:'Departments', value:facDepts.length},
                        {label:'Students',    value:fac.student_count||facDepts.reduce((s:number,d:any)=>s+(d.student_count||0),0)},
                        {label:'Lecturers',   value:fac.lecturer_count||facDepts.reduce((s:number,d:any)=>s+(d.lecturer_count||0),0)},
                      ].map(({label,value})=>(
                        <div key={label} className="glass rounded-lg py-2">
                          <div className="text-base font-extrabold text-white">{value}</div>
                          <div className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
