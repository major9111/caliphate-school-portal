// FUGUSAU Portal — Shared TypeScript Types (extended)
// Adds: Department, Faculty, Staff, Lecturer, AdmissionApplication,
//       AdmissionSession, SecurityEvent, AuditLog, IPRule, LecturerProfile

export type UserRole = 'student' | 'lecturer' | 'admin' | 'parent'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_verified: boolean
  two_fa_enabled: boolean
  profile_photo: string | null
}

export interface StudentProfile {
  id: string
  matric_number: string
  full_name: string
  email: string
  profile_photo: string | null
  department: string
  department_name: string
  level: 100 | 200 | 300 | 400 | 500
  admission_year: number
  admission_session: string
  status: 'active' | 'suspended' | 'graduated' | 'deferred' | 'withdrawn'
  cgpa: number
  total_credit_units_earned: number
  state_of_origin: string
  blood_group: string
  genotype: string
  next_of_kin: string
  next_of_kin_phone: string
}

// ── Admin types ──────────────────────────────────────────────────────────────

export interface Faculty {
  id: string
  name: string
  code: string
  dean_name: string | null
  department_count: number
  student_count: number
}

export interface Department {
  id: string
  name: string
  code: string
  faculty: string
  faculty_name: string
  hod_name: string | null
  student_count: number
  lecturer_count: number
  course_count: number
}

export interface Lecturer {
  id: string
  full_name: string
  email: string
  profile_photo: string | null
  rank: string
  title: string
  specialization: string
  department: string
  department_name: string
  courses_count: number
  is_active: boolean
}

export interface Staff extends Lecturer {
  staff_id: string
  date_joined: string
}

// ── Admission types ──────────────────────────────────────────────────────────

export type AdmissionStatus = 'pending' | 'admitted' | 'not_admitted' | 'offered' | 'accepted' | 'declined'

export interface AdmissionApplication {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  jamb_reg_no: string
  jamb_score: number
  course_choice: string
  status: AdmissionStatus
  session: string
  applied_at: string
  offer_letter_url: string | null
  documents: AdmissionDocument[]
}

export interface AdmissionDocument {
  id: string
  document_type: string
  file_url: string
  uploaded_at: string
  is_verified: boolean
}

export interface AdmissionSession {
  id: string
  name: string
  year: number
  start_date: string
  end_date: string
  is_active: boolean
  minimum_jamb_score: number
}

// ── Security types ───────────────────────────────────────────────────────────

export interface SecurityEvent {
  id: string
  event_type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'suspicious_activity'
  user_email: string
  ip_address: string
  user_agent: string
  timestamp: string
  details: string
}

export interface AuditLog {
  id: string
  action: string
  model: string
  object_id: string
  user_email: string
  ip_address: string
  timestamp: string
  changes: Record<string, any>
}

export interface IPRule {
  id: string
  ip_address: string
  rule_type: 'block' | 'allow'
  reason: string
  created_at: string
  created_by: string
  is_active: boolean
}

// ── Admin stats ──────────────────────────────────────────────────────────────

export interface AdminStats {
  total_students: number
  active_students: number
  total_staff: number
  total_departments: number
  total_faculties: number
  total_courses: number
  fee_collection_rate: number
  total_fees_collected: number
  total_fees_outstanding: number
  pending_results: number
  pending_clearances: number
  pending_hostel_requests: number
  pending_credential_requests: number
}

// ── Shared types (unchanged from original) ───────────────────────────────────

export interface Course {
  id: string
  code: string
  title: string
  department: string
  department_name: string
  credit_units: number
  level: number
  semester: 'first' | 'second' | 'both'
  description: string
  is_elective: boolean
  enrolled_count: number
}

export interface Enrollment {
  id: string
  course: string
  course_code: string
  course_title: string
  credit_units: number
  session: string
  session_name: string
  semester: string
  status: 'registered' | 'dropped' | 'completed'
  enrolled_at: string
}

export interface TimetableEntry {
  id: string
  course_code: string
  course_title: string
  lecturer_name: string
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
  start_time: string
  end_time: string
  venue: string
  week_type: string
}

export interface ExamSchedule {
  id: string
  course_code: string
  course_title: string
  session_name: string
  semester: string
  exam_date: string
  start_time: string
  duration_minutes: number
  venue: string
  instructions: string
}

export interface Result {
  id: string
  course_code: string
  course_title: string
  credit_units: number
  session: string
  semester: string
  ca_score: number
  exam_score: number
  total_score: number
  grade: string
  grade_point: number
  is_senate_approved: boolean
  uploaded_at: string
}

export interface Invoice {
  id: string
  invoice_no: string
  fee_types: FeeType[]
  total_amount: number
  amount_paid: number
  balance: number
  status: 'pending' | 'paid' | 'partial' | 'overdue'
  due_date: string
  generated_at: string
  rrr: string
  payments: Payment[]
}

export interface FeeType {
  id: string
  name: string
  category: string
  amount: number
  session_name: string
  semester: string
  level: number | null
  is_mandatory: boolean
}

export interface Payment {
  id: string
  amount: number
  gateway: string
  transaction_ref: string
  is_verified: boolean
  verified_at: string | null
  payment_date: string
}

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category_name: string
  publisher: string
  edition: string
  year: number
  total_copies: number
  available_copies: number
  shelf_location: string
  cover_image: string | null
  description: string
  is_ebook: boolean
  ebook_url: string | null
  status: 'available' | 'borrowed' | 'reserved' | 'maintenance'
}

export interface BorrowRecord {
  id: string
  book_title: string
  book_author: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  status: 'borrowed' | 'returned' | 'overdue'
  fine_amount: number
  fine_paid: boolean
}

export interface Notification {
  id: string
  title: string
  message: string
  notif_type: 'info' | 'warning' | 'success' | 'danger'
  action_url: string
  is_read: boolean
  created_at: string
  created_by_name: string
}

export interface ChatRoom {
  id: string
  name: string
  room_type: 'direct' | 'group' | 'announcement'
  member_names: string[]
  last_message: string | null
  unread_count: number
}

export interface Message {
  id: string
  room: string
  sender: string
  sender_name: string
  sender_role: UserRole
  sender_photo: string | null
  content: string
  message_type: 'text' | 'file' | 'image'
  file_url: string | null
  is_read: boolean
  created_at: string
  timestamp: string
}

export interface HostelAllocation {
  id: string
  student: string
  room: string
  session: string
  student_name: string
  matric_number: string
  room_number: string
  hostel_name: string
  session_name: string
  status: 'pending' | 'approved' | 'rejected' | 'vacated'
  allocated_by: string | null
  allocated_at: string
  vacated_at: string | null
  remarks: string
}

export interface Credential {
  id: string
  credential_type: string
  status: 'pending' | 'processing' | 'ready' | 'collected'
  request_reason: string
  requested_at: string
  processed_at: string | null
  ready_at: string | null
  collection_code: string | null
  file_url: string | null
}

export interface TranscriptData {
  student: {
    name: string
    matric_number: string
    department: string
    level: number
    cgpa: number
    total_units_earned: number
  }
  results: Result[]
  cgpa: string
  total_units: number
  classification: string
  transcript: Record<string, {
    courses: Array<{
      code: string; title: string; credit_units: number
      ca: number; exam: number; total: number
      grade: string; grade_point: number
    }>
    gpa: number
    total_units: number
  }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
