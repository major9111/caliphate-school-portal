/**
 * FUGUSAU Portal — Root App (Complete)
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

// Public
import LoginPage            from '@/pages/LoginPage'
import AdmissionPage        from '@/pages/AdmissionPage'

// Portal layout
import PortalLayout         from '@/pages/PortalLayout'

// Shared pages
import DashboardPage        from '@/pages/DashboardPage'
import CoursesPage          from '@/pages/CoursesPage'
import ExamsPage            from '@/pages/ExamsPage'
import ResultsPage          from '@/pages/ResultsPage'
import FeesPage             from '@/pages/FeesPage'
import LibraryPage          from '@/pages/LibraryPage'
import ChatPage             from '@/pages/ChatPage'
import CredentialsPage      from '@/pages/CredentialsPage'
import ReportsPage          from '@/pages/ReportsPage'
import NotificationsPage    from '@/pages/NotificationsPage'
import ProfilePage          from '@/pages/ProfilePage'
import HostelPage           from '@/pages/HostelPage'
import FormsPage            from '@/pages/FormsPage'
import ParentDashboardPage  from '@/pages/ParentDashboardPage'

// Admin pages
import AdminStudentsPage      from '@/pages/admin/AdminStudentsPage'
import AdminStaffPage         from '@/pages/admin/AdminStaffPage'
import AdminDepartmentsPage   from '@/pages/admin/AdminDepartmentsPage'
import AdminCoursesPage       from '@/pages/admin/AdminCoursesPage'
import AdminExamsPage         from '@/pages/admin/AdminExamsPage'
import AdminResultsPage       from '@/pages/admin/AdminResultsPage'
import AdminFeesPage          from '@/pages/admin/AdminFeesPage'
import AdminAdmissionsPage    from '@/pages/admin/AdminAdmissionsPage'
import AdminHostelPage        from '@/pages/admin/AdminHostelPage'
import AdminNotificationsPage from '@/pages/admin/AdminNotificationsPage'
import SecurityDashboardPage  from '@/pages/admin/SecurityDashboardPage'

import ProtectedRoute         from '@/components/common/ProtectedRoute'

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
  useEffect(() => { if (isAuthenticated) fetchMe() }, [isAuthenticated]) // eslint-disable-line

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthExpiredHandler />
        <Routes>
          {/* Public */}
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/admission" element={<AdmissionPage />} />

          {/* Portal (authenticated) */}
          <Route path="/" element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Shared */}
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

            {/* Credentials — student + admin */}
            <Route path="credentials" element={
              <ProtectedRoute allowedRoles={['student','admin','lecturer']}>
                <CredentialsPage />
              </ProtectedRoute>
            }/>

            {/* Reports — admin + lecturer */}
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['admin','lecturer']}>
                <ReportsPage />
              </ProtectedRoute>
            }/>

            {/* Parent ward view */}
            <Route path="parent/dashboard" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboardPage />
              </ProtectedRoute>
            }/>

            {/* Admin management */}
            <Route path="admin/students"      element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentsPage /></ProtectedRoute>} />
            <Route path="admin/staff"         element={<ProtectedRoute allowedRoles={['admin']}><AdminStaffPage /></ProtectedRoute>} />
            <Route path="admin/departments"   element={<ProtectedRoute allowedRoles={['admin']}><AdminDepartmentsPage /></ProtectedRoute>} />
            <Route path="admin/courses"       element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminCoursesPage /></ProtectedRoute>} />
            <Route path="admin/exams"         element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminExamsPage /></ProtectedRoute>} />
            <Route path="admin/results"       element={<ProtectedRoute allowedRoles={['admin','lecturer']}><AdminResultsPage /></ProtectedRoute>} />
            <Route path="admin/fees"          element={<ProtectedRoute allowedRoles={['admin']}><AdminFeesPage /></ProtectedRoute>} />
            <Route path="admin/admissions"    element={<ProtectedRoute allowedRoles={['admin']}><AdminAdmissionsPage /></ProtectedRoute>} />
            <Route path="admin/hostel"        element={<ProtectedRoute allowedRoles={['admin']}><AdminHostelPage /></ProtectedRoute>} />
            <Route path="admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotificationsPage /></ProtectedRoute>} />
            <Route path="admin/security"      element={<ProtectedRoute allowedRoles={['admin']}><SecurityDashboardPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(13,26,18,0.95)',
            color: '#E8F5ED',
            border: '1px solid rgba(0,168,90,0.25)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            fontSize: '13px',
            fontFamily: 'Sora, sans-serif',
          },
          success: { iconTheme: { primary:'#00A85A', secondary:'#fff' } },
          error:   { iconTheme: { primary:'#EF4444', secondary:'#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
