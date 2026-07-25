/**
 * FUGUSAU Portal — Forgot Password Page
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'
import { IconMail, IconWarning, IconArrowRight, IconCheck } from '@/components/icons'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError(null)
    try {
      await authAPI.passwordResetRequest(data.email)
      setSuccess(true)
      toast.success('Reset link sent successfully!')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to send password reset link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-dark text-white overflow-hidden relative p-4">
      {/* Ambient orbs */}
      <div className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,107,63,0.18) 0%, transparent 70%)', top: '-20%', left: '-15%', filter: 'blur(40px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,168,90,0.12) 0%, transparent 70%)', bottom: '-15%', right: '-10%', filter: 'blur(40px)' }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,168,90,1) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(0,168,90,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />

      {/* Card */}
      <div
        className="relative w-full max-w-[440px] glass-strong rounded-3xl p-10 z-10"
        style={{
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary-light/40 to-transparent" />

        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,168,90,0.35) 0%, transparent 70%)',
                transform: 'scale(1.6)',
                animation: 'pulse 3s ease-in-out infinite',
              }}
            />
            <img
              src={`${import.meta.env.BASE_URL}fugusau-logo.png`}
              alt="Federal University Gusau"
              style={{
                width: 96,
                height: 96,
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 18px rgba(0,168,90,0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                position: 'relative',
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold text-white leading-tight">Federal University Gusau</div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-primary-light/60 mt-1">
              Knowledge · Innovation · Service
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-7">
          <h2 className="text-2xl font-extrabold text-white mb-1.5">Forgot Password</h2>
          <p className="text-xs text-white/40 leading-relaxed">
            Enter your email address and we will send you a link to reset your password.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-5">
            <IconWarning size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary-light mx-auto">
              <IconCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Check your email</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              If that email is registered, a password reset link has been sent to it. Please check your inbox and follow the instructions.
            </p>
            <Link to="/login" className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">
                University Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                  <IconMail size={15} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@fugusau.edu.ng"
                  className="glass-input w-full rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-white/20"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <IconWarning size={10} /> {errors.email.message}
                </p>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Link…
                </>
              ) : (
                <>Send Reset Link <IconArrowRight size={15} /></>
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-xs text-primary-light/60 hover:text-primary-light transition-colors">
                Back to Login
              </Link>
            </div>
          </form>
        )}

        <p className="text-center text-[10px] text-white/18 mt-7 leading-relaxed">
          © {new Date().getFullYear()} Federal University Gusau<br />
          ICT Directorate · <span className="text-primary-light/35">ict@fugusau.edu.ng</span>
        </p>
      </div>
    </div>
  )
}
