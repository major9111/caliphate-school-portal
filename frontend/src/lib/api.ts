import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let _isRefreshing = false
let _failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function _processQueue(error: unknown, token: string | null = null) {
  _failedQueue.forEach((p) => { error ? p.reject(error) : p.resolve(token!) })
  _failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
        return Promise.reject(error)
      }
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest?.headers) originalRequest.headers.Authorization = 'Bearer ' + token
          return api(originalRequest!)
        })
      }
      originalRequest!._retry = true
      _isRefreshing = true
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
        const { access_token, refresh_token: new_refresh } = res.data
        localStorage.setItem('token', access_token)
        localStorage.setItem('refresh_token', new_refresh)
        if (localStorage.getItem('user')) {
          localStorage.setItem('user', JSON.stringify(res.data.user))
        }
        api.defaults.headers.common.Authorization = 'Bearer ' + access_token
        if (originalRequest?.headers) originalRequest.headers.Authorization = 'Bearer ' + access_token
        _processQueue(null, access_token)
        return api(originalRequest!)
      } catch (refreshError) {
        _processQueue(refreshError, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        _isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  username?: string
  phone?: string
  avatar_url?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Student {
  id: string
  admission_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  class_name: string
  enrollment_status: string
  gender?: string
  date_of_birth?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
}

export interface Teacher {
  id: string
  full_name: string
  email: string
  phone: string
  subjects: string[]
  qualification: string
  role: string
  is_active: boolean
}

export interface Payment {
  id: string
  student_name: string
  amount: number
  type: string
  method: string
  status: string
  receipt_number: string
  created_at: string
  payment_date: string
  student_id?: string
}

export interface FinanceStats {
  total_revenue: number
  collected: number
  outstanding: number
  expenses: number
  net_income: number
  total_transactions: number
  monthly_breakdown: Array<{ month: string; amount: number }>
}

export interface Exam {
  id: string
  name: string
  class_name: string
  start_date: string
  end_date: string
  status: string
  created_at: string
}

export interface Result {
  id: string
  student_name: string
  student_id: string
  class_name: string
  subject: string
  ca_score: number
  exam_score: number
  total: number
  grade: string
  remark: string
  term: string
  session: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  audience: string
  priority?: string
  created_at: string
}

export interface Event {
  id: string
  title: string
  description: string
  event_date: string
  event_time?: string
  type: string
  location?: string
  audience: string
  created_at: string
}

export interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  category: string
  total_copies: number
  available_copies: number
  added_at: string
}

export interface LibraryTransaction {
  id: string
  book_id: string
  book_title: string
  student_id: string
  student_name: string
  issued_at: string
  due_date: string
  returned_at?: string
  status: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  min_quantity: number
  location?: string
  added_at: string
}

export interface PayrollEntry {
  id: string
  employee_id: string
  employee_name: string
  role: string
  basic_salary: number
  allowances: number
  deductions: number
  net_salary: number
  month: string
  year: string
  status: string
  created_at: string
}

export interface TransportRoute {
  id: string
  route_name: string
  bus_number: string
  driver_name: string
  driver_phone: string
  conductor_name?: string
  fee: number
  created_at: string
}

export interface TransportStudent {
  id: string
  student_id: string
  student_name: string
  route_id: string
  pickup_stop: string
  dropoff_stop: string
  monthly_fee: number
  status: string
  assigned_at: string
}

export interface KnowledgeItem {
  id: string
  question: string
  answer: string
  category: string
  created_at: string
}

export interface CmsPage {
  id: string
  title: string
  slug: string
  content: string
  status: string
  created_at: string
  updated_at: string
}

export interface Admission {
  id: string
  applicant_name: string
  email: string
  phone: string
  class_applying: string
  parent_name?: string
  status: string
  application_number: string
  created_at: string
}

export interface DashboardStats {
  total_students: number
  total_teachers: number
  total_classes: number
  total_revenue: number
  present_today: number
  total_today: number
  attendance_rate: number
  recent_admissions: Admission[]
  upcoming_exams: Exam[]
  recent_announcements: Announcement[]
  outstanding_fees_count: number
  outstanding_fees_total: number
  overdue_books_count: number
  low_stock_count: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface HomeworkItem {
  id: string
  title: string
  subject: string
  class_name: string
  description: string
  due_date: string
  assigned_date: string
  status: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  audience: string
  type: string
  read: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  class_name: string
  status: 'present' | 'absent' | 'late'
  date: string
  marked_at: string
}

export interface AttendanceStats {
  present: number
  absent: number
  late: number
  total: number
  rate: number
  date: string
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (login: string, password: string) =>
    (await api.post('/auth/login', { login, password })).data as {
      access_token: string
      token_type: string
      user: User
    },
  me: async () => (await api.get('/auth/me')).data as User,
  register: async (data: { full_name: string; email: string; phone: string; password: string; role: string }) =>
    (await api.post('/auth/register', data)).data as User,
  forgotPassword: async (email: string) =>
    (await api.post('/auth/forgot-password', { email })).data as { message: string },
  verifyResetToken: async (token: string) =>
    (await api.get(`/auth/verify-reset-token/${token}`)).data as { valid: boolean },
  resetPassword: async (token: string, new_password: string) =>
    (await api.post('/auth/reset-password', { token, new_password })).data as { message: string },
}

// ── Students API ──────────────────────────────────────────────────────────────

export const studentsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) =>
    (await api.get('/students/', { params })).data as PaginatedResponse<Student>,
  get: async (id: string) => (await api.get(`/students/${id}`)).data as Student,
  create: async (data: Omit<Student, 'id' | 'enrollment_status'>) =>
    (await api.post('/students/', data)).data as Student,
  update: async (id: string, data: Partial<Student>) =>
    (await api.put(`/students/${id}`, data)).data as Student,
  delete: async (id: string) => (await api.delete(`/students/${id}`)).data,
}

// ── Teachers API ──────────────────────────────────────────────────────────────

export const teachersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) =>
    (await api.get('/teachers/', { params })).data as PaginatedResponse<Teacher>,
  get: async (id: string) => (await api.get(`/teachers/${id}`)).data as Teacher,
  create: async (data: Omit<Teacher, 'id' | 'role' | 'is_active'>) =>
    (await api.post('/teachers/', data)).data as Teacher,
  update: async (id: string, data: Partial<Teacher>) =>
    (await api.put(`/teachers/${id}`, data)).data as Teacher,
  delete: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
}

// ── Classes API ──────────────────────────────────────────────────────────────

export const classesApi = {
  list: async () => (await api.get('/admin/classes')).data as { items: Array<{ id: string; name: string; level: string; capacity: number; student_count?: number }> },
  create: async (data: { name: string; level: string; capacity: number }) =>
    (await api.post('/admin/classes', data)).data,
  update: async (id: string, data: Partial<{ name: string; level: string; capacity: number }>) =>
    (await api.put(`/admin/classes/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/admin/classes/${id}`)).data,
}

// ── Finance API ───────────────────────────────────────────────────────────────

export const financeApi = {
  getStats: async () => (await api.get('/finance/stats')).data as FinanceStats,
  getPayments: async (params?: { page?: number; limit?: number; status?: string; type?: string; student_name?: string }) =>
    (await api.get('/finance/payments', { params })).data as PaginatedResponse<Payment>,
  recordPayment: async (data: Omit<Payment, 'id' | 'receipt_number' | 'status' | 'created_at' | 'payment_date'>) =>
    (await api.post('/finance/payments', data)).data as Payment,
  deletePayment: async (id: string) => (await api.delete(`/finance/payments/${id}`)).data,
  getExpenses: async (params?: { page?: number; limit?: number; category?: string }) =>
    (await api.get('/finance/expenses', { params })).data as PaginatedResponse<{ id: string; description: string; amount: number; category: string; expense_date: string }>,
  createExpense: async (data: { description: string; amount: number; category: string; expense_date?: string }) =>
    (await api.post('/finance/expenses', data)).data,
  deleteExpense: async (id: string) => (await api.delete(`/finance/expenses/${id}`)).data,
}

// ── Exams API ─────────────────────────────────────────────────────────────────

export const examsApi = {
  list: async () => (await api.get('/admin/exams')).data as { items: Exam[]; total: number },
  create: async (data: Omit<Exam, 'id' | 'created_at'>) => (await api.post('/admin/exams', data)).data as Exam,
  update: async (id: string, data: Partial<Exam>) => (await api.put(`/admin/exams/${id}`, data)).data as Exam,
  delete: async (id: string) => (await api.delete(`/admin/exams/${id}`)).data,
}

// ── Schedule API ──────────────────────────────────────────────────────────────

export interface ScheduleItem {
  id: string
  day: string
  time: string
  subject: string
  teacher_id: string
  teacher_name: string
  class_name: string
  room: string
  created_at: string
}

export const scheduleApi = {
  list: async (class_name?: string) =>
    (await api.get('/admin/schedule', { params: class_name ? { class_name } : {} })).data as { items: ScheduleItem[]; total: number },
  create: async (data: { day: string; time: string; subject: string; teacher_id: string; class_name: string; room?: string }) =>
    (await api.post('/admin/schedule', data)).data as ScheduleItem,
  delete: async (id: string) => (await api.delete(`/admin/schedule/${id}`)).data,
}

// ── Admissions API ────────────────────────────────────────────────────────────

export const admissionsApi = {
  list: async (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    (await api.get('/admin/admissions', { params })).data as PaginatedResponse<Admission>,
  create: async (data: Omit<Admission, 'id' | 'status' | 'application_number' | 'created_at'>) =>
    (await api.post('/admin/admissions', data)).data as Admission,
  updateStatus: async (id: string, status: string) =>
    (await api.put(`/admin/admissions/${id}/status?status=${status}`)).data,
  delete: async (id: string) => (await api.delete(`/admin/admissions/${id}`)).data,
}

// ── Communication API ─────────────────────────────────────────────────────────

export const communicationApi = {
  list: async (params?: { page?: number; limit?: number; audience?: string }) =>
    (await api.get('/admin/announcements', { params })).data as PaginatedResponse<Announcement>,
  create: async (data: Omit<Announcement, 'id' | 'created_at'>) =>
    (await api.post('/admin/announcements', data)).data as Announcement,
  delete: async (id: string) => (await api.delete(`/admin/announcements/${id}`)).data,
}

// ── CMS API ───────────────────────────────────────────────────────────────────

export const cmsApi = {
  list: async (params?: { status?: string }) =>
    (await api.get('/admin/cms/pages', { params })).data as { items: CmsPage[]; total: number },
  get: async (id: string) => (await api.get(`/admin/cms/pages/${id}`)).data as CmsPage,
  create: async (data: Omit<CmsPage, 'id' | 'created_at' | 'updated_at'>) =>
    (await api.post('/admin/cms/pages', data)).data as CmsPage,
  update: async (id: string, data: Partial<CmsPage>) =>
    (await api.put(`/admin/cms/pages/${id}`, data)).data as CmsPage,
  delete: async (id: string) => (await api.delete(`/admin/cms/pages/${id}`)).data,
}

// ── AI Knowledge API ──────────────────────────────────────────────────────────

export const aiKnowledgeApi = {
  list: async (params?: { category?: string; search?: string }) =>
    (await api.get('/admin/ai/knowledge', { params })).data as { items: KnowledgeItem[]; total: number },
  create: async (data: Omit<KnowledgeItem, 'id' | 'created_at'>) =>
    (await api.post('/admin/ai/knowledge', data)).data as KnowledgeItem,
  update: async (id: string, data: Partial<KnowledgeItem>) =>
    (await api.put(`/admin/ai/knowledge/${id}`, data)).data as KnowledgeItem,
  delete: async (id: string) => (await api.delete(`/admin/ai/knowledge/${id}`)).data,
}

export const aiReceptionistApi = aiKnowledgeApi

// ── Settings API ──────────────────────────────────────────────────────────────

export const settingsApi = {
  get: async () => (await api.get('/admin/settings')).data as Record<string, string>,
  update: async (data: Record<string, string>) =>
    (await api.put('/admin/settings', data)).data as Record<string, string>,
  advanceTerm: async () =>
    (await api.post('/admin/settings/advance-term')).data as {
      current_term: string; current_session: string
      previous_term: string; previous_session: string
      is_session_rollover: boolean
    },
}

// ── Promotion API ────────────────────────────────────────────────────────────

export interface PromotionStudent {
  id: string
  name: string
  admission_number: string
  average: number | null
  has_data: boolean
  suggested: 'promote' | 'repeat'
}

// ── Automation API ───────────────────────────────────────────────────────────

export interface AutomationRunResult {
  skipped: boolean
  reason?: string
  fee_reminders_sent?: number
  library_reminders?: number
  exam_transitions?: number
  absence_alerts_sent?: number
  birthday_shoutouts?: number
  errors?: Record<string, string>
}

export const automationApi = {
  runNow: async () => (await api.post('/admin/automation/run-now')).data as AutomationRunResult,
  status: async () => (await api.get('/admin/automation/status')).data as { last_run_date: string | null; last_run_at: string | null },
  log: async () => (await api.get('/admin/automation/log')).data as { items: Array<AutomationRunResult & { id: string; date: string; ran_at: string }> },
}

export const promotionApi = {
  preview: async (class_name: string, term?: string, session?: string) =>
    (await api.get('/admin/promotion/preview', { params: { class_name, term, session } })).data as
      { class_name: string; students: PromotionStudent[]; total: number },
  execute: async (data: { from_class: string; session: string; promotions: Array<{ student_id: string; action: 'promote' | 'repeat' | 'graduate'; target_class?: string }> }) =>
    (await api.post('/admin/promotion/execute', data)).data as { message: string; counts: Record<string, number> },
  history: async () =>
    (await api.get('/admin/promotion/history')).data as { items: Array<{ id: string; from_class: string; session: string; counts: Record<string, number>; executed_by: string; executed_at: string }> },
}

// ── Reports API ───────────────────────────────────────────────────────────────

export interface ReportResult {
  type: string
  title: string
  generated_at: string
  summary: Record<string, number | string | Record<string, number>>
  data: Array<Record<string, unknown>>
}

export const reportsApi = {
  generate: async (type: string) => (await api.get(`/admin/reports/generate/${type}`)).data as ReportResult,
}

// ── Results API ───────────────────────────────────────────────────────────────

export const resultsApi = {
  list: async (params?: { page?: number; limit?: number; class_name?: string; term?: string; student_name?: string; subject?: string }) =>
    (await api.get('/system/results', { params })).data as PaginatedResponse<Result>,
  create: async (data: Omit<Result, 'id' | 'total' | 'grade' | 'remark' | 'created_at'>) =>
    (await api.post('/system/results', data)).data as Result,
  update: async (id: string, data: Partial<Result>) =>
    (await api.put(`/system/results/${id}`, data)).data as Result,
  delete: async (id: string) => (await api.delete(`/system/results/${id}`)).data,
}

// ── Homework API ──────────────────────────────────────────────────────────────

export const homeworkApi = {
  list: async (params?: { page?: number; limit?: number; class_name?: string; subject?: string; status?: string }) =>
    (await api.get('/system/homework', { params })).data as PaginatedResponse<HomeworkItem>,
  create: async (data: Omit<HomeworkItem, 'id' | 'assigned_date' | 'status' | 'created_at'>) =>
    (await api.post('/system/homework', data)).data as HomeworkItem,
  update: async (id: string, data: Partial<HomeworkItem>) =>
    (await api.put(`/system/homework/${id}`, data)).data as HomeworkItem,
  delete: async (id: string) => (await api.delete(`/system/homework/${id}`)).data,
}

// ── Assignments API ───────────────────────────────────────────────────────────

export interface Assignment {
  id: string
  homework_id: string
  student_id: string
  student_name: string
  submission_text: string
  submitted_at: string
  status: string
}

export const assignmentsApi = {
  list: async (params?: { student_id?: string; homework_id?: string }) =>
    (await api.get('/system/assignments', { params })).data as { items: Assignment[]; total: number },
  submit: async (data: Omit<Assignment, 'id' | 'submitted_at' | 'status'>) =>
    (await api.post('/system/assignments', data)).data as Assignment,
}

// ── Notifications API ─────────────────────────────────────────────────────────

export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number; audience?: string; type?: string }) =>
    (await api.get('/system/notifications', { params })).data as PaginatedResponse<Notification>,
  create: async (data: Omit<Notification, 'id' | 'read' | 'created_at'>) =>
    (await api.post('/system/notifications', data)).data as Notification,
  delete: async (id: string) => (await api.delete(`/system/notifications/${id}`)).data,
}

// ── Library API ───────────────────────────────────────────────────────────────

export const libraryApi = {
  getBooks: async (params?: { page?: number; limit?: number; search?: string; category?: string; available?: boolean }) =>
    (await api.get('/system/library/books', { params })).data as PaginatedResponse<Book>,
  addBook: async (data: Omit<Book, 'id' | 'available_copies' | 'added_at'>) =>
    (await api.post('/system/library/books', data)).data as Book,
  updateBook: async (id: string, data: Partial<Book>) =>
    (await api.put(`/system/library/books/${id}`, data)).data as Book,
  deleteBook: async (id: string) => (await api.delete(`/system/library/books/${id}`)).data,
  getTransactions: async (params?: { page?: number; limit?: number; status?: string }) =>
    (await api.get('/system/library/transactions', { params })).data as PaginatedResponse<LibraryTransaction>,
  issueBook: async (data: { book_id: string; student_id: string; student_name: string; due_date: string }) =>
    (await api.post('/system/library/issue', data)).data as LibraryTransaction,
  returnBook: async (txnId: string) => (await api.post(`/system/library/return/${txnId}`, {})).data,
}

// ── Transport API ─────────────────────────────────────────────────────────────

export const transportApi = {
  getRoutes: async () => (await api.get('/system/transport/routes')).data as { items: TransportRoute[]; total: number },
  createRoute: async (data: Omit<TransportRoute, 'id' | 'created_at'>) =>
    (await api.post('/system/transport/routes', data)).data as TransportRoute,
  updateRoute: async (id: string, data: Partial<TransportRoute>) =>
    (await api.put(`/system/transport/routes/${id}`, data)).data as TransportRoute,
  deleteRoute: async (id: string) => (await api.delete(`/system/transport/routes/${id}`)).data,
  getStudents: async (route_id?: string) =>
    (await api.get('/system/transport/students', { params: route_id ? { route_id } : {} })).data as { items: TransportStudent[]; total: number },
  assignStudent: async (data: Omit<TransportStudent, 'id' | 'status' | 'assigned_at'>) =>
    (await api.post('/system/transport/students', data)).data,
  removeStudent: async (id: string) => (await api.delete(`/system/transport/students/${id}`)).data,
}

// ── Inventory API ─────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: async (params?: { page?: number; limit?: number; category?: string; search?: string; low_stock?: boolean }) =>
    (await api.get('/system/inventory', { params })).data as PaginatedResponse<InventoryItem>,
  add: async (data: Omit<InventoryItem, 'id' | 'added_at'>) =>
    (await api.post('/system/inventory', data)).data as InventoryItem,
  update: async (id: string, data: Partial<InventoryItem>) =>
    (await api.put(`/system/inventory/${id}`, data)).data as InventoryItem,
  delete: async (id: string) => (await api.delete(`/system/inventory/${id}`)).data,
}

// ── Payroll API ───────────────────────────────────────────────────────────────

export const payrollApi = {
  list: async (params?: { page?: number; limit?: number; month?: string; year?: string; status?: string }) =>
    (await api.get('/system/payroll', { params })).data as PaginatedResponse<PayrollEntry> & { total_amount: number },
  create: async (data: Omit<PayrollEntry, 'id' | 'net_salary' | 'created_at'>) =>
    (await api.post('/system/payroll', data)).data as PayrollEntry,
  update: async (id: string, data: Partial<PayrollEntry>) =>
    (await api.put(`/system/payroll/${id}`, data)).data as PayrollEntry,
  delete: async (id: string) => (await api.delete(`/system/payroll/${id}`)).data,
}

// ── Events API ────────────────────────────────────────────────────────────────

export const eventsApi = {
  list: async (params?: { page?: number; limit?: number; event_type?: string; upcoming?: boolean }) =>
    (await api.get('/system/events', { params })).data as PaginatedResponse<Event>,
  create: async (data: Omit<Event, 'id' | 'created_at'>) =>
    (await api.post('/system/events', data)).data as Event,
  update: async (id: string, data: Partial<Event>) =>
    (await api.put(`/system/events/${id}`, data)).data as Event,
  delete: async (id: string) => (await api.delete(`/system/events/${id}`)).data,
}

// ── Portal API ────────────────────────────────────────────────────────────────

export interface StudentPortalData {
  student: { id: string; full_name: string; email: string; admission_number: string }
  results: Result[]
  homework: HomeworkItem[]
  notifications: Notification[]
  payments: Payment[]
}

export interface ParentPortalData {
  parent: { id: string; full_name: string; email: string }
  children: Array<{ id: string; full_name: string; admission_number: string; results: Result[] }>
  notifications: Notification[]
}

export const portalApi = {
  getStudentData: async (studentId: string) =>
    (await api.get(`/system/portal/student/${studentId}`)).data as StudentPortalData,
  getParentData: async (parentId: string) =>
    (await api.get(`/system/portal/parent/${parentId}`)).data as ParentPortalData,
}

// ── Attendance API ────────────────────────────────────────────────────────────

export const attendanceApi = {
  getStats: async () => (await api.get('/system/attendance/stats')).data as AttendanceStats,
  getRecords: async (params?: { page?: number; limit?: number; class_name?: string; date?: string; student_id?: string }) =>
    (await api.get('/system/attendance/records', { params })).data as PaginatedResponse<AttendanceRecord>,
  markAttendance: async (data: { date: string; class_name: string; records: Array<{ student_id: string; student_name: string; status: string }> }) =>
    (await api.post('/system/attendance/mark', data)).data,
}

// ── Dashboard API ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: async () => (await api.get('/admin/dashboard/stats')).data as DashboardStats,
}

// ── AI Chat API ───────────────────────────────────────────────────────────────

export const aiChatApi = {
  sendMessage: async (message: string, history: ChatMessage[], sessionId?: string) =>
    (await api.post('/ai/chat', { message, history, session_id: sessionId })).data as {
      reply: string
      session_id: string
    },
}

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refreshTokenApi = {
  refresh: async (refreshToken: string) =>
    (await api.post('/auth/refresh', { refresh_token: refreshToken })).data as {
      access_token: string
      refresh_token: string
      token_type: string
      expires_in: number
      user: User
    },
  logout: async (refreshToken: string) =>
    (await api.post('/auth/logout', { refresh_token: refreshToken })).data,
}

// ── Profile / 2FA ─────────────────────────────────────────────────────────────
export interface ProfileData {
  id: string; email: string; username: string; full_name: string
  phone: string; avatar_url: string; role: string; two_fa_enabled: boolean
  is_verified: boolean; created_at: string
}
export const profileApi = {
  update: async (data: { full_name?: string; phone?: string }) =>
    (await api.put('/auth/profile', data)).data as ProfileData,
  uploadAvatar: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await api.post('/auth/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data as { avatar_url: string }
  },
  changePassword: async (current_password: string, new_password: string) =>
    (await api.post('/auth/change-password', { current_password, new_password })).data,
  setup2FA: async () => (await api.post('/auth/2fa/setup')).data as { secret: string; provisioning_uri: string },
  enable2FA: async (totp_code: string) => (await api.post('/auth/2fa/enable', { totp_code })).data,
  disable2FA: async (totp_code: string) => (await api.post('/auth/2fa/disable', { totp_code })).data,
}

// ── Fee Structures ─────────────────────────────────────────────────────────────
export interface FeeStructure {
  id: string; class_name: string; level?: string; term: string; session: string
  fees: Array<{ type: string; amount: number }>; total_amount: number; due_date: string; description?: string; created_at: string
}
export interface OutstandingFeeReport {
  students: Array<{
    student_id: string; student_name: string; class_name: string; email: string
    expected: number; paid: number; outstanding: number; fully_paid: boolean; due_date: string
  }>
  total_students: number; fully_paid_count: number; outstanding_count: number
  total_expected: number; total_paid: number; total_outstanding: number
}
export const feeStructuresApi = {
  list: async () => (await api.get('/fees/structures')).data as { items: FeeStructure[]; total: number },
  create: async (data: Omit<FeeStructure, 'id' | 'total_amount' | 'created_at'>) =>
    (await api.post('/fees/structures', data)).data as FeeStructure,
  update: async (id: string, data: Partial<FeeStructure>) =>
    (await api.put(`/fees/structures/${id}`, data)).data as FeeStructure,
  delete: async (id: string) => (await api.delete(`/fees/structures/${id}`)).data,
  getOutstanding: async (params?: { class_name?: string; term?: string; session?: string }) =>
    (await api.get('/fees/outstanding', { params })).data as OutstandingFeeReport,
  sendReminder: async (studentId: string, term: string, session: string) =>
    (await api.post(`/fees/remind/${studentId}`, null, { params: { term, session } })).data,
  sendAllReminders: async (term: string, session: string, class_name?: string) =>
    (await api.post('/fees/remind-all', null, { params: { term, session, class_name } })).data,
  copyForward: async (data: { from_term: string; from_session: string; to_term: string; to_session: string; due_date?: string }) =>
    (await api.post('/fees/structures/copy-forward', data)).data as { message: string; created_count: number; skipped_count: number },
}

// ── Exports ────────────────────────────────────────────────────────────────────
export const exportsApi = {
  receiptPdf: (paymentId: string) => `${api.defaults.baseURL}/exports/pdf/receipt/${paymentId}`,
  reportCardPdf: (studentId: string, term: string, session: string) =>
    `${api.defaults.baseURL}/exports/pdf/report-card/${studentId}?term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`,
  payslipPdf: (payrollId: string) => `${api.defaults.baseURL}/exports/pdf/payslip/${payrollId}`,
  admissionLetterPdf: (admissionId: string) => `${api.defaults.baseURL}/exports/pdf/admission-letter/${admissionId}`,
  studentsPdf: () => `${api.defaults.baseURL}/exports/pdf/students`,
  resultsExcel: (params?: { term?: string; class_name?: string; session?: string }) => {
    const q = new URLSearchParams(params as Record<string,string>).toString()
    return `${api.defaults.baseURL}/exports/excel/results${q ? '?' + q : ''}`
  },
  studentsExcel: () => `${api.defaults.baseURL}/exports/excel/students`,
  paymentsExcel: () => `${api.defaults.baseURL}/exports/excel/payments`,
  attendanceExcel: (params?: { date?: string; class_name?: string }) => {
    const q = new URLSearchParams(params as Record<string,string>).toString()
    return `${api.defaults.baseURL}/exports/excel/attendance${q ? '?' + q : ''}`
  },
  payrollExcel: (params?: { month?: string; year?: string }) => {
    const q = new URLSearchParams(params as Record<string,string>).toString()
    return `${api.defaults.baseURL}/exports/excel/payroll${q ? '?' + q : ''}`
  },
  resultsCsv: (term?: string) => `${api.defaults.baseURL}/exports/csv/results${term ? '?term=' + encodeURIComponent(term) : ''}`,
  paymentsCsv: () => `${api.defaults.baseURL}/exports/csv/payments`,
}

// ── Uploads / Bulk Import ──────────────────────────────────────────────────────
export const uploadsApi = {
  uploadStudentPhoto: async (studentId: string, file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await api.post(`/uploads/student-photo/${studentId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data as { url: string }
  },
  bulkImportStudents: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await api.post('/uploads/bulk/students', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  bulkImportResults: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await api.post('/uploads/bulk/results', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  bulkImportPayments: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await api.post('/uploads/bulk/payments', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
}

// ── Gallery ────────────────────────────────────────────────────────────────────
export interface GalleryItem {
  id: string
  url: string
  public_id?: string
  caption: string
  note: string
  category: string
  uploaded_by?: string
  created_at: string
}
export const galleryApi = {
  list: async () => (await api.get('/system/gallery')).data as { items: GalleryItem[]; total: number },
  create: async (file: File, fields: { caption?: string; note?: string; category?: string }) => {
    const form = new FormData()
    form.append('file', file)
    form.append('caption', fields.caption || '')
    form.append('note', fields.note || '')
    form.append('category', fields.category || 'general')
    return (await api.post('/system/gallery', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data as GalleryItem
  },
  update: async (id: string, data: Partial<Pick<GalleryItem, 'caption' | 'note' | 'category'>>) =>
    (await api.put(`/system/gallery/${id}`, data)).data as GalleryItem,
  delete: async (id: string) => (await api.delete(`/system/gallery/${id}`)).data,
}

// ── Admissions (extended) ──────────────────────────────────────────────────────
export const admissionsExtApi = {
  updateStatus: async (id: string, status: string) =>
    (await api.put(`/admin/admissions/${id}/status?status=${status}`)).data,
  enroll: async (id: string) =>
    (await api.post(`/admin/admissions/${id}/enroll`)).data,
}

// ── Bulk payroll run ──────────────────────────────────────────────────────────
export const payrollRunApi = {
  bulkRun: async (data: { month: string; year: string; base_salary?: number; allowances?: number }) =>
    (await api.post('/system/payroll/bulk-run', data)).data as {
      message: string; created_count: number; skipped: string[]
    },
}

// ── Library overdue ───────────────────────────────────────────────────────────
export interface OverdueTransaction {
  id: string; book_id: string; book_title: string; student_id: string
  student_name: string; issued_at: string; due_date: string; status: string
  days_overdue: number; fine: number
}
export const libraryOverdueApi = {
  list: async (fine_per_day = 50) =>
    (await api.get('/system/library/overdue', { params: { fine_per_day } })).data as {
      items: OverdueTransaction[]; total: number; total_fines: number
    },
  sendReminders: async () => (await api.post('/system/library/send-reminders', {})).data,
}

// ── Email blast ───────────────────────────────────────────────────────────────
export const emailBlastApi = {
  announcement: async (id: string, audience = 'all') =>
    (await api.post(`/admin/announcements/${id}/blast`, null, { params: { audience } })).data as {
      message: string; sent: number; failed: number
    },
}

// ── Payroll tax preview ───────────────────────────────────────────────────────
export interface TaxBreakdown {
  nhis: number; nhf: number; pension: number; paye: number; total_statutory: number
}
