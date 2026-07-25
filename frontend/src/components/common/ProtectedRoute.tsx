/**
 * FUGUSAU Portal — Protected Route Guard
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
