/**
 * FUGUSAU Admin — Admissions Management (Full Featured)
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { admissionAPI } from '@/services/api'
import api from '@/services/api'
import { downloadBlob } from '@/utils'
import toast from 'react-hot-toast'
import { IconSearch, IconCheck, IconWarning, IconDownload, IconX } from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

const STATUS_META: Record<string, { cls: string; label: string; dot: string }> = {
  submitted:   { cls:'bg-amber-500/15 text-amber-400 border-amber-500/25',    label:'Submitted',   dot:'bg-amber-400'   },
  screening:   { cls:'bg-blue-500/15 text-blue-400 border-blue-500/25',       label:'Screening',   dot:'bg-blue-400'    },
  shortlisted: { cls:'bg-purple-500/15 text-purple-400 border-purple-500/25', label:'Shortlisted', dot:'bg-purple-400'  },
  offered:     { cls:'bg-primary/15 text-primary-light border-primary/25',    label:'Offer Sent',  dot:'bg-primary'     },
  accepted:    { cls:'bg-primary/20 text-primary-light border-primary/35',    label:'Accepted',    dot:'bg-primary'     },
  rejected:    { cls:'bg-red-500/15 text-red-400 border-red-500/25',          label:'Rejected',    dot:'bg-red-400'     },
  waitlisted:  { cls:'bg-orange-500/15 text-orange-400 border-orange-500/25', label:'Waitlisted',  dot:'bg-orange-400'  },
}
const STATUS_ORDER = ['submitted','screening','shortlisted','offered','accepted','rejected','waitlisted']
const ACTIONS: Record<string, string[]> = {
  submitted:   ['screening','shortlist','waitlist','reject'],
  screening:   ['shortlist','waitlist','reject'],
  shortlisted: ['offer','waitlist','reject'],
  waitlisted:  ['shortlist','reject'],
  offered:     ['reject'],
}
const ACTION_META: Record<string, { label: string; cls: string }> = {
  screening: { label:'Move to Screening', cls:'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'      },
  shortlist: { label:'Shortlist',         cls:'border-purple-500/30 text-purple-400 hover:bg-purple-500/10' },
  waitlist:  { label:'Waitlist',          cls:'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' },
  offer:     { label:'Send Offer',        cls:'border-primary/30 text-primary-light hover:bg-primary/10'    },
  reject:    { label:'Reject',            cls:'border-red-500/30 text-red-400 hover:bg-red-500/10'          },
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-white font-medium">{value || '—'}</div>
    </div>
  )
}

export default function AdminAdmissionsPage() {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter,   setDeptFilter]   = useState('')
  const [selected,     setSelected]     = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab,    setActiveTab]    = useState<string>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-admissions'],
    queryFn:  () => api.get('/admissions/'),
    refetchInterval: 30000,
  })

  const applications: any[] = data?.data?.results ?? data?.data ?? []

  const filtered = applications.filter((a: any) => {
    const name = `${a.first_name||''} ${a.last_name||''}`.toLowerCase()
    const matchSearch = !search ||
      name.includes(search.toLowerCase()) ||
      (a.jamb_reg_no||'').toLowerCase().includes(search.toLowerCase()) ||
      (a.application_number||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = activeTab === 'all' ? (!statusFilter || a.status === statusFilter) : a.status === activeTab
    const matchDept   = !deptFilter || a.first_choice_dept_name === deptFilter
    return matchSearch && matchStatus && matchDept
  })

  const departments = [...new Set(applications.map((a: any) => a.first_choice_dept_name).filter(Boolean))]
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = applications.filter((a: any) => a.status === s).length
    return acc
  }, {} as Record<string, number>)

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      if (action === 'offer')  return admissionAPI.offerAdmission(id)
      if (action === 'reject') return admissionAPI.rejectAdmission(id)
      return api.post(`/admissions/${id}/status/`, { action, reason })
    },
    onSuccess: (_, vars) => {
      toast.success(`Application ${vars.action}ed successfully!`)
      qc.invalidateQueries({ queryKey: ['admin-admissions'] })
      setSelected(null); setRejectReason('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Action failed'),
  })

  async function handleExport() {
    try {
      const res = await api.get('/admissions/', { params: { export: 'csv' }, responseType: 'blob' })
      downloadBlob(new Blob([res.data]), 'admissions.csv')
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Admission Applications</h2>
            <p className="text-xs text-white/40">{applications.length} applications · 2025/2026 Session</p>
          </div>
        </div>
        <button onClick={handleExport} className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 transition-all">
          <IconDownload size={14}/> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STATUS_ORDER.map(s => {
          const meta = STATUS_META[s]
          return (
            <button key={s} onClick={() => setActiveTab(activeTab === s ? 'all' : s)}
              className={`glass border rounded-xl p-3 text-left transition-all ${activeTab===s?'border-white/25 bg-white/[0.08]':'border-white/[0.07] hover:border-white/15'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                <span className="text-[10px] text-white/40 uppercase tracking-wider truncate">{meta.label}</span>
              </div>
              <div className="text-xl font-extrabold text-white">{counts[s]||0}</div>
            </button>
          )
        })}
      </div>

      <div className="hidden md:flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, JAMB No…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {STATUS_ORDER.map(s=><option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Departments</option>
          {departments.map((d: any)=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Mobile search */}
      <div className="md:hidden">
        <MobileToolbar search={search} onSearchChange={setSearch} placeholder="Search name, JAMB No…" />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-white/15 mx-auto mb-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="text-white/40 text-sm">No applications found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{filtered.length} applications</MobileListMeta>
            {filtered.map((a: any) => {
              const meta = STATUS_META[a.status] || STATUS_META.submitted
              const actions = ACTIONS[a.status] || []
              return (
                <MobileRow
                  key={a.id}
                  onTap={() => setSelected(a)}
                  leading={`${a.first_name?.[0] ?? ''}${a.last_name?.[0] ?? ''}`.toUpperCase()}
                  leadingClassName="bg-orange-500/15 text-orange-400"
                  title={`${a.first_name} ${a.last_name}`}
                  subtitle={a.email}
                  caption={`${a.application_number || a.jamb_reg_no || '—'} · ${a.first_choice_dept_name || a.course_choice || '—'}`}
                  badge={{ label: meta.label, className: meta.cls }}
                  footer={actions.slice(0, 2).map(act => (
                    <MobileMiniAction
                      key={act}
                      label={ACTION_META[act]?.label}
                      className="bg-white/[0.06] text-white/60"
                      onClick={() => actionMutation.mutate({ id: a.id, action: act })}
                    />
                  ))}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center"><svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-white/15 mx-auto mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p className="text-white/40">No applications found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['Applicant','App No.','1st Choice','JAMB Score','Status','Actions'].map(h=>(
                    <th key={h} className={`px-5 py-3.5 font-semibold text-left ${h==='JAMB Score'?'text-center hidden md:table-cell':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((a: any) => {
                  const meta   = STATUS_META[a.status] || STATUS_META.submitted
                  const actions = ACTIONS[a.status] || []
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <button onClick={()=>setSelected(a)} className="text-left">
                          <div className="font-semibold text-xs text-white hover:text-primary-light transition-colors">{a.first_name} {a.last_name}</div>
                          <div className="text-[11px] text-white/40">{a.email}</div>
                        </button>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/50">{a.application_number||a.jamb_reg_no}</td>
                      <td className="px-5 py-3.5 text-xs text-white/60 max-w-[140px] truncate">{a.first_choice_dept_name||a.course_choice||'—'}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-white hidden md:table-cell">{a.jamb_score}</td>
                      <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={()=>setSelected(a)} className="text-[11px] text-white/40 hover:text-white font-semibold">View</button>
                          {actions.slice(0,2).map(act=>(
                            <button key={act} onClick={()=>actionMutation.mutate({id:a.id,action:act})} disabled={actionMutation.isPending}
                              className={`text-[11px] font-bold glass border rounded-lg px-2 py-1 disabled:opacity-40 transition-colors ${ACTION_META[act]?.cls}`}>
                              {ACTION_META[act]?.label}
                            </button>
                          ))}
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)'}} onClick={()=>{setSelected(null);setRejectReason('')}}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-lg font-extrabold text-white">{selected.first_name} {selected.last_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/40 font-mono">{selected.application_number||selected.jamb_reg_no}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_META[selected.status]?.cls||''}`}>{STATUS_META[selected.status]?.label||selected.status}</span>
                </div>
              </div>
              <button onClick={()=>{setSelected(null);setRejectReason('')}} className="w-8 h-8 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/50 hover:text-white"><IconX size={16}/></button>
            </div>
            <div className="px-7 py-6 grid grid-cols-2 gap-5">
              <InfoRow label="Email"      value={selected.email}/>
              <InfoRow label="Phone"      value={selected.phone}/>
              <InfoRow label="JAMB No."   value={selected.jamb_reg_no}/>
              <InfoRow label="JAMB Score" value={selected.jamb_score}/>
              <InfoRow label="Programme"  value={selected.programme}/>
              <InfoRow label="Entry Type" value={selected.entry_type}/>
              <InfoRow label="1st Choice" value={selected.first_choice_dept_name||selected.first_choice_dept}/>
              <InfoRow label="2nd Choice" value={selected.second_choice_dept_name||selected.second_choice_dept}/>
              <InfoRow label="State"      value={selected.state_of_origin}/>
              <InfoRow label="LGA"        value={selected.lga}/>
              <InfoRow label="Applied"    value={selected.created_at?.slice(0,10)}/>
              <InfoRow label="WAEC No."   value={selected.waec_reg_no}/>
            </div>
            {ACTIONS[selected.status]?.length > 0 && (
              <div className="px-7 pb-7 border-t border-white/[0.06] pt-5 space-y-4">
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Admin Actions</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS[selected.status].map(act=>(
                    <button key={act}
                      onClick={()=>{
                        if(act==='reject'&&!rejectReason.trim()){toast.error('Enter rejection reason');return}
                        actionMutation.mutate({id:selected.id,action:act,reason:rejectReason})
                      }}
                      disabled={actionMutation.isPending}
                      className={`glass border rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40 transition-all ${ACTION_META[act]?.cls}`}>
                      {actionMutation.isPending?'Processing…':ACTION_META[act]?.label}
                    </button>
                  ))}
                </div>
                {ACTIONS[selected.status].includes('reject') && (
                  <input value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
                    placeholder="Rejection reason (required for reject)"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
