'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api/admin'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export const useAdminUsers = (params?: Record<string, any>) =>
  useQuery({
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: () => adminApi.users(params),
  })

export const useAdminUser = (id: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.USER, id],
    queryFn: () => adminApi.user(id),
    enabled: !!id,
  })

export const useBanUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.banUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] }),
  })
}

export const useAdminWithdrawals = (params?: Record<string, any>) =>
  useQuery({
    queryKey: [QUERY_KEYS.WITHDRAWALS, params],
    queryFn: () => adminApi.withdrawals(params),
  })

export const useApproveWithdrawal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.approveWithdraw(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.WITHDRAWALS] }),
  })
}

export const useRejectWithdrawal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.rejectWithdraw(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.WITHDRAWALS] }),
  })
}

export const useAnalytics = () =>
  useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS],
    queryFn: () => adminApi.analytics(),
    staleTime: 5 * 60 * 1000,
  })
