import { useState } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarCheck,
  FileText, DollarSign, Clock, BarChart3, Settings, Megaphone, Globe,
  Bot, Bell, Bus, Package, CreditCard, CalendarDays, UserCheck,
  LogOut, Menu, X, ChevronDown, ChevronRight, Sparkles, BookMarked,
  ClipboardList, Shield, Receipt, Upload, User as UserIcon, Image, ArrowUpCircle,
  ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Sun, Moon } from 'lucide-react'
import { usePageTransition, useSubtleStagger } from '@/hooks/useGsapDashboard'
import { isPathBlockedForRole } from '@/lib/utils'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Portals'])
  const mainRef = usePageTransition<HTMLElement>(location.pathname)
  const navRef = useSubtleStagger('a, button')

  const toggleMenu = (title: string) =>
    setExpandedMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )

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

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-secondary-200 flex-shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-2 font-bold text-primary-700">
            <img src="/images/logo.jpg" alt="Caliphate International Schools logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-sm leading-tight">Caliphate Schools</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleNavItems.map((item) =>
            item.subItems ? (
              <div key={item.title}>
                <button
                  onClick={() => toggleMenu(item.title)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.title}
                  </div>
                  {expandedMenus.includes(item.title)
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />
                  }
                </button>
                {expandedMenus.includes(item.title) && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'block rounded-lg px-3 py-1.5 text-sm font-medium text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900 transition-colors',
                          isActive(sub.href) && 'bg-primary-50 text-primary-700 font-semibold'
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
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 transition-colors',
                  isActive(item.href) && 'bg-primary-50 text-primary-700 font-semibold'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.title}
              </Link>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-secondary-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top nav */}
        <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg hover:bg-secondary-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            {location.pathname !== '/app/dashboard' && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-secondary-100 transition-colors" aria-label="Toggle dark mode">
              {isDark ? <Sun className="h-5 w-5 text-secondary-600" /> : <Moon className="h-5 w-5 text-secondary-600" />}
            </button>
            <Link to="/app/notifications" className="p-2 rounded-lg hover:bg-secondary-100 transition-colors relative">
              <Bell className="h-5 w-5 text-secondary-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-secondary-900 leading-none">{user?.full_name || 'User'}</p>
                <p className="text-xs text-secondary-500 mt-0.5 capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
