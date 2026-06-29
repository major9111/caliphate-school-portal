import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Layout as AdminLayout } from '@/components/layout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ToastContainer } from '@/components/ui/toast'
import { Loader2 } from 'lucide-react'
import { lazy } from 'react'

// Lazy load components for better performance
const PublicHome = lazy(() => import('@/pages/public/Home'))
const PublicAbout = lazy(() => import('@/pages/public/About'))
const PublicAdmissions = lazy(() => import('@/pages/public/Admissions'))
const PublicNews = lazy(() => import('@/pages/public/News'))
const PublicContact = lazy(() => import('@/pages/public/Contact'))

const LoginPage = lazy(() => import('@/pages/auth'))
const RegisterPage = lazy(() => import('@/pages/auth/Register'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'))

const DashboardPage = lazy(() => import('@/pages/dashboard'))
const StudentsPage = lazy(() => import('@/pages/students'))
const TeachersPage = lazy(() => import('@/pages/teachers'))
const ClassesPage = lazy(() => import('@/pages/classes'))
const AttendancePage = lazy(() => import('@/pages/attendance'))
const ExamsPage = lazy(() => import('@/pages/exams'))
const FinancePage = lazy(() => import('@/pages/finance'))
const SchedulePage = lazy(() => import('@/pages/schedule'))
const ReportsPage = lazy(() => import('@/pages/reports'))
const SettingsPage = lazy(() => import('@/pages/settings'))
const AdmissionsPage = lazy(() => import('@/pages/admissions'))
const CommunicationPage = lazy(() => import('@/pages/communication'))
const CmsPage = lazy(() => import('@/pages/cms'))
const AiReceptionistPage = lazy(() => import('@/pages/ai-receptionist'))

const ResultsPage = lazy(() => import('@/pages/results'))
const HomeworkPage = lazy(() => import('@/pages/homework'))
const LibraryPage = lazy(() => import('@/pages/library'))
const TransportPage = lazy(() => import('@/pages/transport'))
const InventoryPage = lazy(() => import('@/pages/inventory'))
const PayrollPage = lazy(() => import('@/pages/payroll'))
const EventsPage = lazy(() => import('@/pages/events'))
const NotificationsPage = lazy(() => import('@/pages/notifications'))
const ParentPortalPage = lazy(() => import('@/pages/parent-portal'))
const StudentPortalPage = lazy(() => import('@/pages/student-portal'))
const AuditLogsPage = lazy(() => import('@/pages/audit-logs'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" />
}

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
  </div>
)

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<PublicHome />} />
                <Route path="about" element={<PublicAbout />} />
                <Route path="admissions" element={<PublicAdmissions />} />
                <Route path="news" element={<PublicNews />} />
                <Route path="contact" element={<PublicContact />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              <Route path="/app" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/app/dashboard" />} />
                
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="teachers" element={<TeachersPage />} />
                <Route path="classes" element={<ClassesPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="exams" element={<ExamsPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                
                <Route path="admissions" element={<AdmissionsPage />} />
                <Route path="communication" element={<CommunicationPage />} />
                <Route path="cms" element={<CmsPage />} />
                <Route path="ai-receptionist" element={<AiReceptionistPage />} />
                
                <Route path="results" element={<ResultsPage />} />
                <Route path="homework" element={<HomeworkPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="transport" element={<TransportPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="parent-portal" element={<ParentPortalPage />} />
                <Route path="student-portal" element={<StudentPortalPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Routes>
          </Suspense>
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
