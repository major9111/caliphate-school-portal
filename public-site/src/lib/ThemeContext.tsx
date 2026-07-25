import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'
interface Ctx { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<Ctx | undefined>(undefined)
const KEY = 'fugusau-site-theme'

function safeGet(k: string) { try { return localStorage.getItem(k) } catch { return null } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v) } catch {} }
function systemPref(): Theme {
  try { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' } catch { return 'light' }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = safeGet(KEY)
    return stored === 'light' || stored === 'dark' ? stored : systemPref()
  })
  const [explicit, setExplicit] = useState(() => {
    const stored = safeGet(KEY)
    return stored === 'light' || stored === 'dark'
  })

  useEffect(() => {
    try { document.documentElement.setAttribute('data-theme', theme) } catch {}
    if (explicit) safeSet(KEY, theme)
  }, [theme, explicit])

  useEffect(() => {
    if (explicit) return
    try {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    } catch { return }
  }, [explicit])

  const toggleTheme = () => { setExplicit(true); setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
