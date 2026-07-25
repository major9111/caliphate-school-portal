/**
 * FUGUSAU Portal — Theme Context
 * Default: light. If the person hasn't explicitly chosen a theme in this
 * browser, the app follows their OS/browser color-scheme preference live —
 * including if they flip it while the app is open. The moment they use the
 * toggle, that becomes an explicit choice, is persisted, and system changes
 * are no longer auto-applied.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'fugusau-theme'
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Some browsers/modes (Brave Shields, Safari Private Browsing, embedded
// webviews with blocked site data) throw a SecurityError just from touching
// localStorage. Never let that take down the whole app — degrade to an
// in-memory-only theme instead.
function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage blocked — theme still works for this session, just won't persist */
  }
}
function getSystemPreference(): Theme {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch {
    /* matchMedia unsupported/blocked — fall through to the light default */
  }
  return 'light'
}
function getExplicitStoredTheme(): Theme | null {
  const stored = safeGetItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return getExplicitStoredTheme() ?? getSystemPreference()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [isExplicit, setIsExplicit] = useState<boolean>(() => getExplicitStoredTheme() !== null)

  // Apply to the DOM + persist, but only persist when the choice was explicit
  // — auto system-driven updates shouldn't lock in and stop future following.
  useEffect(() => {
    try {
      const root = document.documentElement
      root.setAttribute('data-theme', theme)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F7F5' : '#006B3F')
    } catch {
      /* non-fatal DOM issue — don't crash the app over cosmetic setup */
    }
    if (isExplicit) safeSetItem(STORAGE_KEY, theme)
  }, [theme, isExplicit])

  // Live-follow the OS/browser preference until the user makes an explicit choice.
  useEffect(() => {
    if (isExplicit) return
    if (typeof window === 'undefined' || !window.matchMedia) return

    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const handleChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light')

    try {
      mql.addEventListener('change', handleChange)
      return () => mql.removeEventListener('change', handleChange)
    } catch {
      // Safari < 14 fallback API
      // @ts-ignore
      mql.addListener?.(handleChange)
      // @ts-ignore
      return () => mql.removeListener?.(handleChange)
    }
  }, [isExplicit])

  const toggleTheme = () => {
    setIsExplicit(true)
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }
  const setTheme = (next: Theme) => {
    setIsExplicit(true)
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
