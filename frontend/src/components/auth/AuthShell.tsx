import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dark mesh-gradient hero panel — desktop-only left side of the split
 * auth layouts (Login/Register). Matches the dashboard welcome banner and
 * landing-page admissions CTA so the brand identity is consistent across
 * marketing site, portal, and auth. */
export function AuthHeroPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="hidden lg:flex relative items-center justify-center overflow-hidden p-12 text-white"
      style={{ background: 'linear-gradient(135deg, #1B1F3B 0%, #12162A 55%, #0B0F14 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-55"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(79,70,229,.55), transparent 45%), radial-gradient(circle at 85% 15%, rgba(6,182,212,.35), transparent 40%), radial-gradient(circle at 60% 90%, rgba(16,185,129,.25), transparent 45%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-md z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/20" />
          <div>
            <h1 className="text-2xl font-display font-bold">Caliphate Schools</h1>
            <p className="text-sm text-white/60">Portal Management System</p>
          </div>
        </div>
        <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">{title}</h2>
        <p className="text-lg text-white/70">{subtitle}</p>
      </motion.div>
    </div>
  )
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn('rounded-xl3 bg-[var(--surface)] shadow-medium border border-[var(--border)] p-8', className)}
    >
      {children}
    </motion.div>
  )
}

export function AuthBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center text-sm text-[var(--text-2)] hover:text-[var(--indigo)] mb-6 transition-colors">
      <ArrowLeft className="h-4 w-4 mr-1" /> {label}
    </Link>
  )
}

export function AuthErrorBanner({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm overflow-hidden"
        >
          <div className="p-3">{message}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Full-height centered wrapper for single-card auth pages (Forgot/Reset
 * Password and their success/invalid states). */
export function AuthCenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}