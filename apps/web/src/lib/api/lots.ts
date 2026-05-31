import { get, post, patch, del } from './client'
import type { CreateLotDto, UpdateLotDto } from '@/types/api'
import type { ParkingLot } from '@/types/entities'

export const lotsApi = {
  list:         (params?: Record<string, any>) => get<ParkingLot[]>('/parking', { params }),
  get:          (id: string) => get<ParkingLot>(`/parking/${id}`),
  create:       (body: CreateLotDto) => post<ParkingLot>('/parking', body),
  update:       (id: string, body: UpdateLotDto) => patch<ParkingLot>(`/parking/${id}`, body),
  delete:       (id: string) => del(`/parking/${id}`),
  myLots:       () => get<ParkingLot[]>('/parking/my'),
  approve:      (id: string) => patch(`/parking/${id}/approve`),
  reject:       (id: string, reason?: string) => patch(`/parking/${id}/reject`, { reason }),
  availability: (id: string, params: { start: string; end: string }) =>
    get(`/parking/${id}/availability`, { params }),
  blockTime:    (id: string, body: { start: string; end: string }) =>
    post(`/parking/${id}/availability/block`, body),
}
