import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Phone, Mail, MapPin, X } from 'lucide-react'
import { ChatBot } from '@/components/ChatBot'
import { cn } from '@/lib/utils'
import '@/styles/public-theme.css'

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Admissions', href: '/admissions' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'News', href: '/news' },
  { name: 'Contact', href: '/contact' },
]

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="pub min-h-screen flex flex-col">
      <nav className={cn('pub-navbar', scrolled && 'pub-scrolled')}>
        <div className="pub-navbar-bar wrap max-w-[1360px] mx-auto px-3">
          <Link to="/" className="pub-nav-brand">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" />
            <span>Caliphate<br />International Schools</span>
          </Link>

          <div className="pub-nav-links hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.name} to={link.href} className={location.pathname === link.href ? 'active' : ''}>
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5">
            <Link to="/login" className="text-[13.5px] font-medium text-white/70 hover:text-white transition-colors">
              Portal Login
            </Link>
            <Link to="/admissions" className="pub-nav-cta">Apply Now</Link>
          </div>

          <button
            className="pub-nav-toggle lg:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <>
                <span /><span /><span />
              </>
            )}
          </button>
        </div>
      </nav>

      <div className={cn('pub-menu-backdrop', mobileMenuOpen && 'pub-open')} onClick={() => setMobileMenuOpen(false)} />
      <div className={cn('pub-mobile-menu', mobileMenuOpen && 'pub-open')} role="dialog" aria-modal="true" aria-label="Mobile navigation">
        <button
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
          style={{ position: 'absolute', top: 28, right: 26, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X className="h-6 w-6" style={{ color: '#fff' }} />
        </button>
        {navLinks.map((link) => (
          <Link key={link.name} to={link.href} onClick={() => setMobileMenuOpen(false)}>
            {link.name}
          </Link>
        ))}
        <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(255,255,255,.7)', fontSize: 15 }}>
          Portal Login
        </Link>
        <Link to="/admissions" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--pub-gold-soft)' }}>
          Apply Now &rarr;
        </Link>
      </div>

      <main className="flex-1"><Outlet /></main>

      <footer className="pub-footer">
        <div className="wrap max-w-[1360px] mx-auto px-4">
          <div className="pub-foot-grid">
            <div>
              <div className="pub-foot-brand">
                <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="pub-foot-brand-mark" />
                <span>Caliphate International Schools</span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 280 }}>
                Quality Islamic and Western education in Gusau, Zamfara State — since 2013.
              </p>
            </div>
            <div>
              <h5>Explore</h5>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/admissions">Admissions</Link></li>
                <li><Link to="/news">News &amp; Events</Link></li>
                <li><Link to="/gallery">Campus Life</Link></li>
              </ul>
            </div>
            <div>
              <h5>Programs</h5>
              <ul>
                <li><Link to="/about">Nursery Section</Link></li>
                <li><Link to="/about">Primary Section</Link></li>
                <li><Link to="/about">Secondary Section</Link></li>
                <li><Link to="/login">Portals</Link></li>
              </ul>
            </div>
            <div>
              <h5>Contact</h5>
              <div className="pub-foot-contact">
                <MapPin className="h-[15px] w-[15px]" />
                <Link to="/contact">No. 3, Eastern Bypass, Gusau, Zamfara State</Link>
              </div>
              <div className="pub-foot-contact">
                <Phone className="h-[15px] w-[15px]" />
                <a href="tel:+2348000000000">+234 800 000 0000</a>
              </div>
              <div className="pub-foot-contact">
                <Mail className="h-[15px] w-[15px]" />
                <a href="mailto:info@caliphateschools.edu.ng">info@caliphateschools.edu.ng</a>
              </div>
            </div>
          </div>
          <div className="pub-foot-bottom">
            <span>&copy; {new Date().getFullYear()} Caliphate International Schools Gusau Ltd. All rights reserved.</span>
            <span>
              <Link to="/login" style={{ color: 'rgba(255,255,255,.6)' }}>Staff / Student Portal</Link>
            </span>
          </div>
        </div>
      </footer>

      <ChatBot />
    </div>
  )
}

export default PublicLayout
