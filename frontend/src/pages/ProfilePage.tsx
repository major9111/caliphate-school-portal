/**
 * FUGUSAU Portal — Profile Page (Full)
 *
 * GET/PATCH /auth/me/              → user profile
 * POST      /auth/change-password/ → { old_password, new_password }
 * GET       /auth/2fa/status/      → { enabled, method }
 * POST      /auth/2fa/setup/       → { method } → { qr_code, secret }
 * POST      /auth/2fa/verify/      → { code }   → enable 2FA
 * POST      /auth/2fa/disable/     → { code }   → disable 2FA
 * GET       /students/profile/     → student academic details
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, studentsAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useRole } from '@/hooks/useRole'
import toast from 'react-hot-toast'
import api from '@/services/api'

// ── Icons ──────────────────────────────────────────────────────
const IconUser    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconLock    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const IconGrad    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
const IconCheck   = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12"/></svg>
const IconEdit    = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconShield  = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconWarning = (p:any)=><svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 00 1.71 3h16.94a2 2 0 00 1.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>

function Field({ label, value }: { label:string; value?:string|number|null }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-1">{label}</div>
      <div className="text-sm text-white font-medium">{value || '—'}</div>
    </div>
  )
}

const STATUS_CLS: Record<string,string> = {
  active:    'bg-primary/15 text-primary-light border-primary/25',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/25',
  graduated: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  deferred:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
}

type Tab = 'personal' | 'academic' | 'security'

export default function ProfilePage() {
  const { user, fetchMe }   = useAuthStore()
  const { isStudent }       = useRole()
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [editing,   setEditing]   = useState(false)
  const qc = useQueryClient()

  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', phone: '', bio: '',
  })

  // Password form
  const [pwForm, setPwForm] = useState({
    old_password: '', new_password: '', confirm: ''
  })
  const [pwError, setPwError] = useState('')

  // 2FA
  const [twoFACode,    setTwoFACode]    = useState('')
  const [twoFASetup,   setTwoFASetup]   = useState<any>(null)
  const [showDisable,  setShowDisable]  = useState(false)

  const inputCls = 'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none'
  const labelCls = 'text-[11px] text-white/35 uppercase tracking-wider block mb-1.5'

  // Queries
  const { data: studentRes } = useQuery<any, any>({
    queryKey: ['student-profile'],
    queryFn:  studentsAPI.getProfile,
    enabled:  isStudent,
  })
  const { data: twoFAStatusRes, refetch: refetchTwoFA } = useQuery<any, any>({
    queryKey: ['2fa-status'],
    queryFn:  () => api.get('/auth/2fa/status/'),
    enabled:  activeTab === 'security',
  })

  const profile  = studentRes?.data
  const twoFASt  = twoFAStatusRes?.data

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'U'

  // Mutations
  const updateMut = useMutation({
    mutationFn: () => authAPI.updateProfile(editForm),
    onSuccess: () => {
      toast.success('Profile updated!')
      setEditing(false)
      fetchMe()
    },
    onError: () => toast.error('Update failed.'),
  })

  const pwMut = useMutation({
    mutationFn: () => {
      if (pwForm.new_password !== pwForm.confirm) {
        setPwError('Passwords do not match.')
        throw new Error('Mismatch')
      }
      if (pwForm.new_password.length < 8) {
        setPwError('Password must be at least 8 characters.')
        throw new Error('Too short')
      }
      setPwError('')
      return authAPI.changePassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setPwForm({ old_password:'', new_password:'', confirm:'' })
    },
    onError: (e:any) => {
      const d = e?.response?.data
      setPwError(d?.old_password?.[0] || d?.detail || pwError || 'Password change failed.')
    },
  })

  const setup2FAMut = useMutation({
    mutationFn: () => api.post('/auth/2fa/setup/', { method: 'totp' }),
    onSuccess: (res) => setTwoFASetup((res as any)?.data),
    onError: () => toast.error('2FA setup failed.'),
  })

  const verify2FAMut = useMutation({
    mutationFn: () => api.post('/auth/2fa/verify/', { code: twoFACode }),
    onSuccess: () => {
      toast.success('2FA enabled successfully!')
      setTwoFASetup(null); setTwoFACode('')
      refetchTwoFA()
    },
    onError: () => toast.error('Invalid code. Try again.'),
  })

  const disable2FAMut = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable/', { code: twoFACode }),
    onSuccess: () => {
      toast.success('2FA disabled.')
      setShowDisable(false); setTwoFACode('')
      refetchTwoFA()
    },
    onError: () => toast.error('Invalid code.'),
  })

  function startEdit() {
    const [first, ...rest] = (user?.name || '').split(' ')
    setEditForm({
      first_name: first || '',
      last_name:  rest.join(' ') || '',
      phone:      (user as any)?.phone || '',
      bio:        (user as any)?.bio   || '',
    })
    setEditing(true)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Profile header */}
      <div className="glass border border-white/[0.07] rounded-3xl overflow-hidden">
        <div className="h-28 relative"
          style={{background:'linear-gradient(135deg,rgba(0,107,63,0.3),rgba(0,40,25,0.4))'}}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{backgroundImage:'radial-gradient(circle,rgba(0,168,90,1) 1px,transparent 1px)',backgroundSize:'24px 24px'}}/>
        </div>
        <div className="px-8 pb-6 relative">
          <div className="flex items-end justify-between -mt-14 mb-4 flex-wrap gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl border-4 flex items-center justify-center font-extrabold text-2xl overflow-hidden flex-shrink-0"
                style={{background:'linear-gradient(135deg,#006B3F,#00A85A)',borderColor:'rgba(13,26,18,1)'}}>
                {user?.profile_photo
                  ? <img src={user.profile_photo} alt="" className="w-full h-full object-cover"/>
                  : initials}
              </div>
              {user?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2"
                  style={{borderColor:'rgba(13,26,18,1)'}}>
                  <IconCheck size={12} className="text-white"/>
                </div>
              )}
            </div>
            <button onClick={startEdit}
              className="glass border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white flex items-center gap-2 transition-colors mb-1">
              <IconEdit size={13}/> Edit Profile
            </button>
          </div>
          <h2 className="text-xl font-extrabold text-white">{user?.name}</h2>
          <p className="text-white/50 text-sm mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${
              STATUS_CLS[profile?.status||'active'] || STATUS_CLS.active
            }`}>
              {profile?.status || 'Active'}
            </span>
            <span className="text-[11px] text-white/35 capitalize">{user?.role}</span>
            {isStudent && profile?.matric_number && (
              <span className="font-mono text-[11px] text-white/35">{profile.matric_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass border border-primary/20 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white">Edit Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>First Name</label>
              <input value={editForm.first_name} onChange={e=>setEditForm(f=>({...f,first_name:e.target.value}))} className={inputCls}/></div>
            <div><label className={labelCls}>Last Name</label>
              <input value={editForm.last_name} onChange={e=>setEditForm(f=>({...f,last_name:e.target.value}))} className={inputCls}/></div>
          </div>
          <div><label className={labelCls}>Phone Number</label>
            <input value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))} placeholder="08012345678" className={inputCls}/></div>
          <div><label className={labelCls}>Bio</label>
            <textarea value={editForm.bio} onChange={e=>setEditForm(f=>({...f,bio:e.target.value}))} rows={2} className={`${inputCls} resize-none`} placeholder="A short bio…"/></div>
          <div className="flex gap-3">
            <button onClick={()=>updateMut.mutate()} disabled={updateMut.isPending}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
              <IconCheck size={14}/>{updateMut.isPending?'Saving…':'Save Changes'}
            </button>
            <button onClick={()=>setEditing(false)}
              className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 border border-white/[0.07]">
        {([
          { key:'personal', label:'Personal Info', Icon:IconUser   },
          { key:'academic', label:'Academic',       Icon:IconGrad   },
          { key:'security', label:'Security & 2FA', Icon:IconShield },
        ] as const).map(({ key, label, Icon }) => (
          <button key={key} onClick={()=>setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab===key ? 'bg-primary text-white' : 'text-white/45 hover:text-white/70'
            }`}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* ── PERSONAL TAB ── */}
      {activeTab==='personal' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <Field label="Full Name"        value={user?.name}/>
            <Field label="Email"            value={user?.email}/>
            <Field label="Phone"            value={(user as any)?.phone}/>
            <Field label="Date of Birth"    value={(user as any)?.date_of_birth}/>
            <Field label="Gender"           value={(user as any)?.gender==='M'?'Male':(user as any)?.gender==='F'?'Female':undefined}/>
            <Field label="State of Origin"  value={(user as any)?.state_of_origin}/>
            <Field label="LGA"              value={(user as any)?.lga}/>
            <Field label="Home Address"     value={(user as any)?.home_address}/>
            <Field label="Blood Group"      value={(user as any)?.blood_group}/>
            <Field label="Next of Kin"      value={(user as any)?.next_of_kin}/>
            <Field label="NOK Phone"        value={(user as any)?.next_of_kin_phone}/>
            <Field label="Account Created"  value={(user as any)?.date_joined?.split('T')[0]}/>
          </div>
        </div>
      )}

      {/* ── ACADEMIC TAB ── */}
      {activeTab==='academic' && (
        <div className="glass border border-white/[0.07] rounded-2xl p-6">
          {!isStudent ? (
            <p className="text-white/40 text-sm">Academic details are only available for student accounts.</p>
          ) : !profile ? (
            <div className="space-y-4">{Array.from({length:6}).map((_,i)=><div key={i} className="h-8 skeleton rounded-xl"/>)}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <Field label="Matric Number"     value={profile.matric_number}/>
                <Field label="Department"        value={profile.department_name}/>
                <Field label="Level"             value={profile.level ? `${profile.level} Level` : undefined}/>
                <Field label="Admission Year"    value={profile.admission_year}/>
                <Field label="Admission Session" value={profile.admission_session}/>
                <Field label="CGPA"              value={profile.cgpa ? parseFloat(profile.cgpa).toFixed(2) : undefined}/>
                <Field label="Credit Units"      value={profile.total_credit_units_earned}/>
                <Field label="Status"            value={profile.status}/>
                <Field label="Blood Group"       value={profile.blood_group}/>
                <Field label="Genotype"          value={profile.genotype}/>
                <Field label="Next of Kin"       value={profile.next_of_kin}/>
                <Field label="NOK Phone"         value={profile.next_of_kin_phone}/>
              </div>

              {(profile.reg_year || profile.reg_sequence) && (
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 max-w-md">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-3">Registration Number Component Breakdown</div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { label: 'Year', value: profile.reg_year, desc: 'YY' },
                      { label: 'Level', value: profile.reg_entry_level, desc: 'L' },
                      { label: 'Faculty', value: profile.reg_faculty_id, desc: 'FF' },
                      { label: 'Dept', value: profile.reg_dept_id, desc: 'DD' },
                      { label: 'Seq', value: profile.reg_sequence ? String(profile.reg_sequence).padStart(3,'0') : '—', desc: 'SSS' },
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
            </div>
          )}
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab==='security' && (
        <div className="space-y-5">

          {/* Change password */}
          <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <IconLock size={15} className="text-white/50"/>
              <h3 className="font-bold text-sm text-white">Change Password</h3>
            </div>

            <div><label className={labelCls}>Current Password *</label>
              <input type="password" value={pwForm.old_password}
                onChange={e=>setPwForm(f=>({...f,old_password:e.target.value}))}
                placeholder="Your current password" className={inputCls}/></div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>New Password *</label>
                <input type="password" value={pwForm.new_password}
                  onChange={e=>setPwForm(f=>({...f,new_password:e.target.value}))}
                  placeholder="Min 8 characters" className={inputCls}/></div>
              <div><label className={labelCls}>Confirm New Password *</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))}
                  placeholder="Repeat new password" className={inputCls}/></div>
            </div>

            {pwError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <IconWarning size={14} />
                <span>{pwError}</span>
              </p>
            )}

            <button onClick={()=>pwMut.mutate()}
              disabled={!pwForm.old_password||!pwForm.new_password||!pwForm.confirm||pwMut.isPending}
              className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
              {pwMut.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Changing…</>
                : <><IconLock size={14}/>Change Password</>}
            </button>
          </div>

          {/* 2FA */}
          <div className="glass border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconShield size={15} className="text-white/50"/>
                <h3 className="font-bold text-sm text-white">Two-Factor Authentication (2FA)</h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                twoFASt?.enabled
                  ? 'bg-primary/15 text-primary-light border-primary/25'
                  : 'bg-white/10 text-white/40 border-white/15'
              }`}>
                {twoFASt?.enabled && <IconCheck size={10} />}
                <span>{twoFASt?.enabled ? 'Enabled' : 'Disabled'}</span>
              </span>
            </div>

            <p className="text-xs text-white/40 leading-relaxed">
              Two-factor authentication adds an extra layer of security to your account.
              After enabling, you will need an authenticator app (like Google Authenticator) to log in.
            </p>

            {!twoFASt?.enabled ? (
              <>
                {!twoFASetup ? (
                  <button onClick={()=>setup2FAMut.mutate()} disabled={setup2FAMut.isPending}
                    className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                    {setup2FAMut.isPending
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Setting up…</>
                      : <><IconShield size={14}/>Enable 2FA</>}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="glass border border-white/[0.08] rounded-xl p-5 text-center">
                      <p className="text-xs text-white/50 mb-3">Scan this QR code with your authenticator app:</p>
                      {twoFASetup.qr_code && (
                        <img src={twoFASetup.qr_code} alt="2FA QR Code"
                          className="w-40 h-40 mx-auto rounded-xl bg-white p-2"/>
                      )}
                      {twoFASetup.secret && (
                        <div className="mt-3">
                          <p className="text-[11px] text-white/35 mb-1">Manual entry key:</p>
                          <p className="font-mono text-xs text-amber-400 bg-white/[0.05] px-3 py-1.5 rounded-lg break-all">
                            {twoFASetup.secret}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Enter the 6-digit code from your app *</label>
                      <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                        placeholder="000000" maxLength={6}
                        className={`${inputCls} font-mono text-xl text-center tracking-[0.5em]`}/>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={()=>verify2FAMut.mutate()}
                        disabled={twoFACode.length!==6||verify2FAMut.isPending}
                        className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2">
                        <IconCheck size={14}/>{verify2FAMut.isPending?'Verifying…':'Verify & Enable'}
                      </button>
                      <button onClick={()=>{setTwoFASetup(null);setTwoFACode('')}}
                        className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="glass border border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-primary-light">
                    2FA is active using <strong>{twoFASt.method || 'TOTP'}</strong>.
                    Your account is protected.
                  </p>
                </div>
                {!showDisable ? (
                  <button onClick={()=>setShowDisable(true)}
                    className="glass border border-red-500/30 rounded-xl px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    Disable 2FA
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className={labelCls}>Enter your 2FA code to disable *</label>
                    <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000" maxLength={6}
                      className={`${inputCls} font-mono text-xl text-center tracking-[0.5em] max-w-[200px]`}/>
                    <div className="flex gap-3">
                      <button onClick={()=>disable2FAMut.mutate()}
                        disabled={twoFACode.length!==6||disable2FAMut.isPending}
                        className="glass border border-red-500/30 rounded-xl px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-40 flex items-center gap-2 transition-colors">
                        {disable2FAMut.isPending?'Disabling…':'Confirm Disable'}
                      </button>
                      <button onClick={()=>{setShowDisable(false);setTwoFACode('')}}
                        className="glass border border-white/[0.1] rounded-xl px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Session info */}
          <div className="glass border border-white/[0.06] rounded-xl px-5 py-3">
            <p className="text-[11px] text-white/25">
              Suspicious activity? Change your password immediately and contact{' '}
              <span className="text-primary-light/50">security@fugusau.edu.ng</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
