import { useState, useMemo, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarCheck,
  FileText, DollarSign, Clock, BarChart3, Settings, Megaphone, Globe,
  Bot, Bell, Bus, Package, CreditCard, CalendarDays, UserCheck,
  LogOut, Menu, X, ChevronDown, ChevronRight, Sparkles, BookMarked,
  ClipboardList, Shield, Receipt, Upload, User as UserIcon, Image, ArrowUpCircle,
  ChevronLeft, Search, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sun, Moon } from 'lucide-react'
import { usePageTransition, useSubtleStagger } from '@/hooks/useGsapDashboard'
import { isPathBlockedForRole } from '@/lib/utils'
import { CommandPalette, type CommandItem } from '@/components/ui/command-palette'
import { NotificationPanel } from '@/components/ui/notification-panel'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  subItems?: Array<{ title: string; href: string }>
}

const navItems: NavItem[] = [
  { title: 'Dashboard',       href: '/app/dashboard',       icon: LayoutDashboard },
  { title: 'Students',        href: '/app/students',         icon: Users },
  { title: 'Teachers',        href: '/app/teachers',         icon: GraduationCap },
  { title: 'Classes',         href: '/app/classes',          icon: BookOpen },
  { title: 'Promotion',       href: '/app/promotion',        icon: ArrowUpCircle },
  { title: 'Attendance',      href: '/app/attendance',       icon: CalendarCheck },
  { title: 'Results',         href: '/app/results',          icon: FileText },
  { title: 'Homework',        href: '/app/homework',         icon: ClipboardList },
  { title: 'Exams',           href: '/app/exams',            icon: BookMarked },
  { title: 'Schedule',        href: '/app/schedule',         icon: Clock },
  { title: 'Finance',         href: '/app/finance',          icon: DollarSign },
  { title: 'Payroll',         href: '/app/payroll',          icon: CreditCard },
  { title: 'Admissions',      href: '/app/admissions',       icon: UserCheck },
  { title: 'Library',         href: '/app/library',          icon: BookOpen },
  { title: 'Transport',       href: '/app/transport',        icon: Bus },
  { title: 'Inventory',       href: '/app/inventory',        icon: Package },
  { title: 'Communication',   href: '/app/communication',    icon: Megaphone },
  { title: 'Notifications',   href: '/app/notifications',    icon: Bell },
  { title: 'Events',          href: '/app/events',           icon: CalendarDays },
  { title: 'Website CMS',     href: '/app/cms',              icon: Globe },
  { title: 'Gallery',         href: '/app/gallery',          icon: Image },
  { title: 'AI Receptionist', href: '/app/ai-receptionist',  icon: Bot },
  {
    title: 'Portals', href: '/app/portals', icon: Sparkles,
    subItems: [
      { title: 'Parent Portal',  href: '/app/parent-portal' },
      { title: 'Student Portal', href: '/app/student-portal' },
    ],
  },
  { title: 'Audit Logs',      href: '/app/audit-logs',       icon: Shield },
  { title: 'Fee Management',  href: '/app/fees',             icon: Receipt },
  { title: 'Bulk Import',     href: '/app/bulk-import',      icon: Upload },
  { title: 'My Profile',      href: '/app/profile',          icon: UserIcon },
  { title: 'Reports',         href: '/app/reports',          icon: BarChart3 },
  { title: 'Settings',        href: '/app/settings',         icon: Settings },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: () => import('@/lib/api').then(m => m.notificationsApi.list({ limit: 50 })) })
  const unreadCount = notifData?.items?.filter((n: { read: boolean }) => !n.read).length || 0
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Portals'])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const mainRef = usePageTransition<HTMLElement>(location.pathname)
  const navRef = useSubtleStagger('a, button')

  // Global ⌘K / Ctrl+K to open the command palette from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleMenu = (title: string) =>
    setExpandedMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('sidebar_collapsed', String(!c))
      return !c
    })
  }

  const toggleSidebarButton = () => {
    if (window.innerWidth >= 1024) toggleCollapsed()
    else setSidebarOpen((o) => !o)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const isActive = (href: string) =>
    href === '/app/dashboard'
      ? location.pathname === href
      : location.pathname.startsWith(href)

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const visibleNavItems = navItems
    .filter((item) => {
      if ((user?.role === 'parent' || user?.role === 'student') && item.href === '/app/dashboard') return false
      const ownAllowed = !isPathBlockedForRole(item.href, user?.role)
      const subAllowed = item.subItems?.some((si) => !isPathBlockedForRole(si.href, user?.role))
      return ownAllowed || subAllowed
    })
    .map((item) =>
      item.subItems
        ? { ...item, subItems: item.subItems.filter((si) => !isPathBlockedForRole(si.href, user?.role)) }
        : item
    )

  const currentPageTitle = visibleNavItems.find(
    (item) => isActive(item.href) || item.subItems?.some((si) => isActive(si.href))
  )?.title || 'Dashboard'

  const commandItems: CommandItem[] = useMemo(() => {
    const flat: CommandItem[] = []
    visibleNavItems.forEach((item) => {
      flat.push({ title: item.title, href: item.href, icon: item.icon })
      item.subItems?.forEach((si) => flat.push({ title: si.title, href: si.href, icon: item.icon }))
    })
    return flat
  }, [visibleNavItems])

  return (
    <div className="flex h-screen overflow-hidden p-0 lg:p-3 gap-3">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — glass surface (accent), floating on desktop.
          Width is driven by a CSS var only at the lg breakpoint, so the
          mobile drawer always renders full-width regardless of whatever
          collapsed preference was saved from a desktop session. */}
      <aside
        style={{ ['--sidebar-w' as string]: collapsed ? '84px' : '256px' }}
        className={cn(
          'glass-sidebar fixed inset-y-0 left-0 z-50 flex flex-col rounded-none lg:rounded-2xl w-64',
          'lg:static lg:translate-x-0 transition-transform duration-300',
          'lg:w-[var(--sidebar-w)] lg:transition-[width] lg:duration-300 lg:ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--border)] flex-shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-9 w-9 rounded-xl object-cover flex-shrink-0" />
            {!collapsed && (
              <span className="text-[13px] font-display font-semibold leading-tight text-[var(--text)] truncate">
                Caliphate Schools
              </span>
            )}
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--surface-2)] flex-shrink-0" aria-label="Close sidebar">
            <X className="h-5 w-5 text-[var(--text-2)]" />
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-0.5">
          {visibleNavItems.map((item) =>
            item.subItems ? (
              <div key={item.title}>
                <button
                  onClick={() => toggleMenu(item.title)}
                  title={collapsed ? item.title : undefined}
                  className="relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </div>
                  {!collapsed && (
                    expandedMenus.includes(item.title)
                      ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>
                {!collapsed && expandedMenus.includes(item.title) && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'block rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors',
                          isActive(sub.href) && 'bg-primary-500/10 text-primary-600 dark:text-primary-300 font-semibold'
                        )}
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.title : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'text-primary-700 dark:text-primary-300 font-semibold'
                    : 'text-[var(--text-2)] hover:text-[var(--text)]'
                )}
              >
                {isActive(item.href) && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-xl bg-primary-500/10 dark:bg-primary-400/15"
                  />
                )}
                {!isActive(item.href) && (
                  <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 hover:bg-[var(--surface-2)] transition-opacity" />
                )}
                <item.icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" />
                {!collapsed && <span className="relative z-10 truncate">{item.title}</span>}
              </Link>
            )
          )}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center gap-2 mx-2.5 mb-2 px-3 py-2 rounded-xl text-[13px] font-medium text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Profile / Logout */}
        <div className="p-2.5 border-t border-[var(--border)] flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[var(--surface-2)] mb-1.5">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--indigo), #818CF8)' }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-none truncate text-[var(--text)]">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-[var(--text-3)] mt-1 capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top nav — glass surface (accent) */}
        <header className="glass-nav flex h-16 items-center justify-between rounded-none lg:rounded-2xl px-4 lg:px-5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebarButton}
              className="p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-[18px] w-[18px] text-[var(--text-2)]" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm ml-1">
              <span className="text-[var(--text-3)]">Portal</span>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <span className="font-medium text-[var(--text)]">{currentPageTitle}</span>
            </div>
            {location.pathname !== '/app/dashboard' && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 ml-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 w-64 lg:w-80 border border-[var(--border)] bg-[var(--surface-2)] hover:border-primary-500/40 transition-colors text-left"
          >
            <Search className="h-4 w-4 text-[var(--text-3)] flex-shrink-0" />
            <span className="text-sm w-full text-[var(--text-3)]">Jump to a page…</span>
            <kbd className="text-[10px] text-[var(--text-3)] border border-[var(--border)] rounded px-1.5 py-0.5 font-mono flex-shrink-0">⌘K</kbd>
          </button>

          <div className="flex items-center gap-1.5">
            <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors" aria-label="Toggle dark mode">
              {isDark ? <Sun className="h-[18px] w-[18px] text-[var(--text-2)]" /> : <Moon className="h-[18px] w-[18px] text-[var(--text-2)]" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px] text-[var(--text-2)]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} items={notifData?.items || []} />
            </div>
            <div className="flex items-center gap-2 ml-1 pl-1">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--indigo), #818CF8)' }}>
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-[var(--text)] leading-none">{user?.full_name || 'User'}</p>
                <p className="text-xs text-[var(--text-3)] mt-0.5 capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content — solid surface, no glass */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette items={commandItems} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

export default Layout
