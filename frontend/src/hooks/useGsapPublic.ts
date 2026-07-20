import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

/**
 * Bold hero entrance: children of the container animate in with a staggered
 * rise + fade + slight scale, once, on mount. Use on hero sections.
 * Give animated elements a `data-reveal` attribute (or pass a custom selector).
 */
export function useHeroReveal(selector = '[data-reveal]') {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 48, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.15,
          delay: 0.1,
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [selector])

  return ref as RefObject<HTMLElement>
}

/**
 * Scroll-triggered stagger reveal for grids/lists of cards. Animates each
 * matching child as the container enters the viewport.
 */
export function useScrollStagger(selector = '[data-reveal-item]') {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return
    const targets = ref.current.querySelectorAll(selector)
    if (!targets.length) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          stagger: 0.12,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 82%',
            once: true,
          },
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [selector])

  return ref as RefObject<HTMLElement>
}

/**
 * Single-element scroll reveal — for section headings, standalone blocks.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            once: true,
          },
        }
      )
    })

    return () => ctx.revert()
  }, [])

  return ref
}
