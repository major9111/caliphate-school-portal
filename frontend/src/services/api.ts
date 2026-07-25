/**
 * FUGUSAU Portal — Unified API Client
 *
 * Merges api.ts + apiExtensions.ts into one file.
 * All pages should import from '@/services/api' only.
 * Fixes: correct endpoint paths matching the Django backend URLs.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getRefreshToken, patchPersistedAccessToken } from '@/utils'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Auth-expired helper ──────────────────────────────────────
const signalAuthExpired = () =>
  window.dispatchEvent(new CustomEvent('fugusau:auth-expired'))

// ─── Response Interceptor — Token Refresh ────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (error: AxiosError | null) => void }> = []

const processQueue = (error: AxiosError | null, token: string | null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const req = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !req._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => { req.headers.Authorization = `Bearer ${token}`; return api(req) })
      }
      req._retry = true
      isRefreshing = true
      const refresh = getRefreshToken()
      if (!refresh) { isRefreshing = false; signalAuthExpired(); return Promise.reject(error) }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh })
        patchPersistedAccessToken(data.access)
        processQueue(null, data.access)
        req.headers.Authorization = `Bearer ${data.access}`
        return api(req)
      } catch (e) {
        processQueue(e as AxiosError, null)
        signalAuthExpired()
        return Promise.reject(e)
      } finally { isRefreshing = false }
    }
    return Promise.reject(error)
  }
)

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
export const authAPI = {
  login:          (email: string, password: string) => api.post('/auth/login/', { email, password }),
  logout:         (refresh: string) => api.post('/auth/logout/', { refresh }),
  register:       (data: object) => api.post('/auth/register/', data),
  me:             () => api.get('/auth/me/'),
  updateProfile:  (data: object) => api.patch('/auth/me/', data),
  changePassword: (data: object) => api.post('/auth/change-password/', data),
  passwordResetRequest: (email: string) => api.post('/auth/password-reset/', { email }),
  passwordResetConfirm: (token: string, password: string) => api.post('/auth/password-reset/confirm/', { token, password }),
  verifyEmail:    (token: string) => api.get(`/auth/verify-email/${token}/`),
}

// ═══════════════════════════════════════════════════════════════
// STUDENTS  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const studentsAPI = {
  getProfile:          () => api.get('/students/profile/'),
  updateProfile:       (data: object) => api.patch('/students/profile/', data),
  getStudent:          (matric: string) => api.get(`/students/${matric}/`),
  getAll:              (params?: object) => api.get('/students/', { params }),
  getStats:            () => api.get('/students/admin/stats/'),        // AdminStatsView
  getFaculties:        () => api.get('/students/faculties/'),
  createFaculty:       (data: object) => api.post('/students/faculties/', data),
  updateFaculty:       (id: string, data: object) => api.patch(`/students/faculties/${id}/`, data),
  deleteFaculty:       (id: string) => api.delete(`/students/faculties/${id}/`),
  getDepartments:      (facultyId?: string) =>
    api.get('/students/departments/', { params: facultyId ? { faculty: facultyId } : {} }),
  createDepartment:    (data: object) => api.post('/students/departments/', data),
  updateDepartment:    (id: string, data: object) => api.patch(`/students/departments/${id}/`, data),
  deleteDepartment:    (id: string) => api.delete(`/students/departments/${id}/`),
  getSpecializations:  (deptId?: string) =>
    api.get('/students/specializations/', { params: deptId ? { department: deptId } : {} }),
  getLecturers:        () => api.get('/students/lecturers/'),
  getLecturerProfile:  () => api.get('/students/lecturer-profile/'),
  createStaff:         (data: object) => api.post('/students/admin/create-staff/', data),
  updateStaff:         (id: string, data: object) => api.patch(`/students/lecturers/${id}/`, data),
  create:              (data: object) => api.post('/students/', data),
  update:              (id: string, data: object) => api.patch(`/students/${id}/`, data),
  delete:              (id: string) => api.delete(`/students/${id}/`),
}

// ═══════════════════════════════════════════════════════════════
// COURSES  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const coursesAPI = {
  list:            (params?: object) => api.get('/courses/', { params }),
  getAll:          (params?: object) => api.get('/courses/', { params }),
  create:          (data: object)    => api.post('/courses/', data),
  update:          (id: string, data: object) => api.patch(`/courses/${id}/`, data),
  delete:          (id: string)      => api.delete(`/courses/${id}/`),
  getCurrent:      () => api.get('/courses/sessions/current/'),
  getEnrollments:  () => api.get('/courses/my-enrollments/'),
  enroll:          (course_id: string, semester?: string) =>
    api.post('/courses/enroll/', { course_id, semester }),
  drop:            (enrollmentId: string) => api.post(`/courses/drop/${enrollmentId}/`),
  getTimetable:    () => api.get('/courses/timetable/'),
  markAttendance:  (data: object) => api.post('/courses/attendance/', data),
  getAttendance:   (enrollmentId: string) => api.get(`/courses/attendance/${enrollmentId}/`),
}

// ═══════════════════════════════════════════════════════════════
// EXAMS  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const examsAPI = {
  getSchedule:    (params?: object) => api.get('/exams/schedule/', { params }),
  createSchedule: (data: object) => api.post('/exams/schedule/', data),
  getResults:     (params?: object) => api.get('/exams/results/', { params }),
  getExamCard:    () => api.get('/exams/exam-card/'),
  getClearance:   () => api.get('/exams/clearance/'),
  getClearances:  () => api.get('/exams/clearances/'),              // admin: all clearances
  grantClearance: (id: string) => api.post(`/exams/clearances/${id}/grant/`),
  uploadResult:   (data: FormData) => api.post('/exams/results/upload/', data, { headers: { 'Content-Type': undefined } }),
  approveResult:  (id: string) => api.post(`/exams/results/${id}/approve/`),
  downloadTranscript: () => api.get('/reports/transcript/', { responseType: 'blob' }),
}

// ═══════════════════════════════════════════════════════════════
// FEES  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const feesAPI = {
  getTypes:        () => api.get('/fees/types/'),
  getFeeTypes:     () => api.get('/fees/types/'),
  getInvoices:     () => api.get('/fees/invoices/'),
  generateInvoice: (semester: string) => api.post('/fees/generate-invoice/', { semester }),
  initiatePayment: (invoice_id: string) => api.post('/fees/pay/', { invoice_id }),
  verifyPayment:   (reference: string) => api.post('/fees/verify-payment/', { reference }),
  getHistory:      () => api.get('/fees/payment-history/'),
  getPaymentHistory: () => api.get('/fees/payment-history/'),
}

// ═══════════════════════════════════════════════════════════════
// LIBRARY  (canonical: apiExtensions paths — base is /library/)
// ═══════════════════════════════════════════════════════════════
export const libraryAPI = {
  getBooks:      (params?: object) => api.get('/library/', { params }),   // /library/ root list
  getBook:       (id: string) => api.get(`/library/${id}/`),
  createBook:    (data: any) => api.post('/library/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBook:    (id: string, data: any) => api.patch(`/library/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteBook:    (id: string) => api.delete(`/library/${id}/`),
  getCategories: () => api.get('/library/categories/'),
  createCategory:(data: object) => api.post('/library/categories/', data),
  deleteCategory:(id: string) => api.delete(`/library/categories/${id}/`),
  getMyBorrows:  () => api.get('/library/my-borrows/'),
  getAllBorrows:  () => api.get('/library/borrows/'),
  borrowBook:    (data: object) => api.post('/library/borrow/', data),
  returnBook:    (id: string) => api.post(`/library/return/${id}/`),
  // AI recommend — only call if backend has /library/ai-recommend/ — guarded in UI
  aiRecommend:   (query: string) => api.post('/library/ai-recommend/', { query }),
}

// ═══════════════════════════════════════════════════════════════
// CHAT  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const chatAPI = {
  getRooms:    () => api.get('/chat/rooms/'),
  createRoom:  (data: object) => api.post('/chat/rooms/create/', data),
  getMessages: (roomId: string) => api.get(`/chat/rooms/${roomId}/messages/`),
  getPinned:   (roomId: string) => api.get(`/chat/rooms/${roomId}/pinned/`),
  searchMessages: (roomId: string, q: string) => api.get(`/chat/rooms/${roomId}/search/`, { params: { q } }),
  sendMessage: (roomId: string, content: string) =>
    api.post(`/chat/rooms/${roomId}/messages/`, { content }),
  // AI advisor — guarded in UI (may not exist on backend)
  aiAdvisor:   (message: string) => api.post('/chat/ai-advisor/', { message }),
}

// ═══════════════════════════════════════════════════════════════
// CREDENTIALS  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const credentialsAPI = {
  getAll:    () => api.get('/credentials/'),
  // FIX: must delete Content-Type so axios sets multipart/form-data boundary automatically
  request:   (data: FormData) => api.post('/credentials/', data, {
    headers: { 'Content-Type': undefined },
  }),
  download:  (id: string) => api.get(`/credentials/${id}/`, { responseType: 'blob' }),
  // Backend: /credentials/<pk>/review/ — admin reviews/approves
  approve:   (id: string, data?: object) => api.post(`/credentials/${id}/review/`, data),
  upload:    (data: FormData) => api.post('/credentials/', data, { headers: { 'Content-Type': undefined } }),
  // Backend: /credentials/<pk>/verify/ — external verification
  externalVerify: (id: string, data: object) =>
    api.post(`/credentials/${id}/verify/`, data),
  analyze:   (id: string) => api.post(`/credentials/${id}/analyze/`),
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const notificationsAPI = {
  list:          () => api.get('/notifications/'),
  getAll:        () => api.get('/notifications/'),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  markRead:      (id: string) => api.post(`/notifications/${id}/read/`),
  markAllRead:   () => api.post('/notifications/mark-all-read/'),
  broadcast:     (data: object) => api.post('/notifications/broadcast/', data),
}

// ═══════════════════════════════════════════════════════════════
// REPORTS  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const reportsAPI = {
  getMyTranscript:     () => api.get('/reports/transcript/'),
  getTranscript:       (matric: string) => api.get(`/reports/transcript/${matric}/`),
  getDeptReport:       (deptId: string) => api.get(`/reports/department/${deptId}/`),
  getFeeReport:        (params?: object) => api.get('/reports/fees/', { params }),
  getEnrollmentReport: (params?: object) => api.get('/reports/enrollments/', { params }),
  // Blob downloads
  downloadTranscript:      () => api.get('/reports/transcript/', { responseType: 'blob' }),
  downloadFinancialStatement: () => api.get('/reports/financial/', { responseType: 'blob' }),
  downloadEnrollmentReport:   () => api.get('/reports/enrollment/', { responseType: 'blob' }),
  downloadResultsExcel:    (params?: object) =>
    api.get('/reports/results-excel/', { params, responseType: 'blob' }),
}

// ═══════════════════════════════════════════════════════════════
// HOSTEL  (canonical: apiExtensions paths)
// ═══════════════════════════════════════════════════════════════
export const hostelAPI = {
  getHostels:        (params?: object)             => api.get('/hostel/', { params }),
  getRooms:          (params?: object)             => api.get('/hostel/rooms/', { params }),
  apply:             (room_id: string)             => api.post('/hostel/apply/', { room_id }),
  getMyAllocation:   ()                            => api.get('/hostel/my-allocation/'),
  getAllAllocations:  ()                            => api.get('/hostel/allocations/'),
  approveAllocation: (id: string)                  => api.post(`/hostel/allocations/${id}/approve/`),
  rejectAllocation:  (id: string)                  => api.post(`/hostel/allocations/${id}/reject/`),
  vacateRoom:        (id: string)                  => api.post(`/hostel/allocations/${id}/vacate/`),
  // CRUD
  createHostel:      (data: object)                => api.post('/hostel/', data),
  updateHostel:      (id: string, data: object)    => api.patch(`/hostel/${id}/`, data),
  deleteHostel:      (id: string)                  => api.delete(`/hostel/${id}/delete/`),
  createRoom:        (data: object)                => api.post('/hostel/rooms/', data),
  deleteRoom:        (id: string)                  => api.delete(`/hostel/rooms/${id}/`),
}

// ═══════════════════════════════════════════════════════════════
// ADMISSIONS  (canonical from apiExtensions + backend URLs)
// ═══════════════════════════════════════════════════════════════
export const admissionAPI = {
  apply:           (data: object)   => api.post('/admissions/', data),
  checkStatus:     (app_no: string, email: string) =>
    api.get('/admissions/check/', { params: { app_no, email } }),
  getStatus:       (params?: object) => api.get('/admissions/', { params }),
  getList:         (params?: object) => api.get('/admissions/', { params }),
  getSessions:     () => api.get('/admissions/sessions/'),
  getStats:        () => api.get('/admissions/stats/'),
  getDetail:       (id: string) => api.get(`/admissions/${id}/`),
  offerAdmission:  (id: string, data?: object) => api.post(`/admissions/${id}/offer/`, data || {}),
  rejectAdmission: (id: string, data?: object) => api.post(`/admissions/${id}/reject/`, data || {}),
  updateStatus:    (id: string, data: object)  => api.post(`/admissions/${id}/status/`, data),
  respondToOffer:  (id: string, data: { action: 'accept' | 'decline' }) =>
    api.post(`/admissions/${id}/status/`, data),
}

// ═══════════════════════════════════════════════════════════════
// SECURITY  (admin/analyst only)
// ═══════════════════════════════════════════════════════════════
export const securityAPI = {
  getDashboard:     () => api.get('/security/dashboard/'),
  getStats:         () => api.get('/security/stats/'),
  getHealth:        () => api.get('/security/health/'),
  getEvents:        (params?: object) => api.get('/security/events/', { params }),
  getEvent:         (id: string) => api.get(`/security/events/${id}/`),
  getBlockedIPs:    (params?: object) => api.get('/security/blocked-ips/', { params }),
  blockIP:          (data: object) => api.post('/security/blocked-ips/', data),
  unblockIP:        (id: string) => api.post(`/security/blocked-ips/${id}/unblock/`),
  getSessions:      () => api.get('/security/sessions/'),
  terminateSession: (id: string) => api.post(`/security/sessions/${id}/terminate/`),
  getLoginAttempts: (params?: object) => api.get('/security/login-attempts/', { params }),
  getPolicy:        () => api.get('/security/policy/'),
  updatePolicy:     (data: object) => api.patch('/security/policy/', data),
  getCIDRBlocks:    () => api.get('/security/cidr/'),
  getAppeals:       () => api.get('/security/appeals/'),
  reviewAppeal:     (id: string, data: object) => api.post(`/security/appeals/${id}/review/`, data),
  // Firewall Rules
  getFirewallRules:    ()                         => api.get('/security/firewall/'),
  createFirewallRule:  (data: object)             => api.post('/security/firewall/', data),
  updateFirewallRule:  (id: string, data: object) => api.patch(`/security/firewall/${id}/`, data),
  deleteFirewallRule:  (id: string)               => api.delete(`/security/firewall/${id}/`),
  toggleFirewallRule:  (id: string)               => api.post(`/security/firewall/${id}/toggle/`),
  importFirewallRules: (rules: any[])             => api.post('/security/firewall/import/', { rules }),
  // Live Scan
  getLiveScan:         ()                         => api.get('/security/live-scan/'),
}

// ═══════════════════════════════════════════════════════════════
// PARENT  (parent role only)
// ═══════════════════════════════════════════════════════════════
export const parentAPI = {
  getWards:       () => api.get('/auth/parent/students/'),
  getWardResults: (studentId: string) => api.get(`/auth/parent/students/${studentId}/results/`),
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS  (admin only)
// ═══════════════════════════════════════════════════════════════
export const auditAPI = {
  getLogs: (params?: object) => api.get('/auth/audit-logs/', { params }),
}

export default api
