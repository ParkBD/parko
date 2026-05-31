'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletApi } from '@/lib/api/wallet'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export const useWallet = () =>
  useQuery({
    queryKey: [QUERY_KEYS.WALLET],
    queryFn: () => walletApi.get(),
    refetchInterval: 30_000,
  })

export const useTransactions = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, params],
    queryFn: () => walletApi.transactions(params),
  })

export const useTopup = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) => walletApi.topup(amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.WALLET] }),
  })
}
