import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, profileApi } from '@/lib/api'
import { Camera, Shield, Key, QrCode, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { isAxiosError } from 'axios'

export default function ProfilePage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [pwModal, setPwModal] = useState(false)
  const [tfaModal, setTfaModal] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [tfaData, setTfaData] = useState<{ secret: string; provisioning_uri: string } | null>(null)
  const [tfaCode, setTfaCode] = useState('')
  const [tfaStep, setTfaStep] = useState<'setup' | 'confirm' | 'disable'>('setup')

  const { data: user, isLoading } = useQuery({ queryKey: ['auth', 'me'], queryFn: authApi.me })

  const updateProfile = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auth', 'me'] }); setEditMode(false); toast('Profile updated', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Update failed' : 'Update failed', 'error'),
  })

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auth', 'me'] }); toast('Photo updated', 'success') },
    onError: () => toast('Failed to upload photo', 'error'),
  })

  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword(pwForm.current_password, pwForm.new_password),
    onSuccess: () => { setPwModal(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); toast('Password changed', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Password change failed' : 'Password change failed', 'error'),
  })

  const setup2FA = useMutation({
    mutationFn: profileApi.setup2FA,
    onSuccess: (data) => { setTfaData(data); setTfaStep('confirm') },
    onError: () => toast('Failed to setup 2FA', 'error'),
  })

  const enable2FA = useMutation({
    mutationFn: () => profileApi.enable2FA(tfaCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auth', 'me'] }); setTfaModal(false); setTfaCode(''); setTfaData(null); toast('2FA enabled successfully', 'success') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Invalid code' : 'Invalid code', 'error'),
  })

  const disable2FA = useMutation({
    mutationFn: () => profileApi.disable2FA(tfaCode),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auth', 'me'] }); setTfaModal(false); setTfaCode(''); toast('2FA disabled', 'info') },
    onError: (e) => toast(isAxiosError(e) ? e.response?.data?.detail || 'Invalid code' : 'Invalid code', 'error'),
  })

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-primary-600" /></div>

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold">My Profile</h1><p className="text-secondary-500 mt-1">Manage your account and security settings</p></div>

      {/* Avatar + basic info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-primary-200" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">{initials}</div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                {uploadAvatar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar.mutate(f) }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{user?.full_name}</h2>
                <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
              </div>
              <p className="text-secondary-500">{user?.email}</p>
              {user?.phone && <p className="text-secondary-500 text-sm">{user?.phone}</p>}
            </div>
            <Button variant="outline" onClick={() => { setForm({ full_name: user?.full_name || '', phone: user?.phone || '' }); setEditMode(true) }}>
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary-600" />Security</h3>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-secondary-500" />
              <div><p className="font-medium">Password</p><p className="text-sm text-secondary-500">Change your login password</p></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPwModal(true)}>Change Password</Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-secondary-500" />
              <div>
                <p className="font-medium flex items-center gap-2">
                  Two-Factor Authentication
                  {(user as { two_fa_enabled?: boolean })?.two_fa_enabled && <CheckCircle className="h-4 w-4 text-green-600" />}
                </p>
                <p className="text-sm text-secondary-500">
                  {(user as { two_fa_enabled?: boolean })?.two_fa_enabled ? 'Enabled — your account is protected' : 'Add an extra layer of security'}
                </p>
              </div>
            </div>
            {(user as { two_fa_enabled?: boolean })?.two_fa_enabled ? (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setTfaStep('disable'); setTfaModal(true) }}>Disable 2FA</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setTfaStep('setup'); setTfaModal(true) }}>Enable 2FA</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit profile modal */}
      <Modal open={editMode} onOpenChange={setEditMode} title="Edit Profile">
        <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(form) }} className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Change password modal */}
      <Modal open={pwModal} onOpenChange={setPwModal} title="Change Password">
        <form onSubmit={(e) => { e.preventDefault(); if (pwForm.new_password !== pwForm.confirm) { toast('Passwords do not match', 'error'); return } changePassword.mutate() }} className="space-y-4">
          <div><Label>Current Password</Label>
            <div className="relative">
              <Input type={showCurrent ? 'text' : 'password'} value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} required />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">{showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div><Label>New Password (min 8 chars)</Label>
            <div className="relative">
              <Input type={showNew ? 'text' : 'password'} value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} required minLength={8} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <div><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setPwModal(false)}>Cancel</Button>
            <Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending ? 'Changing...' : 'Change Password'}</Button>
          </div>
        </form>
      </Modal>

      {/* 2FA modal */}
      <Modal open={tfaModal} onOpenChange={setTfaModal} title={tfaStep === 'disable' ? 'Disable 2FA' : 'Enable Two-Factor Authentication'}>
        {tfaStep === 'setup' && (
          <div className="text-center py-4">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-primary-600" />
            <p className="text-secondary-600 mb-4">Protect your account with an authenticator app like Google Authenticator or Authy.</p>
            <Button onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending}>{setup2FA.isPending ? 'Setting up...' : 'Get QR Code'}</Button>
          </div>
        )}
        {tfaStep === 'confirm' && tfaData && (
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">Scan this QR code with your authenticator app:</p>
            <div className="bg-secondary-50 p-4 rounded-lg text-center">
              <p className="text-xs text-secondary-500 mb-2">Provisioning URI (copy to app if QR doesn't work):</p>
              <code className="text-xs break-all bg-white border rounded p-2 block">{tfaData.provisioning_uri}</code>
              <p className="text-xs text-secondary-500 mt-2 font-mono">Secret: <strong>{tfaData.secret}</strong></p>
            </div>
            <div><Label>Enter the 6-digit code from your app to confirm</Label><Input value={tfaCode} onChange={e => setTfaCode(e.target.value)} maxLength={6} placeholder="000000" className="text-center text-xl tracking-widest" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setTfaModal(false); setTfaData(null); setTfaCode('') }}>Cancel</Button>
              <Button onClick={() => enable2FA.mutate()} disabled={enable2FA.isPending || tfaCode.length !== 6}>{enable2FA.isPending ? 'Enabling...' : 'Enable 2FA'}</Button>
            </div>
          </div>
        )}
        {tfaStep === 'disable' && (
          <div className="space-y-4">
            <p className="text-secondary-600">Enter your current authenticator code to disable 2FA.</p>
            <div><Label>6-digit code</Label><Input value={tfaCode} onChange={e => setTfaCode(e.target.value)} maxLength={6} placeholder="000000" className="text-center text-xl tracking-widest" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setTfaModal(false); setTfaCode('') }}>Cancel</Button>
              <Button variant="outline" className="text-red-600 border-red-200" onClick={() => disable2FA.mutate()} disabled={disable2FA.isPending || tfaCode.length !== 6}>{disable2FA.isPending ? 'Disabling...' : 'Disable 2FA'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
