/**
 * FUGUSAU Portal — 404 Not Found
 */
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,107,63,0.08) 0%, transparent 60%),' +
          'radial-gradient(ellipse 60% 50% at 80% 90%, rgba(0,80,45,0.06) 0%, transparent 60%)',
      }}>
      <div className="text-center max-w-sm">
        {/* Big 404 */}
        <div className="relative mb-6 select-none">
          <div className="text-[120px] font-extrabold leading-none"
            style={{
              background: 'linear-gradient(135deg, rgba(0,168,90,0.15) 0%, rgba(0,107,63,0.05) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-white/40 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
