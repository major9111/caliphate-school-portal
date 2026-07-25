import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '@/lib/ThemeContext'
import { NAV_LINKS, PORTAL_URL } from '@/data/nav'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass-card shadow-sm' : 'bg-transparent'
    }`}>
      <div className="container-page flex items-center justify-between h-16 lg:h-20">
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={() => setMobileOpen(false)}>
          <img src="/fugusau-logo.png" alt="FUGUSAU" className="w-9 h-9 lg:w-10 lg:h-10 object-contain" />
          <div className="leading-tight">
            <div className="font-extrabold text-sm lg:text-base">FUGUSAU</div>
            <div className="text-[9px] lg:text-[10px] text-muted tracking-wider hidden sm:block">FEDERAL UNIVERSITY GUSAU</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <NavLink key={l.slug} to={`/${l.slug}`}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                isActive ? 'text-primary' : 'text-muted hover:text-primary'
              }`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="w-9 h-9 rounded-full glass-card flex items-center justify-center hover:text-primary transition-colors">
            <i className={theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars'} />
          </button>
          <a href={`${PORTAL_URL}/login`} target="_blank" rel="noreferrer"
            className="hidden md:inline-flex btn-primary !py-2.5 !px-5 text-xs">
            <i className="bi bi-box-arrow-in-right" /> Student Portal
          </a>
          <button onClick={() => setMobileOpen(v => !v)} aria-label="Menu"
            className="lg:hidden w-9 h-9 rounded-full glass-card flex items-center justify-center">
            <i className={mobileOpen ? 'bi bi-x-lg' : 'bi bi-list'} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden glass-card border-t px-5 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map(l => (
              <NavLink key={l.slug} to={`/${l.slug}`} onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold glass-card">
                {l.label}
              </NavLink>
            ))}
          </div>
          <a href={`${PORTAL_URL}/login`} target="_blank" rel="noreferrer"
            className="btn-primary w-full justify-center mt-3">
            <i className="bi bi-box-arrow-in-right" /> Student Portal Login
          </a>
        </div>
      )}
    </header>
  )
}
