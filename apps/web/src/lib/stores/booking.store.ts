'use client'
import { create } from 'zustand'
import type { ParkingLot } from '@/types/entities'

type BookingStep = 'select' | 'schedule' | 'confirm' | 'payment' | 'success'

interface BookingStore {
  selectedLot: ParkingLot | null
  step: BookingStep
  startTime: Date | null
  endTime: Date | null
  pendingBookingId: string | null
  setSelectedLot: (lot: ParkingLot | null) => void
  setStep: (step: BookingStep) => void
  setTimes: (start: Date, end: Date) => void
  setPendingBookingId: (id: string | null) => void
  reset: () => void
}

export const useBookingStore = create<BookingStore>()((set) => ({
  selectedLot: null,
  step: 'select',
  startTime: null,
  endTime: null,
  pendingBookingId: null,
  setSelectedLot: (selectedLot) => set({ selectedLot }),
  setStep: (step) => set({ step }),
  setTimes: (startTime, endTime) => set({ startTime, endTime }),
  setPendingBookingId: (pendingBookingId) => set({ pendingBookingId }),
  reset: () => set({ selectedLot: null, step: 'select', startTime: null, endTime: null, pendingBookingId: null }),
}))
