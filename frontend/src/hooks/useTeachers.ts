import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '@/lib/api'

export function useTeachers(params?: any) {
  return useQuery({ queryKey: ['teachers', params], queryFn: () => teachersApi.list(params) })
}

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: teachersApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }) })
}
