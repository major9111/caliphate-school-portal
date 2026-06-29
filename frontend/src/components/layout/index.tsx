import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarCheck,
  FileText, DollarSign, Clock, BarChart3, Settings, Megaphone, Globe,
  Bot, Bell, Bus, Package, CreditCard, CalendarDays, UserCheck,
  LogOut, Menu, X, ChevronDown, ChevronRight, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Students', href: '/app/students', icon: Users },
  { title: 'Teachers', href: '/app/teachers', icon: GraduationCap },
  { title: 'Classes', href: '/app/classes', icon: BookOpen },
  { title: 'Attendance', href: '/app/attendance', icon: CalendarCheck },
  { title: 'Results & Grading', href: '/app/results', icon: FileText },
  { title: 'Homework', href: '/app/homework', icon: BookOpen },
  { title: 'Exams', href: '/app/exams', icon: FileText },
  { title: 'Schedule', href: '/app/schedule', icon: Clock },
  { title: 'Finance', href: '/app/finance', icon: DollarSign },
  { title: 'Payroll', href: '/app/payroll', icon: CreditCard },
  { title: 'Admissions', href: '/app/admissions', icon: UserCheck },
  { title: 'Library', href: '/app/library', icon: BookOpen },
  { title: 'Transport', href: '/app/transport', icon: Bus },
  { title: 'Inventory', href: '/app/inventory', icon: Package },
  { title: 'Communication', href: '/app/communication', icon: Megaphone },
  { title: 'Notifications', href: '/app/notifications', icon: Bell },
  { title: 'Events', href: '/app/events', icon: CalendarDays },
  { title: 'Website CMS', href: '/app/cms', icon: Globe },
  { title: 'AI Receptionist', href: '/app/ai-receptionist', icon: Bot },
  {
    title: 'Portals',
    href: '/app/portals',
    icon: Sparkles,
    subItems: [
      { title: 'Parent Portal', href: '/app/parent-portal' },
      { title: 'Student Portal', href: '/app/student-portal' },
    ],
  },
  { title: 'Audit Logs', href: '/app/audit-logs', icon: FileText },
  { title: 'Reports', href: '/app/reports', icon: BarChart3 },
  { title: 'Settings', href: '/app/settings', icon: Settings },
]

export function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['portals'])

  const toggleMenu = (title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  return (
    <div className="flex h-screen bg-secondary-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-secondary-200">
          <Link to="/app" className="flex items-center gap-2 font-bold text-primary-700">
            <GraduationCap className="h-6 w-6" />
            <span>Caliphate Schools</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) =>
            item.subItems ? (
              <div key={item.title}>
                <button
                  onClick={() => toggleMenu(item.title)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                  {expandedMenus.includes(item.title) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedMenus.includes(item.title) && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className={cn(
                          'block rounded-lg px-3 py-2 text-sm font-medium text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900',
                          location.pathname === sub.href && 'bg-primary-50 text-primary-700'
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
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900',
                  location.pathname === item.href && 'bg-primary-50 text-primary-700'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          )}

          <div className="pt-4 mt-4 border-t border-secondary-200">
            <Link
              to="/login"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
              SA
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
