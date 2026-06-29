import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { School, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'

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
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.access_token)
        navigate('/app/dashboard')
      } else {
        const errData = await response.json()
        setError(errData.detail || 'Invalid credentials')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-secondary-50">
      <div className="hidden lg:flex relative items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 p-12">
        <div className="relative text-white max-w-md z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <School className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Caliphate Schools</h1>
              <p className="text-sm text-blue-100">Portal Management System</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Welcome back</h2>
          <p className="text-lg text-blue-100 mb-8">Manage students, track finances, and oversee academic excellence.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-soft border border-secondary-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="text-secondary-500 mt-1">Enter your credentials</p>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Username or Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="superadmin" className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
              </Button>
            </form>
            <p className="text-sm text-center text-secondary-600 mt-6">
              Don't have an account? <Link to="/register" className="text-primary-600 font-medium">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
