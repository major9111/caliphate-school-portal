import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { getHomeRouteForRole } from '@/lib/utils'
import { isAxiosError } from 'axios'
import { AuthHeroPanel, AuthCard, AuthBackLink, AuthErrorBanner } from '@/components/auth/AuthShell'

export function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!login.trim() || !password) {
      setError('Please enter your username/email and password')
      return
    }
    setIsLoading(true)
    try {
      const data = await authApi.login(login.trim(), password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('refresh_token', (data as { refresh_token?: string }).refresh_token || '')
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate(getHomeRouteForRole(data.user?.role))
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Invalid credentials')
      } else {
        setError('Cannot connect to server. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthHeroPanel title="Welcome back" subtitle="Manage students, track finances, and oversee academic excellence." />

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <AuthBackLink to="/" label="Back to Home" />
          <AuthCard>
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-[var(--text)]">Sign in</h2>
              <p className="text-[var(--text-2)] mt-1">Enter your credentials</p>
            </div>
            <AuthErrorBanner message={error} />
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Username or Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                  <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Enter your username or email" className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Password</Label>
                  <Link to="/forgot-password" className="text-sm text-[var(--indigo)] hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
              </Button>
            </form>
            <p className="text-sm text-center text-[var(--text-2)] mt-6">
              Don't have an account? <Link to="/register" className="text-[var(--indigo)] font-medium hover:underline">Sign up</Link>
            </p>
          </AuthCard>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
