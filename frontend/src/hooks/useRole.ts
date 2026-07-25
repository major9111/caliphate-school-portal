// FUGUSAU Portal — Custom Hooks

import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

/** Role-based access helpers */
export function useRole() {
  const { user } = useAuthStore()
  const role = user?.role as UserRole | undefined

  return {
    role,
    isStudent:  role === 'student',
    isLecturer: role === 'lecturer',
    isAdmin:    role === 'admin',
    isParent:   role === 'parent',
    isStaff:    role === 'admin' || role === 'lecturer',
    can: (allowed: UserRole[]) => !!role && allowed.includes(role),
  }
}

/** Check if a date string is overdue */
export function useOverdueCheck(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
