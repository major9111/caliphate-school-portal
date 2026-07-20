import { useQuery } from '@tanstack/react-query'
import { authApi, type User } from '@/lib/api'

export function useAuth() {
  const token = localStorage.getItem('token')

  const query = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!token && !!query.data,
    error: query.error,
  }
}
