import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone, Mail, MapPin, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatBot } from '@/components/ChatBot'
import { cn } from '@/lib/utils'
import { useHeroReveal } from '@/hooks/useGsapPublic'
import { useDarkMode } from '@/hooks/useDarkMode'

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
  const location = useLocation()
  const headerRef = useHeroReveal()
  const { isDark, toggle: toggleDark } = useDarkMode()

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <div className="border-b border-[var(--border)] text-xs py-2 hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center text-[var(--text-3)]">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> +234 800 000 0000</span>
            <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> info@caliphateschools.edu.ng</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-[var(--text)] transition-colors">Staff Portal</Link>
            <Link to="/login" className="hover:text-[var(--text)] transition-colors">Student Portal</Link>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="glass-nav sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" data-reveal className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover ring-1 ring-[var(--border)]" />
            <div>
              <h1 className="text-sm md:text-lg font-display font-semibold text-[var(--text)] leading-tight">Caliphate Schools</h1>
              <p className="text-xs text-[var(--text-3)] leading-tight hidden sm:block">Excellence in Education</p>
            </div>
          </Link>

          <nav data-reveal className="hidden lg:flex items-center gap-6 md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  'relative text-sm font-medium transition-colors hover:text-[var(--text)] pb-1',
                  location.pathname === link.href
                    ? "text-[var(--text)] after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:rounded-full after:bg-[var(--indigo)]"
                    : 'text-[var(--text-2)]'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div data-reveal className="hidden lg:flex items-center gap-2 md:gap-3">
            <button onClick={toggleDark} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors" aria-label="Toggle dark mode">
              {isDark ? <Sun className="h-[18px] w-[18px] text-[var(--text-2)]" /> : <Moon className="h-[18px] w-[18px] text-[var(--text-2)]" />}
            </button>
            <Link to="/login"><Button variant="outline" size="sm">Portal Login</Button></Link>
            <Link to="/register"><Button size="sm">Sign Up</Button></Link>
          </div>

          <button className="lg:hidden p-2 text-[var(--text)]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="lg:hidden border-t border-[var(--border)] overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {navLinks.map((link) => (
                  <Link key={link.name} to={link.href} onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-[var(--text-2)] hover:text-[var(--indigo)] transition-colors">
                    {link.name}
                  </Link>
                ))}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <span className="text-sm font-medium text-[var(--text-2)]">Theme</span>
                  <button onClick={toggleDark} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors" aria-label="Toggle dark mode">
                    {isDark ? <Sun className="h-[18px] w-[18px] text-[var(--text-2)]" /> : <Moon className="h-[18px] w-[18px] text-[var(--text-2)]" />}
                  </button>
                </div>
                <div className="space-y-2">
                  <Link to="/login" className="block w-full"><Button variant="outline" className="w-full">Portal Login</Button></Link>
                  <Link to="/register" className="block w-full"><Button className="w-full">Sign Up</Button></Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface-2)] py-8 md:py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover ring-1 ring-[var(--border)]" />
              <h3 className="text-[var(--text)] font-display font-semibold text-base md:text-lg">Caliphate Schools</h3>
            </div>
            <p className="text-xs md:text-sm text-[var(--text-2)] mb-4">Providing quality Islamic and Western education in Gusau, Zamfara State since 2013.</p>
            <div className="space-y-2 text-xs md:text-sm text-[var(--text-2)]">
              <p className="flex items-center gap-2"><MapPin className="h-3 w-3 md:h-4 md:w-4 text-[var(--indigo)]" /> No. 3, Eastern Bypass, Gusau</p>
              <p className="flex items-center gap-2"><Phone className="h-3 w-3 md:h-4 md:w-4 text-[var(--indigo)]" /> +234 800 000 0000</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3 md:h-4 md:w-4 text-[var(--indigo)]" /> info@caliphateschools.edu.ng</p>
            </div>
          </div>
          <div>
            <h4 className="text-[var(--text)] font-display font-semibold mb-4 text-sm md:text-base">Quick Links</h4>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-2)]">
              <li><Link to="/about" className="hover:text-[var(--indigo)] transition-colors">About Us</Link></li>
              <li><Link to="/admissions" className="hover:text-[var(--indigo)] transition-colors">Admissions</Link></li>
              <li><Link to="/news" className="hover:text-[var(--indigo)] transition-colors">News & Events</Link></li>
              <li><Link to="/contact" className="hover:text-[var(--indigo)] transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text)] font-display font-semibold mb-4 text-sm md:text-base">Academics</h4>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-2)]">
              <li><a href="#" className="hover:text-[var(--indigo)] transition-colors">Nursery Section</a></li>
              <li><a href="#" className="hover:text-[var(--indigo)] transition-colors">Primary Section</a></li>
              <li><a href="#" className="hover:text-[var(--indigo)] transition-colors">Secondary Section</a></li>
              <li><a href="#" className="hover:text-[var(--indigo)] transition-colors">Curriculum</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text)] font-display font-semibold mb-4 text-sm md:text-base">Portals</h4>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-2)]">
              <li><Link to="/login" className="hover:text-[var(--indigo)] transition-colors">Staff Login</Link></li>
              <li><Link to="/login" className="hover:text-[var(--indigo)] transition-colors">Student Login</Link></li>
              <li><Link to="/login" className="hover:text-[var(--indigo)] transition-colors">Parent Login</Link></li>
              <li><Link to="/register" className="hover:text-[var(--indigo)] transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[var(--border)] text-center text-xs text-[var(--text-3)]">
          2026 Caliphate International Schools Gusau Ltd. All rights reserved.
        </div>
      </footer>

      <ChatBot />
    </div>
  )
}
