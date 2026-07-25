/**
 * FUGUSAU Admin — Staff & Lecturers Management
 * Full CRUD: Add, Edit, View staff members
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI } from '@/services/api'
import { IconSearch, IconEdit, IconDownload, IconCheck, IconPlus, IconX, IconWarning } from '@/components/icons'
import toast from 'react-hot-toast'

function IconStaff(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
      <line x1="12" y1="11" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )
}
function IconTrash(p: any) {
  return (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

const RANK_COLORS: Record<string, string> = {
  professor:            '#D4A017',
  'associate professor':'#F97316',
  'senior lecturer':    '#3B82F6',
  lecturer:             '#00A85A',
  'assistant lecturer': '#8B5CF6',
  'graduate assistant': '#EC4899',
}

const RANKS = [
  'Professor', 'Associate Professor', 'Senior Lecturer',
  'Lecturer', 'Assistant Lecturer', 'Graduate Assistant',
]

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '',
  rank: 'Lecturer', department: '', specialization: '',
  employee_id: '', gender: 'male', password: '',
}

export default function AdminStaffPage() {
  const [search,        setSearch]        = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [editMode,      setEditMode]      = useState(false)
  const [editId,        setEditId]        = useState<string | null>(null)
  const [form,          setForm]          = useState({ ...EMPTY_FORM })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selected,      setSelected]      = useState<any | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-lecturers', search],
    queryFn:  () => studentsAPI.getLecturers(),
  })
  const { data: deptData } = useQuery<any, any>({
    queryKey: ['departments-for-staff'],
    queryFn: () => studentsAPI.getDepartments(),
    enabled:  showModal,
  })

  const all: any[]  = data?.data?.results || data?.data || []
  const depts: any[] = deptData?.data?.results || deptData?.data || []
  const filtered = all.filter(l =>
    (l.full_name||l.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (l.email||'').toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (d: object) => studentsAPI.createStaff(d),
    onSuccess: () => { toast.success('Staff member created!'); qc.invalidateQueries({queryKey:['admin-lecturers']}); closeModal() },
    onError: (e: any) => {
      const msg = e?.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(', ') : 'Failed to create staff')
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({id, d}: {id: string; d: object}) => studentsAPI.updateStaff(id, d),
    onSuccess: () => { toast.success('Staff updated!'); qc.invalidateQueries({queryKey:['admin-lecturers']}); closeModal() },
    onError: (e: any) => {
      const msg = e?.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(', ') : 'Failed to update staff')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsAPI.delete(id),
    onSuccess: () => { toast.success('Staff removed'); qc.invalidateQueries({queryKey:['admin-lecturers']}); setConfirmDelete(null) },
    onError: () => toast.error('Failed to remove staff'),
  })

  function openAdd() {
    setForm({...EMPTY_FORM}); setEditMode(false); setEditId(null); setShowModal(true)
  }
  function openEdit(s: any) {
    setForm({
      first_name:     s.first_name  || s.full_name?.split(' ')[0] || '',
      last_name:      s.last_name   || s.full_name?.split(' ').slice(1).join(' ') || '',
      email:          s.email       || '',
      phone:          s.phone       || '',
      rank:           s.rank        || 'Lecturer',
      department:     s.department  || '',
      specialization: s.specialization || '',
      employee_id:    s.employee_id || '',
      gender:         s.gender      || 'male',
      password:       '',
    })
    setEditMode(true); setEditId(s.id); setSelected(null); setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditMode(false); setEditId(null); setForm({...EMPTY_FORM}) }

  function handleSubmit() {
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('First name, last name and email are required'); return
    }
    const payload: any = {
      first_name:     form.first_name,
      last_name:      form.last_name,
      email:          form.email,
      phone:          form.phone || undefined,
      rank:           form.rank,
      department:     form.department || undefined,
      specialization: form.specialization || undefined,
      employee_id:    form.employee_id || undefined,
      gender:         form.gender,
      role:           'lecturer',
    }
    if (!editMode && form.password) payload.password = form.password
    if (editMode && editId) updateMutation.mutate({ id: editId, d: payload })
    else createMutation.mutate(payload)
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <IconStaff size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Staff & Lecturers</h2>
            <p className="text-xs text-white/40">{filtered.length} staff members</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-all">
            <IconDownload size={14} /> Export
          </button>
          <button onClick={openAdd}
            className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
            <IconPlus size={14} /> Add Staff
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: all.length, accent: '#3B82F6' },
          { label: 'Professors',  value: all.filter(l=>(l.rank||'').toLowerCase().includes('professor')).length, accent:'#D4A017' },
          { label: 'Lecturers',   value: all.filter(l=>(l.rank||'').toLowerCase()==='lecturer').length, accent:'#00A85A' },
          { label: 'Departments', value: new Set(all.map(l=>l.department_name).filter(Boolean)).size, accent:'#8B5CF6' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,${accent},transparent)` }}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{ color: accent }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i)=><div key={i} className="glass rounded-2xl h-40 skeleton"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass border border-white/[0.07] rounded-2xl p-20 text-center">
          <IconStaff size={48} className="text-white/15 mx-auto mb-4"/>
          <p className="text-white/40 mb-4">No staff members yet.</p>
          <button onClick={openAdd}
            className="btn-primary rounded-xl px-5 py-2 text-xs font-bold text-white flex items-center gap-2 mx-auto">
            <IconPlus size={13}/> Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l: any) => {
            const rank  = l.rank || l.title || 'Lecturer'
            const color = RANK_COLORS[rank.toLowerCase()] || '#888'
            const init  = (l.full_name||l.name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()
            return (
              <div key={l.id} className="glass glass-hover border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background:`${color}20`, color, border:`1px solid ${color}35` }}>
                    {l.profile_photo ? <img src={l.profile_photo} alt="" className="w-full h-full rounded-xl object-cover"/> : init}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{l.full_name||l.name}</p>
                    <p className="text-xs text-white/40 truncate mt-0.5">{l.email}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                      style={{ background:`${color}15`, color, border:`1px solid ${color}30` }}>
                      {rank}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-white/40 mb-4">
                  <div className="flex justify-between">
                    <span>Department</span>
                    <span className="text-white/60 font-medium truncate ml-2 max-w-[140px]">{l.department_name||'—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Specialization</span>
                    <span className="text-white/60 font-medium truncate ml-2 max-w-[140px]">{l.specialization||'—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courses</span>
                    <span className="text-white/60 font-medium">{l.courses_count||0}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(l)}
                    className="flex-1 glass border border-white/[0.08] rounded-lg py-1.5 text-[11px] text-white/50 hover:text-white hover:border-primary/40 transition-all flex items-center justify-center gap-1">
                    <IconEdit size={11}/> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(l.id)}
                    className="flex-1 glass border border-white/[0.08] rounded-lg py-1.5 text-[11px] text-red-400/50 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-1">
                    <IconTrash size={11}/> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={closeModal}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                  <IconStaff size={18} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">{editMode ? 'Edit Staff Member' : 'Add Staff / Lecturer'}</h3>
                  <p className="text-xs text-white/40">{editMode ? 'Update staff information' : 'Register a new staff or lecturer account'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg glass border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-all">
                <IconX size={16} />
              </button>
            </div>

            <div className="px-7 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">First Name <span className="text-red-400">*</span></label>
                  <input value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))}
                    placeholder="e.g. Abubakar" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Last Name <span className="text-red-400">*</span></label>
                  <input value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))}
                    placeholder="e.g. Suleiman" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    type="email" placeholder="e.g. abubakar@fug.edu.ng"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                    placeholder="e.g. 08012345678"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Academic Rank</label>
                  <select value={form.rank} onChange={e=>setForm(f=>({...f,rank:e.target.value}))}
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                    {RANKS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Gender</label>
                  <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Department</label>
                {depts.length > 0 ? (
                  <select value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">— Select Department —</option>
                    {depts.map((d:any)=><option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                ) : (
                  <input value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}
                    placeholder="Department name or ID"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Specialization</label>
                  <input value={form.specialization} onChange={e=>setForm(f=>({...f,specialization:e.target.value}))}
                    placeholder="e.g. Machine Learning"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Employee ID</label>
                  <input value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))}
                    placeholder="e.g. FUG/STAFF/001"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-white/25"/>
                </div>
              </div>

              {!editMode && (
                <div>
                  <label className="text-[11px] text-white/35 uppercase tracking-wider block mb-1.5">Initial Password</label>
                  <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    type="password" placeholder="Leave blank to auto-generate"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-7 pb-7">
              <button onClick={closeModal}
                className="flex-1 glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={isBusy}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                {isBusy
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>
                  : <><IconCheck size={15}/> {editMode ? 'Save Changes' : 'Create Staff'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={() => setConfirmDelete(null)}>
          <div className="glass-strong border border-red-500/20 rounded-3xl p-7 w-full max-w-sm text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
              <IconWarning size={22} className="text-red-400"/>
            </div>
            <h3 className="text-lg font-extrabold text-white mb-2">Remove Staff Member?</h3>
            <p className="text-sm text-white/45 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 glass border border-white/[0.1] rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-colors">
                {deleteMutation.isPending ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
