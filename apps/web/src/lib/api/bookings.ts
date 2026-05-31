import { get, post, patch } from './client'
import type { CreateBookingDto } from '@/types/api'
import type { Booking } from '@/types/entities'

export const bookingsApi = {
  list:     (params?: Record<string, any>) => get<Booking[]>('/bookings', { params }),
  get:      (id: string) => get<Booking>(`/bookings/${id}`),
  create:   (body: CreateBookingDto) => post<Booking>('/bookings', body),
  cancel:   (id: string) => patch<Booking>(`/bookings/${id}/cancel`),
  checkin:  (code: string) => post('/bookings/checkin', { code }),
  checkout: (code: string) => post('/bookings/checkout', { code }),
  ownerBookings: (params?: Record<string, any>) => get<Booking[]>('/bookings/owner', { params }),
}
