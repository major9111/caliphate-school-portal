import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Where a user should land right after login/register, based on their role. */
export function getHomeRouteForRole(role?: string): string {
  switch (role) {
    case 'parent':
      return '/app/parent-portal'
    case 'student':
      return '/app/student-portal'
    default:
      return '/app/dashboard'
  }
}

/** Paths every logged-in user can reach regardless of role. */
const SHARED_PATHS = ['/app/dashboard', '/app/profile']

/** Paths restricted to a specific role (in addition to SHARED_PATHS). */
const ROLE_PATHS: Record<string, string[]> = {
  parent: ['/app/parent-portal'],
  student: ['/app/student-portal'],
}

/**
 * Whether `path` is off-limits for `role`. Staff/admin/teacher roles (i.e.
 * anything not listed in ROLE_PATHS) are unrestricted; parent/student
 * accounts may only reach SHARED_PATHS plus their own portal.
 */
export function isPathBlockedForRole(path: string, role?: string): boolean {
  const restricted = role ? ROLE_PATHS[role] : undefined
  if (!restricted) return false // staff/teacher/admin/etc: full access
  const allowed = [...SHARED_PATHS, ...restricted]
  return !allowed.some((p) => path === p || path.startsWith(p + '/'))
}
