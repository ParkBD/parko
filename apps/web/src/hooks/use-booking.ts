import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMyBookings(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['bookings', 'mine', params],
    queryFn: () => api.get('/api/v1/bookings/mine', { params }) as any,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/v1/bookings', data) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/api/v1/bookings/${id}/cancel`, { reason }) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useLotBookings(lotId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['bookings', 'lot', lotId, params],
    queryFn: () => api.get(`/api/v1/bookings/lot/${lotId}`, { params }) as any,
    enabled: !!lotId,
  });
}
