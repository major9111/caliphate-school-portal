import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'

export function useAuth() {
  const token = localStorage.getItem('token')
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!token,
  })
  return { user: query.data, isLoading: query.isLoading, isAuthenticated: !!token && !!query.data }
}
