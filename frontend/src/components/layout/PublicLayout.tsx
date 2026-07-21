import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatBot } from '@/components/ChatBot'
import { cn } from '@/lib/utils'
import { useHeroReveal } from '@/hooks/useGsapPublic'

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-primary-900 text-white text-xs py-2 hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> +234 800 000 0000</span>
            <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> info@caliphateschools.edu.ng</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-blue-200 transition-colors">Staff Portal</Link>
            <Link to="/login" className="hover:text-blue-200 transition-colors">Student Portal</Link>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-secondary-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" data-reveal className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-1 ring-secondary-200" />
            <div>
              <h1 className="text-sm md:text-lg font-bold text-secondary-900 leading-tight">Caliphate Schools</h1>
              <p className="text-xs text-secondary-500 leading-tight hidden sm:block">Excellence in Education</p>
            </div>
          </Link>

          <nav data-reveal className="hidden lg:flex items-center gap-6 md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary-600',
                  location.pathname === link.href ? 'text-primary-600' : 'text-secondary-700'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div data-reveal className="hidden lg:flex items-center gap-2 md:gap-3">
            <Link to="/login"><Button variant="outline" size="sm">Portal Login</Button></Link>
            <Link to="/register"><Button size="sm">Sign Up</Button></Link>
          </div>

          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-secondary-200 bg-white p-4 space-y-4">
            {navLinks.map((link) => (
              <Link key={link.name} to={link.href} onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-secondary-700 hover:text-primary-600">
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-secondary-200 space-y-2">
              <Link to="/login" className="block w-full"><Button variant="outline" className="w-full">Portal Login</Button></Link>
              <Link to="/register" className="block w-full"><Button className="w-full">Sign Up</Button></Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="site-footer text-secondary-300 py-8 md:py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-1 ring-white/20" />
              <h3 className="text-white font-bold text-base md:text-lg">Caliphate Schools</h3>
            </div>
            <p className="text-xs md:text-sm text-secondary-400 mb-4">Providing quality Islamic and Western education in Gusau, Zamfara State since 2013.</p>
            <div className="space-y-2 text-xs md:text-sm">
              <p className="flex items-center gap-2"><MapPin className="h-3 w-3 md:h-4 md:w-4 text-primary-500" /> No. 3, Eastern Bypass, Gusau</p>
              <p className="flex items-center gap-2"><Phone className="h-3 w-3 md:h-4 md:w-4 text-primary-500" /> +234 800 000 0000</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3 md:h-4 md:w-4 text-primary-500" /> info@caliphateschools.edu.ng</p>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm md:text-base">Quick Links</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/admissions" className="hover:text-white transition-colors">Admissions</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News & Events</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm md:text-base">Academics</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Nursery Section</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Primary Section</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Secondary Section</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Curriculum</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm md:text-base">Portals</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Staff Login</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Student Login</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Parent Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 md:mt-12 pt-6 md:pt-8 border-t border-secondary-800 text-center text-xs text-secondary-500">
          2026 Caliphate International Schools Gusau Ltd. All rights reserved.
        </div>
      </footer>

      <ChatBot />
    </div>
  )
}
