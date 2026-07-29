import { useEffect, useRef, useState } from 'react'

/** Animates a number from 0 (or its previous value) up to `target` with an
 * ease-out curve. Skips straight to the target if the user prefers reduced
 * motion. Used for stat-card figures across the dashboard and similar pages. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || !Number.isFinite(target)) {
      setValue(target)
      return
    }

    let startTs: number | null = null
    let raf: number
    const from = fromRef.current

    const step = (ts: number) => {
      if (startTs === null) startTs = ts
      const progress = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (target - from) * eased)
      setValue(current)
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}