import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) { setIsTokenValid(false); return }
    fetch(`http://localhost:8000/api/v1/auth/verify-reset-token/${token}`).then(r => setIsTokenValid(r.ok)).catch(() => setIsTokenValid(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (response.ok) { setIsSuccess(true); setTimeout(() => navigate('/login'), 3000) }
      else { const data = await response.json(); setError(data.detail || 'Failed to reset password') }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isTokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-secondary-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-secondary-500 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password"><Button className="w-full">Request New Link</Button></Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-secondary-200 p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
          <p className="text-secondary-500 mb-6">Redirecting to login...</p>
          <Link to="/login"><Button className="w-full">Go to Login</Button></Link>
        </div>
      </div>
    )
  }

  if (isTokenValid === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Create new password</h2>
            <p className="text-secondary-500 mt-1">Enter your new password</p>
          </div>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
