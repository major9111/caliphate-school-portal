import { Link } from 'react-router-dom'
import { NAV_LINKS, PORTAL_URL } from '@/data/nav'

export default function Footer() {
  return (
    <footer className="border-t mt-24" style={{ borderColor: 'rgb(var(--border) / var(--border-alpha))' }}>
      <div className="container-page py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <img src="/fugusau-logo.png" alt="FUGUSAU" className="w-9 h-9 object-contain" />
            <span className="font-extrabold">Federal University Gusau</span>
          </div>
          <p className="text-sm text-muted max-w-sm leading-relaxed">
            Knowledge · Innovation · Service — Gusau, Zamfara State, Nigeria.
          </p>
          <div className="flex gap-3 mt-4">
            {['facebook', 'twitter-x', 'instagram', 'youtube', 'linkedin'].map(icon => (
              <a key={icon} href="#" aria-label={icon}
                className="w-9 h-9 rounded-full glass-card flex items-center justify-center hover:text-primary transition-colors">
                <i className={`bi bi-${icon}`} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.slice(0, 6).map(l => (
              <li key={l.slug}><Link to={`/${l.slug}`} className="text-muted hover:text-primary">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href={`${PORTAL_URL}/login`} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">Student Portal</a></li>
            <li><a href={`${PORTAL_URL}/admission`} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">Apply Now</a></li>
            <li><Link to="/contact" className="text-muted hover:text-primary">Contact Us</Link></li>
            <li><Link to="/downloads" className="text-muted hover:text-primary">Downloads</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t py-5" style={{ borderColor: 'rgb(var(--border) / var(--border-alpha))' }}>
        <div className="container-page flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <span>© {new Date().getFullYear()} Federal University Gusau. All rights reserved.</span>
          <span>ICT Directorate · ict@fugusau.edu.ng</span>
        </div>
      </div>
    </footer>
  )
}
