import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/api/v1/wallet') as any,
  });
}

export function useTransactions(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['wallet', 'transactions', params],
    queryFn: () => api.get('/api/v1/wallet/transactions', { params }) as any,
  });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; method: string; accountDetails: any }) =>
      api.post('/api/v1/withdrawals', data) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}

export function useMyWithdrawals() {
  return useQuery({
    queryKey: ['withdrawals', 'mine'],
    queryFn: () => api.get('/api/v1/withdrawals/mine') as any,
  });
}
