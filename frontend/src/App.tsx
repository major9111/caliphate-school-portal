/**
 * FUGUSAU Portal — Root App (all admin routes wired)
 */
import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/contexts/ThemeContext'

// Login is the near-universal first screen, so it stays a normal (eager) import.
import LoginPage            from '@/pages/LoginPage'
import PortalLayout         from '@/pages/PortalLayout'

// Everything else loads on demand — this is what turns the single ~2.2MB
// bundle into many small per-route chunks, so a student visiting only
// Dashboard + Results doesn't pay for Admin/Library/Security code too.
const DashboardPage         = lazy(() => import('@/pages/DashboardPage'))
const CoursesPage           = lazy(() => import('@/pages/CoursesPage'))
const ExamsPage             = lazy(() => import('@/pages/ExamsPage'))
const ResultsPage           = lazy(() => import('@/pages/ResultsPage'))
const FeesPage               = lazy(() => import('@/pages/FeesPage'))
const LibraryPage           = lazy(() => import('@/pages/LibraryPage'))
const ChatPage               = lazy(() => import('@/pages/ChatPage'))
const CredentialsPage       = lazy(() => import('@/pages/CredentialsPage'))
const ReportsPage           = lazy(() => import('@/pages/ReportsPage'))
const NotificationsPage     = lazy(() => import('@/pages/NotificationsPage'))
const ProfilePage           = lazy(() => import('@/pages/ProfilePage'))
const HostelPage             = lazy(() => import('@/pages/HostelPage'))
const FormsPage               = lazy(() => import('@/pages/FormsPage'))
const AdmissionPage         = lazy(() => import('@/pages/AdmissionPage'))

// Admin pages
const AdminStudentsPage     = lazy(() => import('@/pages/admin/AdminStudentsPage'))
const AdminStaffPage        = lazy(() => import('@/pages/admin/AdminStaffPage'))
const AdminDepartmentsPage  = lazy(() => import('@/pages/admin/AdminDepartmentsPage'))
const AdminCoursesPage      = lazy(() => import('@/pages/admin/AdminCoursesPage'))
const AdminExamsPage        = lazy(() => import('@/pages/admin/AdminExamsPage'))
const AdminResultsPage      = lazy(() => import('@/pages/admin/AdminResultsPage'))
const AdminFeesPage         = lazy(() => import('@/pages/admin/AdminFeesPage'))
const AdminAdmissionsPage   = lazy(() => import('@/pages/admin/AdminAdmissionsPage'))
const AdminHostelPage       = lazy(() => import('@/pages/admin/AdminHostelPage'))
const BookImportPage        = lazy(() => import('@/pages/admin/BookImportPage'))
const AdminLibraryPage      = lazy(() => import('@/pages/admin/AdminLibraryPage'))
const SecurityDashboardPage = lazy(() => import('@/pages/admin/SecurityDashboardPage'))

// New pages
const TimetablePage         = lazy(() => import('@/pages/TimetablePage'))
const AttendancePage        = lazy(() => import('@/pages/AttendancePage'))
const ParentPage             = lazy(() => import('@/pages/ParentPage'))
const NotFoundPage           = lazy(() => import('@/pages/NotFoundPage'))
const ForgotPasswordPage    = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage     = lazy(() => import('@/pages/ResetPasswordPage'))
const VerifyEmailPage       = lazy(() => import('@/pages/VerifyEmailPage'))

import ProtectedRoute       from '@/components/common/ProtectedRoute'

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

function AuthExpiredHandler() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  useEffect(() => {
    const handler = async () => { await logout(); navigate('/login', { replace: true }) }
    window.addEventListener('fugusau:auth-expired', handler)
    return () => window.removeEventListener('fugusau:auth-expired', handler)
  }, [navigate, logout])
  return null
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()
  const { theme } = useTheme()
  useEffect(() => { if (isAuthenticated) fetchMe() }, [isAuthenticated]) // eslint-disable-line
  const isLight = theme === 'light'

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthExpiredHandler />
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/admission" element={<AdmissionPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

          <Route path="/" element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* ── Shared routes ── */}
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="courses"       element={<CoursesPage />} />
            <Route path="exams"         element={<ExamsPage />} />
            <Route path="results"       element={<ResultsPage />} />
            <Route path="fees"          element={<FeesPage />} />
            <Route path="library"       element={<LibraryPage />} />
            <Route path="chat"          element={<ChatPage />} />
            <Route path="chat/:roomName" element={<ChatPage />} />
            <Route path="hostel"        element={<HostelPage />} />
            <Route path="forms"         element={<FormsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile"       element={<ProfilePage />} />
            <Route path="timetable"     element={<TimetablePage />} />
            <Route path="attendance"    element={<AttendancePage />} />
            <Route path="ward"          element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentPage />
              </ProtectedRoute>
            } />
            <Route path="credentials"   element={
              <ProtectedRoute allowedRoles={['student','admin','lecturer']}>
                <CredentialsPage />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['admin','lecturer']}>
                <ReportsPage />
              </ProtectedRoute>
            } />

            {/* ── Admin routes ── */}
            <Route path="admin/students"    element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentsPage /></ProtectedRoute>} />
            <Route path="admin/staff"       element={<ProtectedRoute allowedRoles={['admin']}><AdminStaffPage /></ProtectedRoute>} />
            <Route path="admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><AdminDepartmentsPage /></ProtectedRoute>} />
            <Route path="admin/courses"     element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminCoursesPage /></ProtectedRoute>} />
            <Route path="admin/exams"       element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminExamsPage /></ProtectedRoute>} />
            <Route path="admin/results"     element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminResultsPage /></ProtectedRoute>} />
            <Route path="admin/fees"        element={<ProtectedRoute allowedRoles={['admin']}><AdminFeesPage /></ProtectedRoute>} />
            <Route path="admin/admissions"  element={<ProtectedRoute allowedRoles={['admin']}><AdminAdmissionsPage /></ProtectedRoute>} />
            <Route path="admin/hostel"      element={<ProtectedRoute allowedRoles={['admin']}><AdminHostelPage /></ProtectedRoute>} />
            <Route path="admin/library"          element={<ProtectedRoute allowedRoles={['admin']}><AdminLibraryPage /></ProtectedRoute>} />
            <Route path="admin/library/import"    element={<ProtectedRoute allowedRoles={['admin']}><BookImportPage /></ProtectedRoute>} />
            <Route path="admin/security"    element={<ProtectedRoute allowedRoles={['admin']}><SecurityDashboardPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(13,26,18,0.95)',
            color: isLight ? '#0D1610' : '#E8F5ED',
            border: isLight ? '1px solid rgba(0,107,63,0.2)' : '1px solid rgba(0,168,90,0.25)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)', fontSize: '13px', fontFamily: 'Sora, sans-serif',
          },
          success: { iconTheme: { primary: '#00A85A', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
