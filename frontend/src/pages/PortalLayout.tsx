/**
 * FUGUSAU Portal — Main Layout
 * Fixed: full admin nav + logo with multi-path onError fallback
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { notificationsAPI, chatAPI } from '@/services/api'
import { createNotificationWebSocket } from '@/services/websocket'
import toast from 'react-hot-toast'
import ThemeToggle from '@/components/common/ThemeToggle'
import GlobalSearch from '@/components/common/GlobalSearch'
import type { UserRole } from '@/types'
import {
  IconDashboard, IconCourses, IconExam, IconResults, IconFees,
  IconLibrary, IconChat, IconCredentials, IconReports, IconNotifications,
  IconProfile, IconHostel, IconForms, IconLogout, IconMenu, IconAdmin,
  IconCalendar, IconCheck, IconParent, IconArrowLeft,
} from '@/components/icons'

// ── Extra icons for admin nav ──────────────────────────────────────────────
const mkIcon = (d: string) => (p: { size?: number; className?: string }) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={p.className}>
    <path d={d}/>
  </svg>
)

const IconStudents   = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconDepts = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
  </svg>
)
const IconStaff = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <line x1="12" y1="11" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)
const IconMoney = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconAdmApp = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
)
const IconExamMgmt = (p: any) => (
  <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01"/>
  </svg>
)

// ── Logo with multi-path fallback ──────────────────────────────────────────
const B = import.meta.env.BASE_URL
const LOGO_PATHS = [`${B}fugusau-logo.png`, `${B}logo.png`, `${B}fug_logo.png`, `${B}assets/logo.png`]

function SidebarLogo({ size = 36 }: { size?: number }) {
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  const tryNext = () => {
    if (idx + 1 < LOGO_PATHS.length) setIdx(i => i + 1)
    else setFailed(true)
  }

  if (failed) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <path d="M20 3L36 10L36 24C36 32 20 38 20 38C20 38 4 32 4 24L4 10Z"
          fill="#006B3F" stroke="#00A85A" strokeWidth="1.5"/>
        <path d="M20 7L32 13L32 24C32 30 20 35 20 35C20 35 8 30 8 24L8 13Z"
          fill="#004D2E"/>
        <text x="20" y="26" textAnchor="middle" fill="#F5C842"
          fontFamily="system-ui,sans-serif" fontWeight="800" fontSize="9.5">FUG</text>
      </svg>
    )
  }

  return (
    <img src={LOGO_PATHS[idx]} alt="FUGUSAU" width={size} height={size}
      className="object-contain"
      style={{ filter: 'drop-shadow(0 0 8px rgba(0,168,90,0.4))' }}
      onError={tryNext}
    />
  )
}

// ── Navigation definition ──────────────────────────────────────────────────
type NavItem    = { path: string; Icon: React.FC<any>; label: string; badge?: string; roles?: UserRole[] }
type NavSection = { section: string; items: NavItem[] }

const ALL_NAV: NavSection[] = [
  { section: 'Main', items: [
    { path: '/dashboard', Icon: IconDashboard, label: 'Dashboard' },
  ]},

  // Student / Lecturer
  { section: 'Academics', items: [
    { path: '/courses',  Icon: IconCourses,  label: 'My Courses',  roles: ['student', 'lecturer'] },
    { path: '/exams',    Icon: IconExamMgmt, label: 'Exam Card',   roles: ['student'] },
    { path: '/results',  Icon: IconResults,  label: 'Results',     roles: ['student', 'lecturer', 'parent'] },
    { path: '/timetable', Icon: IconCalendar, label: 'Timetable',  roles: ['student', 'lecturer'] },
    { path: '/attendance', Icon: IconCheck,   label: 'Attendance', roles: ['student', 'lecturer'] },
    { path: '/ward',     Icon: IconParent,   label: 'My Ward',     roles: ['parent'] },
  ]},
  { section: 'Finance', items: [
    { path: '/fees',     Icon: IconFees,     label: 'Fees & Payments', roles: ['student', 'parent'] },
  ]},
  { section: 'Campus', items: [
    { path: '/hostel',   Icon: IconHostel,   label: 'Hostel',          roles: ['student'] },
    { path: '/forms',    Icon: IconForms,    label: 'Forms',           roles: ['student'] },
  ]},

  // Admin management
  { section: 'Management', items: [
    { path: '/admin/students',    Icon: IconStudents, label: 'Students',           roles: ['admin'] },
    { path: '/admin/staff',       Icon: IconStaff,    label: 'Staff & Lecturers',  roles: ['admin'] },
    { path: '/admin/departments', Icon: IconDepts,    label: 'Departments',        roles: ['admin'] },
    { path: '/admin/courses',     Icon: IconCourses,  label: 'Course Management',  roles: ['admin', 'lecturer'] },
    { path: '/admin/exams',       Icon: IconExamMgmt, label: 'Examinations',       roles: ['admin', 'lecturer'] },
    { path: '/admin/results',     Icon: IconResults,  label: 'Results Management', roles: ['admin', 'lecturer'] },
  ]},
  { section: 'Finance Admin', items: [
    { path: '/admin/fees',        Icon: IconMoney,    label: 'Fee Management',     roles: ['admin'] },
  ]},
  { section: 'Admissions', items: [
    { path: '/admin/admissions',  Icon: IconAdmApp,   label: 'Applications',       roles: ['admin'] },
  ]},
  { section: 'Facilities', items: [
    { path: '/admin/library',     Icon: IconLibrary,  label: 'Library Management', roles: ['admin'] },
    { path: '/admin/hostel',      Icon: IconHostel,   label: 'Hostel Management',  roles: ['admin'] },
  ]},

  // Shared
  { section: 'Resources', items: [
    { path: '/library',       Icon: IconLibrary,       label: 'Library & eBooks', badge: 'AI', roles: ['student','lecturer','parent'] },
    { path: '/chat',          Icon: IconChat,          label: 'Messages',         badge: 'chat' },
    { path: '/notifications', Icon: IconNotifications, label: 'Notifications',    badge: 'notif' },
  ]},
  { section: 'Tools', items: [
    { path: '/credentials',   Icon: IconCredentials,   label: 'Credential Verifier', badge: 'AI', roles: ['admin', 'lecturer'] },
    { path: '/reports',       Icon: IconReports,       label: 'Reports & Analytics', roles: ['admin', 'lecturer'] },
    { path: '/admin/security',Icon: IconAdmin,         label: 'Security Dashboard',  roles: ['admin'] },
  ]},
  { section: 'Account', items: [
    { path: '/profile',       Icon: IconProfile,       label: 'Profile Settings' },
  ]},
]

// ── Mobile bottom-nav: role-aware, always 5 items ───────────────────────────
function mobileBottomNav(role: UserRole | undefined): NavItem[] {
  const primary: Record<string, NavItem> =
    { student:  { path: '/courses', Icon: IconCourses, label: 'Courses' },
      lecturer: { path: '/courses', Icon: IconCourses, label: 'Courses' },
      admin:    { path: '/admin/students', Icon: IconStudents, label: 'Students' },
      parent:   { path: '/results', Icon: IconResults, label: 'Results' } }
  const items: NavItem[] = [{ path: '/dashboard', Icon: IconDashboard, label: 'Home' }]
  if (role && primary[role]) items.push(primary[role])
  items.push({ path: '/chat', Icon: IconChat, label: 'Chat', badge: 'chat' })
  items.push({ path: '/notifications', Icon: IconNotifications, label: 'Alerts', badge: 'notif' })
  items.push({ path: '/profile', Icon: IconProfile, label: 'Profile' })
  return items
}

function filterNav(role: UserRole | undefined): NavSection[] {
  if (!role) return []
  return ALL_NAV
    .map(s => ({ ...s, items: s.items.filter(i => !i.roles || i.roles.includes(role)) }))
    .filter(s => s.items.length > 0)
}

const ROLE_BADGE: Record<string, string> = {
  student:  'bg-primary/20 text-primary-light border-primary/30',
  lecturer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  admin:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  parent:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
}
const ROLE_LABELS: Record<string, string> = {
  student: 'Student', lecturer: 'Lecturer', admin: 'Administrator', parent: 'Parent',
}

// ── Component ──────────────────────────────────────────────────────────────
export default function PortalLayout() {
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadChat,  setUnreadChat]  = useState(0)
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  const role        = user?.role as UserRole | undefined
  const navSections = filterNav(role)
  const bottomNav    = mobileBottomNav(role)
  const segment     = location.pathname.split('/')[1]
  const pageTitle   = segment.charAt(0).toUpperCase() + segment.slice(1) || 'Dashboard'
  const initials    = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Mobile drawer should always render fully expanded, independent of the
  // desktop collapse toggle
  function openMobileDrawer() { setCollapsed(false); setMobileOpen(true) }

  useEffect(() => {
    if (!user) return
    notificationsAPI.list().then(({ data }) => {
      const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
      setUnreadCount(items.filter((n: any) => !n.is_read).length)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    chatAPI.getRooms().then(({ data }) => {
      const rooms = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
      setUnreadChat(rooms.reduce((s: number, r: any) => s + (r.unread_count ?? 0), 0))
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0)
    if (location.pathname === '/chat')          setUnreadChat(0)
  }, [location.pathname])

  useEffect(() => {
    if (!user) return
    const ws = createNotificationWebSocket()
    ws.on('notification', (data: any) => { setUnreadCount(c => c + 1); toast(data.message) })
    return () => ws.disconnect()
  }, [user])

  function BadgeEl({ badge }: { badge: string }) {
    let display: string | number | null = null
    if (badge === 'chat')       display = unreadChat  > 0 ? (unreadChat  > 99 ? '99+' : unreadChat)  : null
    else if (badge === 'notif') display = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null
    else                        display = badge
    if (!display) return null
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        badge === 'AI' ? 'bg-amber-500/80 text-black' : 'bg-red-500 text-white'
      }`}>{display}</span>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-dark text-white">

      {/* ─── Mobile backdrop ─────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─────────────────────────────── */}
      <aside className={`
        ${collapsed ? 'md:w-[68px]' : 'md:w-[240px]'}
        w-[260px] fixed md:static inset-y-0 left-0 z-50 md:z-auto
        flex flex-col flex-shrink-0 h-full glass-strong sidebar-shadow border-r border-white/[0.06]
        transition-transform md:transition-all duration-300 ease-in-out overflow-hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'md:justify-center' : ''}`}>
          <div className="relative flex-shrink-0 w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg pointer-events-none" />
            <SidebarLogo size={34} />
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="font-bold text-sm text-white leading-tight">FUGUSAU</div>
            <div className="text-[10px] text-primary-light/60 tracking-wider">
              {role === 'admin' ? 'Admin Panel' : role === 'lecturer' ? 'Staff Portal' : role === 'parent' ? 'Parent Portal' : 'Student Portal'}
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0">
            ✕
          </button>
        </div>

        {/* User card */}
        {!collapsed && user && (
          <div className="mx-3 my-3 rounded-2xl p-3.5 flex-shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(0,107,63,.25),rgba(0,60,35,.3))', border: '1px solid rgba(0,168,90,.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                {user.profile_photo
                  ? <img src={user.profile_photo} alt="" className="w-full h-full rounded-xl object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white truncate">{user.name}</div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize inline-block mt-0.5 ${ROLE_BADGE[user.role] || ''}`}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navSections.map(({ section, items }, sIdx) => (
            <div key={section}>
              {/* Section divider — skip for the very first section */}
              {sIdx > 0 && !collapsed && (
                <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20 flex-shrink-0">
                    {section}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )}

              {/* First section label (no top divider) */}
              {sIdx === 0 && !collapsed && (
                <div className="px-3 pb-1 pt-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">
                    {section}
                  </span>
                </div>
              )}

              {/* Collapsed: just a thin divider between groups */}
              {sIdx > 0 && collapsed && (
                <div className="mx-3 my-2 h-px bg-white/[0.07]" />
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {items.map(({ path, Icon, label, badge }) => (
                  <NavLink key={path} to={path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm border-l-2 transition-all duration-150
                      ${collapsed ? 'justify-center' : ''}
                      ${isActive
                        ? 'bg-primary/12 border-primary-light text-primary-light font-semibold'
                        : 'border-transparent text-white/40 hover:text-white/75 hover:bg-white/[0.04]'}`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate text-[13px]">{label}</span>
                        {badge && <BadgeEl badge={badge} />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 p-2 border-t border-white/[0.06]">
          <button onClick={() => logout().then(() => navigate('/login'))}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 hover:text-red-400 hover:bg-red-500/8 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <IconLogout size={18} className="flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="glass-strong border-b border-white/[0.06] px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 flex-shrink-0 z-20">
          {/* Mobile: open drawer */}
          <button onClick={openMobileDrawer}
            className="md:hidden w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0">
            <IconMenu size={18} />
          </button>
          {/* Desktop: collapse/expand */}
          <button onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex w-9 h-9 glass rounded-xl border border-white/[0.08] items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0">
            <IconMenu size={18} />
          </button>
          {/* Back — hidden on the dashboard root, since that's "home" */}
          {location.pathname !== '/dashboard' && (
            <button onClick={() => navigate(-1)} aria-label="Go back"
              className="w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all flex-shrink-0">
              <IconArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{pageTitle}</h1>
            <p className="text-[11px] text-white/35 mt-0.5 hidden sm:block">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <div className="glass rounded-lg px-3 py-1.5 border border-white/[0.08] hidden md:block">
              <span className="text-[11px] font-mono text-amber-400">2025/2026 · 2nd Sem</span>
            </div>
            <ThemeToggle />
            <GlobalSearch />
            <NavLink to="/notifications"
              className="relative w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all">
              <IconNotifications size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/chat"
              className="relative w-9 h-9 glass rounded-xl border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-all">
              <IconChat size={18} />
              {unreadChat > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile"
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border border-primary/30 hover:border-primary-light transition-all"
              style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
              {user?.profile_photo
                ? <img src={user.profile_photo} alt="" className="w-full h-full rounded-xl object-cover" />
                : initials}
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 bg-dark/40">
          <div className="animate-fade-in"><Outlet /></div>
        </main>
      </div>

      {/* ─── Mobile bottom nav ───────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-white/[0.08] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {bottomNav.map(({ path, Icon, label, badge }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
          let count: number | null = null
          if (badge === 'chat')  count = unreadChat  > 0 ? unreadChat  : null
          if (badge === 'notif') count = unreadCount > 0 ? unreadCount : null
          return (
            <NavLink key={path} to={path}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative"
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'text-primary-light' : 'text-white/40'} />
                {count !== null && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-light' : 'text-white/40'}`}>
                {label}
              </span>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary-light" />}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
