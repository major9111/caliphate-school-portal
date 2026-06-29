import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/lib/api'

export function useStudents(params?: any) {
  return useQuery({ queryKey: ['students', params], queryFn: () => studentsApi.list(params) })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: studentsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }) })
}
