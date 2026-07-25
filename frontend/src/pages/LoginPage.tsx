/**
 * FUGUSAU Portal — Login Page (Redesigned)
 * - Fully centred layout
 * - Real logo, no background box, drop-shadow only
 * - Logo floats + glows on load
 * - Clean single-column card
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import ThemeToggle from '@/components/common/ThemeToggle'
import {
  IconEye, IconEyeOff, IconMail, IconCredentials, IconWarning,
  IconArrowRight, IconArrowLeft, IconAdmission, IconSearch,
} from '@/components/icons'

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted]           = useState(false)
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as any)?.from?.pathname || '/dashboard'

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    clearError()
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (_) {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-dark text-white overflow-hidden relative p-4">

      <div className="absolute top-4 left-4 z-20">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all">
          <IconArrowLeft size={17} />
        </button>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* ── Ambient orbs ── */}
      <div className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,107,63,0.18) 0%, transparent 70%)', top: '-20%', left: '-15%', filter: 'blur(40px)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,168,90,0.12) 0%, transparent 70%)', bottom: '-15%', right: '-10%', filter: 'blur(40px)' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(200,160,0,0.08) 0%, transparent 70%)', top: '30%', right: '5%', filter: 'blur(60px)' }} />

      {/* ── Subtle grid ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,168,90,1) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(0,168,90,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />

      {/* ── Card ── */}
      <div
        className="relative w-full max-w-[440px] glass-strong rounded-3xl p-7 z-10"
        style={{
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          opacity:    mounted ? 1 : 0,
          transform:  mounted ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary-light/40 to-transparent" />

        {/* ── Logo block ── */}
        <div className="flex flex-col items-center mb-5">
          {/* Logo — drop-shadow only, no bg box */}
          <div className="relative mb-3">
            {/* Glow ring behind logo */}
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
                width: 64,
                height: 64,
                objectFit: 'contain',
                // Remove background — drop-shadow only
                filter: 'drop-shadow(0 0 18px rgba(0,168,90,0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                position: 'relative',
                animation: mounted ? 'float 4s ease-in-out infinite' : 'none',
                transition: 'filter 0.4s ease',
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

        {/* ── Heading ── */}
        <div className="text-center mb-5">
          <h2 className="text-xl font-extrabold text-white mb-1">Welcome back</h2>
          <p className="text-xs text-white/40 leading-relaxed">
            Sign in with your university email —<br />your role is automatically detected.
          </p>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-5">
            <IconWarning size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">
              University Email
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
                className="glass-input w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                <IconX size={10} /> {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Password
              </label>
              <Link to="/forgot-password"
                className="text-[11px] text-primary-light/60 hover:text-primary-light transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                <IconCredentials size={15} />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                className="glass-input w-full rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-white/20"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                <IconX size={10} /> {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={isLoading}
            className="btn-primary w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating…
              </>
            ) : (
              <>Sign In to Portal <IconArrowRight size={15} /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 text-white/20 text-[11px]">
          <div className="flex-1 h-px bg-white/[0.07]" />
          or
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <Link to="/admission"
            className="flex items-center gap-3 w-full glass border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-semibold text-white/55 hover:text-white hover:border-primary/40 transition-all group">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary-light group-hover:bg-primary/20 flex-shrink-0 transition-colors">
              <IconAdmission size={13} />
            </div>
            Apply for POST-UTME Admission
            <IconArrowRight size={12} className="ml-auto opacity-35 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
          </Link>
          <Link to="/admission?check=true"
            className="flex items-center gap-3 w-full glass border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-semibold text-white/55 hover:text-white hover:border-primary/40 transition-all group">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary-light group-hover:bg-primary/20 flex-shrink-0 transition-colors">
              <IconSearch size={13} />
            </div>
            Check Admission Status
            <IconArrowRight size={12} className="ml-auto opacity-35 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <p className="text-center text-[10px] text-white/18 mt-5 leading-relaxed">
          © {new Date().getFullYear()} Federal University Gusau<br />
          ICT Directorate · <span className="text-primary-light/35">ict@fugusau.edu.ng</span>
        </p>
      </div>

      {/* ── Keyframes injected ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1.6); }
          50%       { opacity: 1;   transform: scale(1.9); }
        }
      `}</style>
    </div>
  )
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
