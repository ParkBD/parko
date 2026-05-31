import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useParkingLots(params?: { page?: number; limit?: number; city?: string }) {
  return useQuery({
    queryKey: ['parking', 'lots', params],
    queryFn: () =>
      api.get('/api/v1/parking/lots', { params }) as any,
  });
}

export function useParkingLot(id: string) {
  return useQuery({
    queryKey: ['parking', 'lots', id],
    queryFn: () => api.get(`/api/v1/parking/lots/${id}`) as any,
    enabled: !!id,
  });
}

export function useMyParkingLots() {
  return useQuery({
    queryKey: ['parking', 'lots', 'mine'],
    queryFn: () => api.get('/api/v1/parking/lots/mine') as any,
  });
}

export function useLotAvailability(lotId: string, startTime: string, endTime: string) {
  return useQuery({
    queryKey: ['parking', 'availability', lotId, startTime, endTime],
    queryFn: () =>
      api.get(`/api/v1/parking/lots/${lotId}/availability`, { params: { startTime, endTime } }) as any,
    enabled: !!lotId && !!startTime && !!endTime,
    staleTime: 30 * 1000,
  });
}

export function useRadiusSearch(lat: number, lng: number, radius = 5) {
  return useQuery({
    queryKey: ['search', 'radius', lat, lng, radius],
    queryFn: () =>
      api.get('/api/v1/search/radius', { params: { lat, lng, radius } }) as any,
    enabled: !!lat && !!lng,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateParkingLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/v1/parking/lots', data) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parking', 'lots', 'mine'] });
    },
  });
}
