/**
 * FUGUSAU Admin — Notifications Management
 * Broadcast to all / by role, view all system notifications
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '@/services/api'
import { relativeTime } from '@/utils'
import toast from 'react-hot-toast'

const IconBell  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
const IconSend  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconCheck = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconUsers = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>

const TYPE_COLORS: Record<string,string> = {
  info:    '#3B82F6',
  success: '#00A85A',
  warning: '#D4A017',
  danger:  '#EF4444',
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<'broadcast'|'list'>('broadcast')
  const [form, setForm] = useState({
    title: '',
    message: '',
    notif_type: 'info',
    target_role: 'all',
  })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<any, any>({
    queryKey: ['admin-notifications'],
    queryFn:  notificationsAPI.getAll,
    enabled:  tab === 'list',
  })
  const notifications: any[] = data?.data?.results || data?.data || []

  const broadcastMut = useMutation({
    mutationFn: () => notificationsAPI.broadcast({
      title:       form.title,
      message:     form.message,
      notif_type:  form.notif_type,
      role_filter: form.target_role,
    }),
    onSuccess: () => {
      toast.success('Notification broadcast successfully!')
      setForm({ title:'', message:'', notif_type:'info', target_role:'all' })
      qc.invalidateQueries({ queryKey:['admin-notifications'] })
    },
    onError: (e:any) => toast.error(e?.response?.data?.detail || 'Broadcast failed.'),
  })

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
          <IconBell size={20} className="text-blue-400"/>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Notifications</h2>
          <p className="text-xs text-white/40">Broadcast announcements to students, staff or everyone</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07] w-fit">
        {([
          { key:'broadcast', label:'Broadcast Message', Icon:IconSend  },
          { key:'list',      label:'All Notifications', Icon:IconBell  },
        ] as const).map(({key,label,Icon})=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab===key?'bg-primary text-white':'text-white/45 hover:text-white/70'}`}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* ── BROADCAST ── */}
      {tab==='broadcast' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-7 space-y-5">
          <h3 className="font-bold text-sm text-white">Send Broadcast Notification</h3>

          {/* Target role */}
          <div>
            <label className={labelCls}>Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value:'all',      label:'Everyone',     Icon:IconUsers },
                { value:'student',  label:'Students Only',Icon:IconUsers },
                { value:'lecturer', label:'Lecturers',    Icon:IconUsers },
                { value:'admin',    label:'Admins Only',  Icon:IconUsers },
              ].map(({ value, label, Icon }) => (
                <button key={value} onClick={()=>setForm(f=>({...f,target_role:value}))}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all border ${
                    form.target_role===value
                      ? 'bg-primary/15 text-primary-light border-primary/30'
                      : 'glass border-white/[0.07] text-white/50 hover:text-white/80'
                  }`}>
                  <Icon size={13}/> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Notification Type</label>
            <div className="flex gap-2">
              {['info','success','warning','danger'].map(type=>(
                <button key={type} onClick={()=>setForm(f=>({...f,notif_type:type}))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    form.notif_type===type ? 'text-white' : 'glass border-white/[0.07] text-white/40 hover:text-white/70'
                  }`}
                  style={form.notif_type===type ? {
                    background:`${TYPE_COLORS[type]}25`,
                    borderColor:`${TYPE_COLORS[type]}50`,
                    color:TYPE_COLORS[type],
                  } : {}}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              placeholder="Important announcement…" className={inputCls}/>
          </div>

          {/* Message */}
          <div>
            <label className={labelCls}>Message *</label>
            <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
              rows={4} placeholder="Write your message here…"
              className={`${inputCls} resize-none`}/>
            <p className="text-[11px] text-white/30 mt-1">{form.message.length} characters</p>
          </div>

          {/* Preview */}
          {(form.title||form.message) && (
            <div className="glass rounded-xl p-4 border"
              style={{borderColor:`${TYPE_COLORS[form.notif_type]}30`,background:`${TYPE_COLORS[form.notif_type]}08`}}>
              <p className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Preview</p>
              <p className="text-sm font-bold text-white">{form.title||'(no title)'}</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{form.message||'(no message)'}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                  style={{background:`${TYPE_COLORS[form.notif_type]}20`,color:TYPE_COLORS[form.notif_type]}}>
                  {form.notif_type}
                </span>
                <span className="text-[10px] text-white/30">→ {form.target_role==='all'?'All users':form.target_role+'s'}</span>
              </div>
            </div>
          )}

          <button onClick={()=>broadcastMut.mutate()}
            disabled={!form.title||!form.message||broadcastMut.isPending}
            className="btn-primary rounded-xl px-8 py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
            {broadcastMut.isPending
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending…</>
              : <><IconSend size={15}/>Send to {form.target_role==='all'?'Everyone':form.target_role+'s'}</>}
          </button>
        </div>
      )}

      {/* ── LIST ── */}
      {tab==='list' && (
        <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm text-white">All Notifications ({notifications.length})</h3>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 skeleton rounded-xl"/>)}</div>
          ) : notifications.length===0 ? (
            <div className="p-16 text-center">
              <IconBell size={40} className="text-white/15 mx-auto mb-3"/>
              <p className="text-white/40 text-sm">No notifications sent yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
              {notifications.map((n:any)=>{
                const color = TYPE_COLORS[n.notif_type]||'#3B82F6'
                return (
                  <div key={n.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background:color}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-white">{n.title}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{background:`${color}18`,color,border:`1px solid ${color}30`}}>
                          {n.notif_type}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">{n.message}</p>
                      <div className="flex gap-3 mt-1.5 text-[11px] text-white/30">
                        <span>By {n.created_by_name||'System'}</span>
                        <span>·</span>
                        <span>{relativeTime(n.created_at)}</span>
                      </div>
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
