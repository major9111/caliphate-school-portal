import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, type Student } from '@/lib/api'

export function useStudents(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({ queryKey: ['students', params], queryFn: () => studentsApi.list(params) })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Student, 'id' | 'enrollment_status'>) => studentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}
