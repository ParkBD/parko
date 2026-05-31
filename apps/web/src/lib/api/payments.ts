import { get, post } from './client'
import type { Payment } from '@/types/entities'

export const paymentsApi = {
  list:     (params?: Record<string, any>) => get<Payment[]>('/payment', { params }),
  initiate: (bookingId: string) => post('/payment/initiate', { bookingId }),
}
