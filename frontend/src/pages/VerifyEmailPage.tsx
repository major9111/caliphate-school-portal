/**
 * FUGUSAU Portal — Verify Email Page
 */
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authAPI } from '@/services/api'
import { IconCheck, IconWarning, IconArrowRight } from '@/components/icons'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [mounted, setMounted] = useState(false)
  const [statusState, setStatusState] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    setMounted(true)
    if (!token) {
      setStatusState('error')
      setErrorMsg('Verification token is missing.')
      return
    }

    const verify = async () => {
      try {
        await authAPI.verifyEmail(token)
        setStatusState('success')
      } catch (err: any) {
        setStatusState('error')
        setErrorMsg(err?.response?.data?.error || err?.response?.data?.detail || 'Invalid or expired email verification link.')
      }
    }

    verify()
  }, [token])

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
        className="relative w-full max-w-[440px] glass-strong rounded-3xl p-10 z-10 text-center"
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

        {/* Dynamic content depending on verification status */}
        {statusState === 'loading' && (
          <div className="space-y-4 py-4">
            <span className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
            <h2 className="text-xl font-extrabold text-white">Verifying Email...</h2>
            <p className="text-xs text-white/40 leading-relaxed">
              Please wait while we confirm your email verification link with our systems.
            </p>
          </div>
        )}

        {statusState === 'success' && (
          <div className="space-y-5 py-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary-light mx-auto">
              <IconCheck size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-white">Email Verified!</h2>
            <p className="text-xs text-white/40 leading-relaxed">
              Thank you for verifying your email address. Your account is now fully active.
            </p>
            <Link to="/login" className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2">
              Proceed to Sign In <IconArrowRight size={15} />
            </Link>
          </div>
        )}

        {statusState === 'error' && (
          <div className="space-y-5 py-2">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <IconWarning size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-white">Verification Failed</h2>
            <p className="text-xs text-red-300 leading-relaxed">
              {errorMsg}
            </p>
            <Link to="/login" className="btn-primary w-full rounded-xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2">
              Back to Login
            </Link>
          </div>
        )}

        <p className="text-center text-[10px] text-white/18 mt-7 leading-relaxed">
          © {new Date().getFullYear()} Federal University Gusau<br />
          ICT Directorate · <span className="text-primary-light/35">ict@fugusau.edu.ng</span>
        </p>
      </div>
    </div>
  )
}
