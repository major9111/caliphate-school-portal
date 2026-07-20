import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, Mail, Phone, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { getHomeRouteForRole } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { isAxiosError } from 'axios'

export function RegisterPage() {
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'parent' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.full_name.trim() || !formData.email.trim()) { setError('Full name and email are required'); return }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setIsLoading(true)
    try {
      const data = await authApi.register({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      })
      const token = (data as unknown as { access_token?: string }).access_token
      const user = (data as unknown as { user?: { role?: string } }).user
      if (token) {
        localStorage.setItem('token', token)
        if (user) localStorage.setItem('user', JSON.stringify(user))
        toast('Account created successfully!', 'success')
        navigate(getHomeRouteForRole(user?.role))
      } else {
        toast('Account created successfully. Please sign in.', 'success')
        navigate('/login')
      }
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Registration failed')
      } else {
        setError('Cannot connect to server')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-secondary-50">
      <div className="hidden lg:flex relative items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 p-12">
        <div className="relative text-white max-w-md z-10">
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30" />
            <div>
              <h1 className="text-2xl font-bold">Caliphate Schools</h1>
              <p className="text-sm text-blue-100">Portal Management System</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Join our community</h2>
          <p className="text-lg text-blue-100">Create an account to access student records, pay fees, and track academic progress.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
          </Link>
          <div className="bg-white rounded-2xl shadow-soft border border-secondary-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Create an account</h2>
              <p className="text-secondary-500 mt-1">Fill in your details</p>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>I am a...</Label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm">
                  <option value="parent">Parent / Guardian</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="pl-10" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-10" required />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="pl-10 pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Account'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
