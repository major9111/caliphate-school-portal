/**
 * FUGUSAU Admin — Hostel Management
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hostelAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { IconCheck, IconWarning, IconSearch, IconUser } from '@/components/icons'
import { MobileToolbar, MobileRow, MobileListMeta, MobileMiniAction } from '@/components/mobile'

function IconHostel(p: any) {
  return (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

const STATUS_META: Record<string,{cls:string}> = {
  approved: { cls:'bg-primary/15 text-primary-light border-primary/25' },
  pending:  { cls:'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  rejected: { cls:'bg-red-500/15 text-red-400 border-red-500/25'       },
  vacated:  { cls:'bg-white/10 text-white/40 border-white/15'          },
}

export default function AdminHostelPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-allocations'],
    queryFn:  hostelAPI.getAllAllocations,
  })
  const { data: hostelsData } = useQuery<any, any>({
    queryKey: ['hostels-admin'],
    queryFn:  () => hostelAPI.getHostels({}),
  })

  const allocations: any[] = data?.data?.results || data?.data || []
  const hostels: any[]     = hostelsData?.data?.results || hostelsData?.data || []

  const filtered = allocations.filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!search || (a.student_name||'').toLowerCase().includes(search.toLowerCase()) ||
                (a.room_number||'').toLowerCase().includes(search.toLowerCase()))
  )

  const approveMutation = useMutation({
    mutationFn: (id: string) => hostelAPI.approveAllocation(id),
    onSuccess:  () => { toast.success('Allocation approved!'); qc.invalidateQueries({queryKey:['admin-allocations']}) },
    onError:    () => toast.error('Failed.'),
  })
  const vacateMutation = useMutation({
    mutationFn: (id: string) => hostelAPI.vacateRoom(id),
    onSuccess:  () => { toast.success('Room vacated.'); qc.invalidateQueries({queryKey:['admin-allocations']}) },
    onError:    () => toast.error('Failed.'),
  })

  const pending  = allocations.filter(a=>a.status==='pending').length
  const approved = allocations.filter(a=>a.status==='approved').length
  const occupied = allocations.filter(a=>a.status==='approved').length
  const capacity = hostels.reduce((s:number,h:any)=>s+(h.capacity||0),0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
          <IconHostel size={20} className="text-purple-400"/>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Hostel Management</h2>
          <p className="text-xs text-white/40">{hostels.length} hostels · {pending} pending approvals</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Hostels',    value:hostels.length, accent:'#8B5CF6' },
          { label:'Allocated',        value:approved,       accent:'#00A85A' },
          { label:'Pending',          value:pending,        accent:'#D4A017' },
          { label:'Capacity',         value:capacity||0,    accent:'#3B82F6' },
        ].map(({label,value,accent})=>(
          <div key={label} className="glass border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
            <div className="text-xs text-white/40 mb-1">{label}</div>
            <div className="text-3xl font-extrabold" style={{color:accent}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Hostel overview grid */}
      {hostels.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((h:any)=>{
            const occ = allocations.filter(a=>a.hostel_name===h.name&&a.status==='approved').length
            const pct = h.capacity ? Math.round((occ/h.capacity)*100) : 0
            const color = h.gender==='male' ? '#3B82F6' : '#EC4899'
            return (
              <div key={h.id} className="glass border border-white/[0.07] rounded-2xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-white">{h.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 capitalize"
                      style={{background:`${color}18`,color,border:`1px solid ${color}30`}}>{h.gender}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-white">{occ}/{h.capacity}</div>
                    <div className="text-[10px] text-white/40">Occupied</div>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${pct}%`,background:`linear-gradient(90deg,${color}99,${color})`}}/>
                </div>
                <p className="text-[11px] text-white/30 mt-2">{pct}% capacity used</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Pending alert */}
      {pending > 0 && (
        <div className="glass border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3">
          <IconWarning size={16} className="text-amber-400 flex-shrink-0"/>
          <p className="text-sm text-amber-400"><span className="font-bold">{pending}</span> hostel applications are awaiting your approval.</p>
        </div>
      )}

      {/* Mobile filters */}
      <div className="md:hidden">
        <MobileToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search student or room…"
          chips={[
            { value: '', label: 'All Status' },
            ...['pending', 'approved', 'rejected', 'vacated'].map(s => ({ value: s, label: s })),
          ]}
          activeChip={statusFilter}
          onChipChange={setStatusFilter}
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student or room…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
          <option value="">All Status</option>
          {['pending','approved','rejected','vacated'].map(s=>(
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 skeleton rounded-2xl"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass border border-white/[0.07] rounded-2xl p-14 text-center">
            <IconHostel size={40} className="text-white/15 mx-auto mb-3"/>
            <p className="text-white/40 text-sm">No allocations found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <MobileListMeta>{filtered.length} allocations</MobileListMeta>
            {filtered.map((a: any) => {
              const meta = STATUS_META[a.status] || STATUS_META.pending
              return (
                <MobileRow
                  key={a.id}
                  chevron={false}
                  leading={<IconUser size={16} />}
                  leadingClassName="bg-purple-500/15 text-purple-400"
                  title={a.student_name}
                  subtitle={`${a.hostel_name} · Room ${a.room_number}`}
                  caption={`${a.matric_number} · ${a.session_name || '—'}`}
                  badge={{ label: a.status, className: `capitalize ${meta.cls}` }}
                  footer={
                    a.status === 'pending' ? (
                      <MobileMiniAction label="Approve" icon={<IconCheck size={11} />} onClick={() => approveMutation.mutate(a.id)} />
                    ) : a.status === 'approved' ? (
                      <MobileMiniAction label="Vacate" icon={<IconWarning size={11} />} className="bg-red-500/15 text-red-400" onClick={() => vacateMutation.mutate(a.id)} />
                    ) : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Allocations table */}
      <div className="hidden md:block glass border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : filtered.length===0 ? (
          <div className="p-20 text-center"><IconHostel size={48} className="text-white/15 mx-auto mb-4"/><p className="text-white/40">No allocations found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                  {['Student','Hostel','Room','Session','Status','Actions'].map(h=>(
                    <th key={h} className={`px-5 py-3.5 font-semibold text-left ${['Session'].includes(h)?'hidden md:table-cell':''} ${h==='Status'?'text-center':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((a:any)=>{
                  const meta = STATUS_META[a.status]||STATUS_META.pending
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs text-white">{a.student_name}</div>
                        <div className="text-[11px] text-white/40 font-mono">{a.matric_number}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/60">{a.hostel_name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-white/80">{a.room_number}</td>
                      <td className="px-5 py-3.5 text-xs text-white/40 hidden md:table-cell">{a.session_name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${meta.cls}`}>{a.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-3">
                          {a.status==='pending' && (
                            <button onClick={()=>approveMutation.mutate(a.id)}
                              disabled={approveMutation.isPending}
                              className="text-[11px] text-primary-light font-bold flex items-center gap-1 disabled:opacity-40">
                              <IconCheck size={11}/> Approve
                            </button>
                          )}
                          {a.status==='approved' && (
                            <button onClick={()=>vacateMutation.mutate(a.id)}
                              disabled={vacateMutation.isPending}
                              className="text-[11px] text-red-400 font-bold flex items-center gap-1 disabled:opacity-40">
                              <IconWarning size={11}/> Vacate
                            </button>
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
    </div>
  )
}
