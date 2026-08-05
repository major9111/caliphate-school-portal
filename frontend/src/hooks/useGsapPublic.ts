import { useEffect, useRef } from 'react'
import { loadGsap, prefersReducedMotion } from '@/lib/gsap'

/**
 * Bold hero entrance: children of the container animate in with a staggered
 * rise + fade + slight scale, once, on mount. Use on hero sections.
 * Give animated elements a `data-reveal` attribute (or pass a custom selector).
 */
export function useHeroReveal<T extends HTMLElement = HTMLElement>(selector = '[data-reveal]') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    let cancelled = false
    let ctx: ReturnType<Awaited<ReturnType<typeof loadGsap>>['gsap']['context']> | undefined

    loadGsap().then(({ gsap }) => {
      if (cancelled || !ref.current) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { opacity: 0, y: 48, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out', stagger: 0.15, delay: 0.1 }
        )
      }, ref)
    })

    return () => { cancelled = true; ctx?.revert() }
  }, [selector])

  return ref
}

/**
 * Lightweight reveal for sticky/fixed headers. Deliberately skips `scale` —
 * animating scale on a `position: sticky` element forces the browser to keep
 * re-promoting/repainting that layer while it sticks during scroll, which is
 * a common source of jank. Opacity + a small y-shift is enough for a header.
 */
export function useHeaderReveal<T extends HTMLElement = HTMLElement>(selector = '[data-reveal]') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    let cancelled = false
    let ctx: ReturnType<Awaited<ReturnType<typeof loadGsap>>['gsap']['context']> | undefined

    loadGsap().then(({ gsap }) => {
      if (cancelled || !ref.current) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 }
        )
      }, ref)
    })

    return () => { cancelled = true; ctx?.revert() }
  }, [selector])

  return ref
}

/**
 * Scroll-triggered stagger reveal for grids/lists of cards. Animates each
 * matching child as the container enters the viewport.
 */
export function useScrollStagger<T extends HTMLElement = HTMLElement>(selector = '[data-reveal-item]') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    let cancelled = false
    let ctx: ReturnType<Awaited<ReturnType<typeof loadGsap>>['gsap']['context']> | undefined

    loadGsap().then(({ gsap }) => {
      if (cancelled || !ref.current) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)', stagger: 0.12,
            scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
          }
        )
      }, ref)
    })

    return () => { cancelled = true; ctx?.revert() }
  }, [selector])

  return ref
}

/**
 * Single-element scroll reveal — for section headings, standalone blocks.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return

    let cancelled = false
    let ctx: ReturnType<Awaited<ReturnType<typeof loadGsap>>['gsap']['context']> | undefined

    loadGsap().then(({ gsap }) => {
      if (cancelled || !ref.current) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          ref.current,
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
          }
        )
      })
    })

    return () => { cancelled = true; ctx?.revert() }
  }, [])

  return ref
}
