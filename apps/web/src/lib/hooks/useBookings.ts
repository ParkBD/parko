'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/lib/api/bookings'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import type { CreateBookingDto } from '@/types/api'

export const useBookings = (params?: Record<string, any>) =>
  useQuery({
    queryKey: [QUERY_KEYS.BOOKINGS, params],
    queryFn: () => bookingsApi.list(params),
  })

export const useOwnerBookings = (params?: Record<string, any>) =>
  useQuery({
    queryKey: [QUERY_KEYS.BOOKINGS, 'owner', params],
    queryFn: () => bookingsApi.ownerBookings(params),
  })

export const useBooking = (id: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.BOOKING, id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  })

export const useCreateBooking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBookingDto) => bookingsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.BOOKINGS] }),
  })
}

export const useCancelBooking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.BOOKINGS] }),
  })
}

export const useCheckin = () =>
  useMutation({ mutationFn: (code: string) => bookingsApi.checkin(code) })

export const useCheckout = () =>
  useMutation({ mutationFn: (code: string) => bookingsApi.checkout(code) })
