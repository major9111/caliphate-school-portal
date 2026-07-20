import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '@/lib/api'

export function useTeachers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({ queryKey: ['teachers', params], queryFn: () => teachersApi.list(params) })
}

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: teachersApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }) })
}
