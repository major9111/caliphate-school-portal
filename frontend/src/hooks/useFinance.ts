import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/api'

export function useFinanceStats() {
  return useQuery({ queryKey: ['finance-stats'], queryFn: financeApi.getStats })
}

export function usePayments(params?: any) {
  return useQuery({ queryKey: ['payments', params], queryFn: () => financeApi.getPayments(params) })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-stats'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
