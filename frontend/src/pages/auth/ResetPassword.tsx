import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api'
import { isAxiosError } from 'axios'
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { AuthCard, AuthBackLink, AuthCenteredPage } from '@/components/auth/AuthShell'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>(token ? 'checking' : 'invalid')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return }
    authApi.verifyResetToken(token)
      .then(() => setTokenStatus('valid'))
      .catch(() => setTokenStatus('invalid'))
  }, [token])

  if (tokenStatus === 'checking') {
    return (
      <AuthCenteredPage>
        <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--indigo)]" /></div>
      </AuthCenteredPage>
    )
  }

  // No token, or the backend says it's invalid/expired — no point showing a form.
  if (tokenStatus === 'invalid') {
    return (
      <AuthCenteredPage>
        <AuthCard className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600 dark:text-red-400" />
          <h2 className="text-2xl font-display font-bold text-[var(--text)] mb-2">Invalid or Expired Link</h2>
          <p className="text-[var(--text-2)] mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
          <Link to="/forgot-password"><Button className="w-full">Request New Link</Button></Link>
        </AuthCard>
      </AuthCenteredPage>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setIsLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setIsSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.detail || 'This link is invalid or has expired.' : 'Cannot connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthCenteredPage>
        <AuthCard className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success-600 dark:text-success-300" />
          <h2 className="text-2xl font-display font-bold text-[var(--text)] mb-2">Password Reset Successful</h2>
          <p className="text-[var(--text-2)] mb-6">Redirecting to login...</p>
          <Link to="/login"><Button className="w-full">Go to Login</Button></Link>
        </AuthCard>
      </AuthCenteredPage>
    )
  }

  return (
    <AuthCenteredPage>
      <AuthBackLink to="/login" label="Back to Login" />
      <AuthCard>
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-[var(--text)]">Create new password</h2>
          <p className="text-[var(--text-2)] mt-1">Enter your new password</p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {error}
              {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                <> <Link to="/forgot-password" className="underline font-medium">Request a new link</Link>.</>
              ) : null}
            </span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : 'Reset Password'}
          </Button>
        </form>
      </AuthCard>
    </AuthCenteredPage>
  )
}

export default ResetPasswordPage
