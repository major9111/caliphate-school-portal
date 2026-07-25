import { ReactNode, CSSProperties } from 'react'
import { IconChevronRight } from '@/components/icons'

/**
 * Shared primitives for the mobile redesign of the FUGUSAU portal.
 * Every list-style page renders a `hidden md:block` desktop view (unchanged)
 * plus a `md:hidden` mobile view built from these pieces, matching the
 * existing glass/green design system (Tailwind classes, not inline styles)
 * so the mobile experience feels native to this app rather than reused
 * from anywhere else.
 */

// ─── Sticky search + filter-chip toolbar ───────────────────────────────────
export interface FilterChip { value: string; label: string }

export function MobileToolbar({
  search, onSearchChange, placeholder = 'Search…', chips, activeChip, onChipChange,
}: {
  search?: string
  onSearchChange?: (v: string) => void
  placeholder?: string
  chips?: FilterChip[]
  activeChip?: string
  onChipChange?: (v: string) => void
}) {
  return (
    <div className="sticky top-0 z-20 bg-dark/95 backdrop-blur-glass border-b border-white/[0.06] px-4 pt-3 pb-2.5 flex flex-col gap-2.5 -mx-4">
      {onSearchChange && (
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full glass border border-white/[0.08] rounded-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary-light/50"
          />
        </div>
      )}
      {chips && chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          {chips.map((chip) => {
            const active = activeChip === chip.value
            return (
              <button
                key={chip.value || 'all'}
                onClick={() => onChipChange?.(chip.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all
                  ${active ? 'bg-primary/20 border-primary-light/40 text-primary-light' : 'glass border-white/[0.08] text-white/40'}`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Small uppercase list meta label (e.g. "42 records") ──────────────────
export function MobileListMeta({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-0.5 pb-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">{children}</span>
      {right && <span className="text-[11px] text-white/35">{right}</span>}
    </div>
  )
}

// ─── Generic tappable row card ──────────────────────────────────────────────
export interface MobileBadge { label: string; className: string; style?: CSSProperties }

export function MobileRow({
  leading, leadingClassName = 'bg-white/[0.06] text-white/40', leadingStyle,
  title, titleExtra, subtitle, caption, badge, onTap, chevron = true, footer,
}: {
  leading: ReactNode
  leadingClassName?: string
  leadingStyle?: CSSProperties
  title: ReactNode
  titleExtra?: ReactNode
  subtitle?: ReactNode
  caption?: ReactNode
  badge?: MobileBadge
  onTap?: () => void
  chevron?: boolean
  footer?: ReactNode
}) {
  const Comp: any = onTap ? 'button' : 'div'
  return (
    <div className="glass border border-white/[0.07] rounded-2xl overflow-hidden">
      <Comp
        onClick={onTap}
        className={`w-full text-left flex items-center gap-3 px-3.5 py-3 ${onTap ? 'transition-transform active:scale-[0.98]' : ''}`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${leadingClassName}`} style={leadingStyle}>
          {leading}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13.5px] font-bold text-white truncate">{title}</span>
            {titleExtra}
          </div>
          {subtitle && <span className="text-[11.5px] text-white/45 truncate">{subtitle}</span>}
          {caption && <span className="text-[10.5px] font-semibold text-white/30 tracking-wide">{caption}</span>}
        </div>

        {(badge || (onTap && chevron)) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {badge && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`} style={badge.style}>
                {badge.label}
              </span>
            )}
            {onTap && chevron && <IconChevronRight size={16} className="text-white/25" />}
          </div>
        )}
      </Comp>
      {footer && <div className="flex gap-2 flex-wrap px-3.5 pb-3">{footer}</div>}
    </div>
  )
}

// Small pill action button used inside MobileRow footers
export function MobileMiniAction({
  label, icon, className = 'bg-primary/20 text-primary-light', onClick,
}: { label: string; icon?: ReactNode; className?: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${className}`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Bank-statement style label/value row, used inside sheets ─────────────
export function MobileDetailRow({ icon: Icon, label, value }: { icon?: any; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.06]">
      <span className="flex items-center gap-2 text-[12.5px] text-white/40">
        {Icon && <Icon size={14} />}
        {label}
      </span>
      <span className="text-[12.5px] font-semibold text-white text-right">{value}</span>
    </div>
  )
}

// ─── Bottom sheet shell ─────────────────────────────────────────────────────
export function MobileSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full z-10 glass-strong border-t border-white/[0.1] rounded-t-3xl px-5 pt-2.5 max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-3.5 pt-1.5">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        {children}
      </div>
    </div>
  )
}

export function MobileSheetHeader({
  leading, leadingClassName = 'bg-white/[0.06] text-white/40', title, subtitle, onClose,
}: { leading: ReactNode; leadingClassName?: string; title: ReactNode; subtitle?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-base ${leadingClassName}`}>
        {leading}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15.5px] font-bold text-white">{title}</div>
        {subtitle && <div className="text-xs text-white/40 truncate">{subtitle}</div>}
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-xl flex-shrink-0 bg-white/[0.06] border border-white/[0.08] text-white/40 flex items-center justify-center">
        ✕
      </button>
    </div>
  )
}

export function MobileSheetAction({
  label, onClick, danger = false, icon,
}: { label: string; onClick: () => void; danger?: boolean; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[13.5px] font-bold
        ${danger ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-glow-sm'}`}
    >
      {icon}
      {label}
    </button>
  )
}

export function MobileConfirmPanel({
  title, description, confirmLabel, danger = false, isLoading = false, onConfirm, onCancel,
}: {
  title: string; description: string; confirmLabel: string; danger?: boolean; isLoading?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <>
      <h3 className="text-[15px] font-bold text-white mb-1.5">{title}</h3>
      <p className="text-[12.5px] text-white/45 leading-relaxed mb-5">{description}</p>
      <div className="flex gap-2.5">
        <button onClick={onCancel} disabled={isLoading} className="flex-1 py-3 rounded-full text-[13px] font-semibold text-white/50 border border-white/[0.1]">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 py-3 rounded-full text-[13.5px] font-bold ${danger ? 'bg-red-500 text-white' : 'bg-primary-light text-black'} ${isLoading ? 'opacity-60' : ''}`}
        >
          {isLoading ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </>
  )
}

// ─── Full-width Previous/Next pager ─────────────────────────────────────────
export function MobilePager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex gap-2.5 mt-1.5 mb-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex-1 py-2.5 rounded-full text-[12.5px] font-semibold glass border border-white/[0.08] text-white/60 disabled:opacity-30"
      >
        ← Previous
      </button>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex-1 py-2.5 rounded-full text-[12.5px] font-semibold glass border border-white/[0.08] text-white/60 disabled:opacity-30"
      >
        Next →
      </button>
    </div>
  )
}

// ─── Horizontal-scroll stat strip (dashboard-style pages) ──────────────────
export function MobileStatStrip({ stats }: { stats: { label: string; value: ReactNode; accent?: boolean }[] }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4 -mx-4 py-0.5">
      {stats.map((s, i) => (
        <div key={i} className="flex-shrink-0 min-w-[128px] glass border border-white/[0.07] rounded-2xl px-3.5 py-3 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{s.label}</span>
          <span className={`text-lg font-extrabold ${s.accent ? 'text-primary-light' : 'text-white'}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

export function MobileEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-1.5">
      <p className="text-sm font-semibold text-white/50">{title}</p>
      {description && <p className="text-xs text-white/30">{description}</p>}
    </div>
  )
}
