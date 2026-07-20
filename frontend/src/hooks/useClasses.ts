import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesApi } from '@/lib/api'

export function useClasses() {
  return useQuery({ queryKey: ['classes'], queryFn: () => classesApi.list() })
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; level: string; capacity: number }) => classesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }) },
  })
}
