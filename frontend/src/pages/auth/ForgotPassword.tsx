import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { School, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (response.ok) setIsSuccess(true)
      else setError('Failed to send reset email')
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-secondary-200 p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-secondary-500 mb-6">We've sent a password reset link to {email}</p>
          <Link to="/login"><Button className="w-full">Back to login</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
        </Link>
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Reset your password</h2>
            <p className="text-secondary-500 mt-1">Enter your email</p>
          </div>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
