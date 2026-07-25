import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Layout as AdminLayout } from '@/components/layout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AmbientBackground } from '@/components/AmbientBackground'
import { Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { getHomeRouteForRole, isPathBlockedForRole } from '@/lib/utils'
import { useRealtime } from '@/hooks/useRealtime'

// Lazy load all pages
const PublicHome         = lazy(() => import('@/pages/public/Home'))
const PublicAbout        = lazy(() => import('@/pages/public/About'))
const PublicAdmissions   = lazy(() => import('@/pages/public/Admissions'))
const PublicNews         = lazy(() => import('@/pages/public/News'))
const PublicGallery      = lazy(() => import('@/pages/public/Gallery'))
const PublicContact      = lazy(() => import('@/pages/public/Contact'))

const LoginPage          = lazy(() => import('@/pages/auth'))
const RegisterPage       = lazy(() => import('@/pages/auth/Register'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPassword'))

const DashboardPage      = lazy(() => import('@/pages/dashboard'))
const StudentsPage       = lazy(() => import('@/pages/students'))
const TeachersPage       = lazy(() => import('@/pages/teachers'))
const ClassesPage        = lazy(() => import('@/pages/classes'))
const AttendancePage     = lazy(() => import('@/pages/attendance'))
const ExamsPage          = lazy(() => import('@/pages/exams'))
const FinancePage        = lazy(() => import('@/pages/finance'))
const SchedulePage       = lazy(() => import('@/pages/schedule'))
const ReportsPage        = lazy(() => import('@/pages/reports'))
const SettingsPage       = lazy(() => import('@/pages/settings'))
const AdmissionsPage     = lazy(() => import('@/pages/admissions'))
const CommunicationPage  = lazy(() => import('@/pages/communication'))
const CmsPage            = lazy(() => import('@/pages/cms'))
const GalleryPage        = lazy(() => import('@/pages/gallery'))
const PromotionPage      = lazy(() => import('@/pages/promotion'))
const AiReceptionistPage = lazy(() => import('@/pages/ai-receptionist'))
const ResultsPage        = lazy(() => import('@/pages/results'))
const HomeworkPage       = lazy(() => import('@/pages/homework'))
const LibraryPage        = lazy(() => import('@/pages/library'))
const TransportPage      = lazy(() => import('@/pages/transport'))
const InventoryPage      = lazy(() => import('@/pages/inventory'))
const PayrollPage        = lazy(() => import('@/pages/payroll'))
const EventsPage         = lazy(() => import('@/pages/events'))
const NotificationsPage  = lazy(() => import('@/pages/notifications'))
const ParentPortalPage   = lazy(() => import('@/pages/parent-portal'))
const StudentPortalPage  = lazy(() => import('@/pages/student-portal'))
const AuditLogsPage      = lazy(() => import('@/pages/audit-logs'))
const ProfilePage        = lazy(() => import('@/pages/profile'))
const FeesPage           = lazy(() => import('@/pages/fees'))
const BulkImportPage     = lazy(() => import('@/pages/bulk-import'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-secondary-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      <p className="text-sm text-secondary-500">Loading…</p>
    </div>
  </div>
)

/** Validates the stored token by calling /auth/me. Redirects to /login if invalid. */
function RealtimeWrapper({ children }: { children: React.ReactNode }) {
  useRealtime(true)
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'fail'>('checking')
  const [role, setRole] = useState<string | undefined>(undefined)
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setStatus('fail'); return }

    authApi.me()
      .then((user) => {
        setRole((user as { role?: string })?.role)
        localStorage.setItem('user', JSON.stringify(user))
        setStatus('ok')
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setStatus('fail')
      })
  }, [])

  if (status === 'checking') return <PageLoader />
  if (status === 'fail') return <Navigate to="/login" replace />

  // Parents/students can only reach their own portal + shared pages (profile, dashboard summary).
  if (isPathBlockedForRole(location.pathname, role)) {
    return <Navigate to={getHomeRouteForRole(role)} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <HelmetProvider>
      <AmbientBackground />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public site */}
                  <Route path="/" element={<PublicLayout />}>
                    <Route index element={<PublicHome />} />
                    <Route path="about" element={<PublicAbout />} />
                    <Route path="admissions" element={<PublicAdmissions />} />
                    <Route path="news" element={<PublicNews />} />
                    <Route path="gallery" element={<PublicGallery />} />
                    <Route path="contact" element={<PublicContact />} />
                  </Route>

                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected admin app */}
                  <Route path="/app" element={<ProtectedRoute><RealtimeWrapper><AdminLayout /></RealtimeWrapper></ProtectedRoute>}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard"      element={<DashboardPage />} />
                    <Route path="students"       element={<StudentsPage />} />
                    <Route path="teachers"       element={<TeachersPage />} />
                    <Route path="classes"        element={<ClassesPage />} />
                    <Route path="attendance"     element={<AttendancePage />} />
                    <Route path="exams"          element={<ExamsPage />} />
                    <Route path="finance"        element={<FinancePage />} />
                    <Route path="schedule"       element={<SchedulePage />} />
                    <Route path="reports"        element={<ReportsPage />} />
                    <Route path="settings"       element={<SettingsPage />} />
                    <Route path="admissions"     element={<AdmissionsPage />} />
                    <Route path="communication"  element={<CommunicationPage />} />
                    <Route path="cms"            element={<CmsPage />} />
                    <Route path="gallery"        element={<GalleryPage />} />
                    <Route path="promotion"      element={<PromotionPage />} />
                    <Route path="ai-receptionist" element={<AiReceptionistPage />} />
                    <Route path="results"        element={<ResultsPage />} />
                    <Route path="homework"       element={<HomeworkPage />} />
                    <Route path="library"        element={<LibraryPage />} />
                    <Route path="transport"      element={<TransportPage />} />
                    <Route path="inventory"      element={<InventoryPage />} />
                    <Route path="payroll"        element={<PayrollPage />} />
                    <Route path="events"         element={<EventsPage />} />
                    <Route path="notifications"  element={<NotificationsPage />} />
                    <Route path="parent-portal"  element={<ParentPortalPage />} />
                    <Route path="student-portal" element={<StudentPortalPage />} />
                    <Route path="audit-logs"     element={<AuditLogsPage />} />
                    <Route path="profile"         element={<ProfilePage />} />
                    <Route path="fees"            element={<FeesPage />} />
                    <Route path="bulk-import"     element={<BulkImportPage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}
