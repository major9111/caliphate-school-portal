import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

/**
 * Subtle fade + tiny rise on mount. Re-runs whenever `depKey` changes
 * (e.g. pass `location.pathname` so page content re-animates on navigation).
 */
export function usePageTransition<T extends HTMLElement = HTMLDivElement>(depKey?: string) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )
    })

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])

  return ref
}

/**
 * Gentle one-time stagger for a list of items on mount, e.g. sidebar nav
 * items or a row of stat cards. Very small movement, quick duration.
 */
export function useSubtleStagger(selector: string) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.03 }
      )
    }, ref)

    return () => ctx.revert()
  }, [selector])

  return ref
}
