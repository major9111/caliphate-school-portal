// Respect users who've asked for reduced motion at the OS level. Kept
// synchronous (no gsap dependency) so callers can bail out before ever
// triggering the dynamic import below.
export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type GsapModule = { gsap: typeof import('gsap').gsap; ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }

let loadPromise: Promise<GsapModule> | null = null

/** Lazily loads GSAP + ScrollTrigger on first use and registers the plugin
 * exactly once. GSAP is a "nice to have" for entrance animations, not
 * critical-path functionality, so it's excluded from the main bundle —
 * this was previously a static import pulled in by Layout/PublicLayout
 * (which aren't lazy-loaded), forcing ~100KB+ into every single visit's
 * initial bundle. */
export function loadGsap(): Promise<GsapModule> {
  if (!loadPromise) {
    loadPromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapMod, stMod]) => {
        gsapMod.gsap.registerPlugin(stMod.ScrollTrigger)
        return { gsap: gsapMod.gsap, ScrollTrigger: stMod.ScrollTrigger }
      }
    )
  }
  return loadPromise
}
