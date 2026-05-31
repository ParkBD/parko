import { get, patch } from './client'
import type { User, Withdrawal, AnalyticsSummary } from '@/types/entities'

export const adminApi = {
  users:           (params?: Record<string, any>) => get<User[]>('/admin/users', { params }),
  user:            (id: string) => get<User>(`/admin/users/${id}`),
  banUser:         (id: string) => patch(`/admin/users/${id}/ban`),
  unbanUser:       (id: string) => patch(`/admin/users/${id}/unban`),

  withdrawals:     (params?: Record<string, any>) => get<Withdrawal[]>('/withdrawal', { params }),
  approveWithdraw: (id: string) => patch(`/withdrawal/${id}/approve`),
  rejectWithdraw:  (id: string) => patch(`/withdrawal/${id}/reject`),

  analytics:       () => get<AnalyticsSummary>('/analytics'),
}
