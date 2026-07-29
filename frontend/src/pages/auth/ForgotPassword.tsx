import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { AuthCard, AuthBackLink, AuthErrorBanner, AuthCenteredPage } from '@/components/auth/AuthShell'

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
      await authApi.forgotPassword(email)
      setIsSuccess(true)
    } catch (err) {
      setError('Cannot connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthCenteredPage>
        <AuthCard className="text-center">
          <div className="h-16 w-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-600 dark:text-success-300" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[var(--text)] mb-2">Check your email</h2>
          <p className="text-[var(--text-2)] mb-6">If an account exists for {email}, we've sent a password reset link to it.</p>
          <Link to="/login"><Button className="w-full">Back to login</Button></Link>
        </AuthCard>
      </AuthCenteredPage>
    )
  }

  return (
    <AuthCenteredPage>
      <AuthBackLink to="/login" label="Back to Login" />
      <AuthCard>
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-[var(--text)]">Reset your password</h2>
          <p className="text-[var(--text-2)] mt-1">Enter your email</p>
        </div>
        <AuthErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
          </Button>
        </form>
      </AuthCard>
    </AuthCenteredPage>
  )
}

export default ForgotPasswordPage
