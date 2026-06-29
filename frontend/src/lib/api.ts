import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: async (login: string, password: string) => (await api.post('/auth/login', { login, password })).data,
  me: async () => (await api.get('/auth/me')).data,
}

export const studentsApi = {
  list: async (params?: any) => (await api.get('/students', { params })).data,
  get: async (id: string) => (await api.get(`/students/${id}`)).data,
  create: async (data: any) => (await api.post('/students', data)).data,
  delete: async (id: string) => (await api.delete(`/students/${id}`)).data,
}

export const teachersApi = {
  list: async (params?: any) => (await api.get('/teachers', { params })).data,
  get: async (id: string) => (await api.get(`/teachers/${id}`)).data,
  create: async (data: any) => (await api.post('/teachers', data)).data,
  delete: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
}

export const classesApi = {
  list: async () => (await api.get('/classes')).data,
  create: async (data: any) => (await api.post('/classes', data)).data,
}

export const financeApi = {
  getStats: async () => (await api.get('/finance/stats')).data,
  getPayments: async (params?: any) => (await api.get('/finance/payments', { params })).data,
  recordPayment: async (data: any) => (await api.post('/finance/payments', data)).data,
}

export const examsApi = {
  list: async () => (await api.get('/admin/exams')).data,
  create: async (data: any) => (await api.post('/admin/exams', data)).data,
  delete: async (id: string) => (await api.delete(`/admin/exams/${id}`)).data,
}

export const scheduleApi = {
  list: async () => (await api.get('/admin/schedule')).data,
  create: async (data: any) => (await api.post('/admin/schedule', data)).data,
  delete: async (id: string) => (await api.delete(`/admin/schedule/${id}`)).data,
}

export const admissionsApi = {
  list: async () => (await api.get('/admin/admissions')).data,
  create: async (data: any) => (await api.post('/admin/admissions', data)).data,
  updateStatus: async (id: string, status: string) => (await api.put(`/admin/admissions/${id}/status?status=${status}`)).data,
}

export const communicationApi = {
  list: async () => (await api.get('/admin/announcements')).data,
  create: async (data: any) => (await api.post('/admin/announcements', data)).data,
  delete: async (id: string) => (await api.delete(`/admin/announcements/${id}`)).data,
}

export const cmsApi = {
  list: async () => (await api.get('/admin/cms/pages')).data,
  create: async (data: any) => (await api.post('/admin/cms/pages', data)).data,
  delete: async (id: string) => (await api.delete(`/admin/cms/pages/${id}`)).data,
}

export const aiKnowledgeApi = {
  list: async () => (await api.get('/admin/ai/knowledge')).data,
  create: async (data: any) => (await api.post('/admin/ai/knowledge', data)).data,
  delete: async (id: string) => (await api.delete(`/admin/ai/knowledge/${id}`)).data,
}

export const settingsApi = {
  get: async () => (await api.get('/admin/settings')).data,
  update: async (data: any) => (await api.put('/admin/settings', data)).data,
}

export const reportsApi = {
  generate: async (type: string) => (await api.get(`/admin/reports/generate/${type}`)).data,
}

export const resultsApi = {
  list: async (params?: any) => (await api.get('/system/results', { params })).data,
  create: async (data: any) => (await api.post('/system/results', data)).data,
  delete: async (id: string) => (await api.delete(`/system/results/${id}`)).data,
}

export const homeworkApi = {
  list: async (params?: any) => (await api.get('/system/homework', { params })).data,
  create: async (data: any) => (await api.post('/system/homework', data)).data,
  delete: async (id: string) => (await api.delete(`/system/homework/${id}`)).data,
}

export const assignmentsApi = {
  list: async (params?: any) => (await api.get('/system/assignments', { params })).data,
  submit: async (data: any) => (await api.post('/system/assignments', data)).data,
}

export const notificationsApi = {
  list: async (params?: any) => (await api.get('/system/notifications', { params })).data,
  create: async (data: any) => (await api.post('/system/notifications', data)).data,
  delete: async (id: string) => (await api.delete(`/system/notifications/${id}`)).data,
}

export const libraryApi = {
  getBooks: async () => (await api.get('/system/library/books')).data,
  addBook: async (data: any) => (await api.post('/system/library/books', data)).data,
  deleteBook: async (id: string) => (await api.delete(`/system/library/books/${id}`)).data,
  getTransactions: async () => (await api.get('/system/library/transactions')).data,
  issueBook: async (data: any) => (await api.post('/system/library/issue', data)).data,
  returnBook: async (transId: string) => (await api.post(`/system/library/return/${transId}`, {})).data,
}

export const transportApi = {
  getRoutes: async () => (await api.get('/system/transport/routes')).data,
  createRoute: async (data: any) => (await api.post('/system/transport/routes', data)).data,
  deleteRoute: async (id: string) => (await api.delete(`/system/transport/routes/${id}`)).data,
  getStudents: async () => (await api.get('/system/transport/students')).data,
  assignStudent: async (data: any) => (await api.post('/system/transport/students', data)).data,
}

export const inventoryApi = {
  list: async (params?: any) => (await api.get('/system/inventory', { params })).data,
  add: async (data: any) => (await api.post('/system/inventory', data)).data,
  delete: async (id: string) => (await api.delete(`/system/inventory/${id}`)).data,
}

export const payrollApi = {
  list: async (params?: any) => (await api.get('/system/payroll', { params })).data,
  create: async (data: any) => (await api.post('/system/payroll', data)).data,
}

export const eventsApi = {
  list: async (params?: any) => (await api.get('/system/events', { params })).data,
  create: async (data: any) => (await api.post('/system/events', data)).data,
  delete: async (id: string) => (await api.delete(`/system/events/${id}`)).data,
}

export const portalApi = {
  getStudentData: async (studentId: string) => (await api.get(`/system/portal/student/${studentId}`)).data,
  getParentData: async (parentId: string) => (await api.get(`/system/portal/parent/${parentId}`)).data,
}

export const attendanceApi = {
  getStats: async () => (await api.get('/attendance/stats')).data,
  getRecords: async (params?: any) => (await api.get('/attendance/records', { params })).data,
}

export const dashboardApi = {
  getStats: async () => (await api.get('/dashboard/stats')).data,
}

export interface ChatMessage { role: 'user' | 'assistant'; text: string }
export const aiChatApi = {
  sendMessage: async (message: string, history: ChatMessage[], sessionId?: string) =>
    (await api.post('/ai/chat', { message, history, session_id: sessionId })).data,
}

export const aiReceptionistApi = aiKnowledgeApi
