/**
 * FUGUSAU Portal — Hostel (Full)
 *
 * GET  /hostel/              → hostel list (gender filter, amenities)
 * GET  /hostel/rooms/        → rooms (hostel, available filter)
 * POST /hostel/apply/        → { room_id }
 * GET  /hostel/my-allocation/ → current allocation
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hostelAPI } from '@/services/api'
import { useRole } from '@/hooks/useRole'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

// ── Icons ──────────────────────────────────────────────────────
const IconHostel  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconCheck   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconWarning = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconUser    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>

const STATUS_STYLE: Record<string,{cls:string;label:string}> = {
  approved: { cls:'bg-primary/15 text-primary-light border-primary/25',   label:'Approved'  },
  pending:  { cls:'bg-amber-500/15 text-amber-400 border-amber-500/25',   label:'Pending'   },
  rejected: { cls:'bg-red-500/15 text-red-400 border-red-500/25',         label:'Rejected'  },
  vacated:  { cls:'bg-white/10 text-white/40 border-white/15',            label:'Vacated'   },
}

function AmenityIcon({ name, size=11 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    WiFi: 'M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M1.5 9.5a15 15 0 0 1 21 0',
    Water: 'M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z',
    Generator: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'Air Conditioning': 'M20 4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4zm-8 4v8m-4-4h8',
    CCTV: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-10a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    Security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    Laundry: 'M3 5h18M3 21h18M5 5v16M19 5v16M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    Kitchen: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    Reading: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5zM6 6h10M6 10h10',
    'Study Room': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'
  }
  const d = paths[name] || 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white/45">
      <path d={d}/>
    </svg>
  )
}

export default function HostelPage() {
  const { isStudent } = useRole()
  const [genderFilter,    setGenderFilter]    = useState('')
  const [selectedHostel,  setSelectedHostel]  = useState<any>(null)
  const [selectedRoom,    setSelectedRoom]    = useState('')
  const [showApplyForm,   setShowApplyForm]   = useState(false)
  const qc = useQueryClient()

  // Current allocation
  const { data: allocData } = useQuery<any, any>({
    queryKey: ['my-allocation'],
    queryFn:  hostelAPI.getMyAllocation,
    retry:    false,
  })
  const allocation = allocData?.data

  // Hostels list
  const { data: hostelsData, isLoading: loadHostels } = useQuery<any, any>({
    queryKey: ['hostels', genderFilter],
    queryFn: () => hostelAPI.getHostels(genderFilter ? { gender: genderFilter } : {}),
    enabled:  !allocation || allocation?.status === 'rejected' || allocation?.status === 'vacated',
  })
  const hostels: any[] = hostelsData?.data?.results || hostelsData?.data || []

  // Rooms for selected hostel
  const { data: roomsData, isLoading: loadRooms } = useQuery<any, any>({
    queryKey: ['rooms', selectedHostel?.id],
    queryFn:  () => hostelAPI.getRooms({ hostel: selectedHostel?.id, available: true }),
    enabled:  !!selectedHostel,
  })
  const rooms: any[] = roomsData?.data?.results || roomsData?.data || []

  // Apply mutation
  const applyMut = useMutation({
    mutationFn: () => hostelAPI.apply(selectedRoom),
    onSuccess: () => {
      toast.success('Hostel application submitted! Await admin approval.')
      setShowApplyForm(false); setSelectedRoom(''); setSelectedHostel(null)
      qc.invalidateQueries({ queryKey:['my-allocation'] })
    },
    onError: (e:any) => toast.error(e?.response?.data?.error || 'Application failed. You may already have an allocation.'),
  })

  const hasActive = allocation && !['rejected','vacated'].includes(allocation.status)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
          <IconHostel size={20} className="text-purple-400"/>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Hostel Management</h2>
          <p className="text-xs text-white/40">
            {hasActive ? 'Your current accommodation' : 'Find and apply for university accommodation'}
          </p>
        </div>
      </div>

      {/* ── CURRENT ALLOCATION ── */}
      {allocation && (
        <div className={`glass border rounded-2xl overflow-hidden ${
          allocation.status==='approved'
            ? 'border-primary/25'
            : allocation.status==='pending'
            ? 'border-amber-500/25'
            : 'border-white/[0.07]'
        }`}>
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">My Accommodation</h3>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${STATUS_STYLE[allocation.status]?.cls}`}>
              {STATUS_STYLE[allocation.status]?.label}
            </span>
          </div>

          <div className="p-6">
            {allocation.status === 'approved' && (
              <div className="flex items-start gap-6 flex-wrap mb-5">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
                  <IconHostel size={32} className="text-purple-400"/>
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-white">{allocation.room?.hostel_name || allocation.hostel_name}</h4>
                  <p className="text-white/50 mt-1 text-base">Room <span className="font-bold text-white">{allocation.room?.room_number || allocation.room_number}</span></p>
                  <p className="text-xs text-white/35 mt-1">Session: {allocation.session_name}</p>
                </div>
              </div>
            )}

            {allocation.status === 'pending' && (
              <div className="flex items-center gap-3 p-4 glass border border-amber-500/20 rounded-xl">
                <IconWarning size={18} className="text-amber-400 flex-shrink-0"/>
                <div>
                  <p className="text-sm font-semibold text-white">Application Under Review</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Room: {allocation.room?.room_number || allocation.room_number} ·
                    Hostel: {allocation.room?.hostel_name || allocation.hostel_name} ·
                    Applied: {formatDate(allocation.allocated_at, true)}
                  </p>
                </div>
              </div>
            )}

            {allocation.status === 'rejected' && (
              <div className="flex items-center gap-3 p-4 glass border border-red-500/20 rounded-xl">
                <IconWarning size={18} className="text-red-400 flex-shrink-0"/>
                <div>
                  <p className="text-sm font-semibold text-white">Application Rejected</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {allocation.rejection_reason || 'Contact the Student Affairs office for details.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              {[
                { label:'Room No.',    value: allocation.room?.room_number || allocation.room_number || '—' },
                { label:'Hostel',      value: allocation.room?.hostel_name || allocation.hostel_name || '—' },
                { label:'Session',     value: allocation.session_name || '—' },
                { label:'Applied',     value: formatDate(allocation.allocated_at, true) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── APPLY SECTION (only if no active allocation) ── */}
      {(!allocation || ['rejected','vacated'].includes(allocation?.status)) && (
        <>
          {/* Gender filter */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="font-bold text-sm text-white">Available Hostels</h3>
            <div className="flex gap-2">
              {['', 'male', 'female', 'mixed'].map(g => (
                <button key={g} onClick={() => setGenderFilter(g)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                    genderFilter === g
                      ? 'bg-primary/20 border-primary/30 text-primary-light'
                      : 'glass border-white/[0.07] text-white/40 hover:text-white/70'
                  }`}>
                  {g || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Hostel cards */}
          {loadHostels ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length:3}).map((_,i)=><div key={i} className="glass rounded-2xl h-48 skeleton"/>)}
            </div>
          ) : hostels.length === 0 ? (
            <div className="glass border border-white/[0.07] rounded-2xl p-16 text-center">
              <IconHostel size={48} className="text-white/15 mx-auto mb-4"/>
              <p className="text-white/40">No hostels available{genderFilter ? ` for ${genderFilter}` : ''}.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hostels.map((hostel:any) => {
                const available = hostel.available_rooms ?? 0
                const occupied  = hostel.occupied_rooms  ?? 0
                const capacity  = hostel.capacity        ?? 0
                const pct       = capacity > 0 ? Math.round((occupied/capacity)*100) : 0
                const isSelected= selectedHostel?.id === hostel.id

                return (
                  <div key={hostel.id}
                    className={`glass border rounded-2xl overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary/40 shadow-glow-sm'
                        : 'border-white/[0.07] hover:border-primary/25'
                    }`}
                    onClick={() => {
                      setSelectedHostel(isSelected ? null : hostel)
                      setSelectedRoom('')
                      setShowApplyForm(!isSelected)
                    }}>
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/[0.06]"
                      style={{background:'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(0,0,0,0))'}}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white">{hostel.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          hostel.gender==='male'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                            : hostel.gender==='female'
                            ? 'bg-pink-500/15 text-pink-400 border-pink-500/25'
                            : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                        }`}>
                          {hostel.gender}
                        </span>
                      </div>
                      {hostel.warden_name && (
                        <p className="text-xs text-white/35 mt-1 flex items-center gap-1">
                          <IconUser size={10}/> Warden: {hostel.warden_name}
                        </p>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Occupancy bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-white/40">Occupancy</span>
                          <span className={`font-bold ${available===0?'text-red-400':available<5?'text-amber-400':'text-primary-light'}`}>
                            {available} rooms available
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width:`${pct}%`,
                              background: pct>85?'#EF4444':pct>60?'#D4A017':'#00A85A'
                            }}/>
                        </div>
                        <div className="flex justify-between text-[10px] text-white/25 mt-1">
                          <span>{occupied} occupied</span>
                          <span>{capacity} total</span>
                        </div>
                      </div>

                      {/* Amenities */}
                      {hostel.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {hostel.amenities.slice(0,5).map((a:string) => (
                            <span key={a} className="text-[10px] px-2 py-0.5 rounded-full glass border border-white/[0.08] text-white/50 flex items-center gap-1.5">
                              <AmenityIcon name={a} size={11}/>
                              <span>{a}</span>
                            </span>
                          ))}
                          {hostel.amenities.length > 5 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full glass border border-white/[0.08] text-white/35">
                              +{hostel.amenities.length-5} more
                            </span>
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <div className="text-[11px] text-primary-light flex items-center gap-1 font-semibold">
                          <IconCheck size={11}/> Selected — choose a room below
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Room selection */}
          {selectedHostel && showApplyForm && (
            <div className="glass border border-primary/20 rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-sm text-white">
                Select a Room — {selectedHostel.name}
              </h3>

              {loadRooms ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {Array.from({length:10}).map((_,i)=><div key={i} className="h-12 skeleton rounded-xl"/>)}
                </div>
              ) : rooms.length === 0 ? (
                <p className="text-white/40 text-sm">No available rooms in this hostel.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
                    {rooms.map((room:any) => (
                      <button key={room.id} onClick={()=>setSelectedRoom(room.id)}
                        className={`rounded-xl py-3 text-center text-xs font-bold transition-all border ${
                          selectedRoom===room.id
                            ? 'bg-primary/20 border-primary/40 text-primary-light'
                            : 'glass border-white/[0.07] text-white/60 hover:border-primary/25'
                        }`}>
                        <div className="text-sm font-extrabold">{room.room_number}</div>
                        <div className="text-[10px] text-white/35 mt-0.5">{room.capacity} beds</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={()=>applyMut.mutate()}
                      disabled={!selectedRoom||applyMut.isPending}
                      className="btn-primary rounded-xl px-7 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                      {applyMut.isPending
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</>
                        : <><IconCheck size={14}/>Apply for Room {rooms.find(r=>r.id===selectedRoom)?.room_number}</>}
                    </button>
                    <button onClick={()=>{setShowApplyForm(false);setSelectedRoom('');setSelectedHostel(null)}}
                      className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-white/25">
                    Your application will be reviewed by the Hostel Management Office. You will be notified of the decision.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
