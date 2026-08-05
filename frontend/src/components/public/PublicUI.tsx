import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Small gold/sapphire 8-point star used as a decorative bullet before eyebrow labels. */
export function StarBullet({ color = '#1D4ED8' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill={color} />
    </svg>
  )
}

/** Small uppercase label with a star bullet. Use `light` on dark section backgrounds. */
export function Eyebrow({ children, light = false, center = false }: { children: ReactNode; light?: boolean; center?: boolean }) {
  return (
    <span className={cn('pub-eyebrow', light && 'light')} style={center ? { justifyContent: 'center' } : undefined}>
      <StarBullet color={light ? '#E7CD8C' : '#1D4ED8'} />
      {children}
    </span>
  )
}

/** Eyebrow + heading + optional supporting paragraph, used to open most sections. */
export function SectionHead({
  eyebrow,
  title,
  body,
  light = false,
  center = false,
  wide = false,
}: {
  eyebrow: ReactNode
  title: ReactNode
  body?: ReactNode
  light?: boolean
  center?: boolean
  wide?: boolean
}) {
  return (
    <div className={cn('pub-head-block', center && 'pub-center')} style={wide ? { maxWidth: 760 } : undefined} data-reveal>
      <Eyebrow light={light} center={center}>{eyebrow}</Eyebrow>
      <h2 style={light ? { color: '#fff' } : undefined}>{title}</h2>
      {body && <p style={light ? { color: 'rgba(255,255,255,.65)' } : undefined}>{body}</p>}
    </div>
  )
}

/** Three overlapping soft-blur blobs used behind hero/CTA sections. */
export function Blobs() {
  return (
    <>
      <div className="pub-blob pub-blob-1" />
      <div className="pub-blob pub-blob-2" />
      <div className="pub-blob pub-blob-3" />
    </>
  )
}

export function GeoPattern() {
  return <div className="pub-geo-pattern" />
}

/** Rounded icon chip used throughout bento cards, facility cards, journey lists, etc. */
export function IconChip({ children, bg, color, className }: { children: ReactNode; bg: string; color: string; className?: string }) {
  return (
    <div className={cn('pub-ic', className)} style={{ background: bg, color }}>
      {children}
    </div>
  )
}
