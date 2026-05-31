'use client'
import { create } from 'zustand'

type ModalId = 'topup' | 'withdraw' | 'cancel-booking' | 'lot-images' | null

interface UIStore {
  sidebarOpen: boolean
  activeModal: ModalId
  modalData: Record<string, any> | null
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  openModal: (id: ModalId, data?: Record<string, any>) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (id, data) => set({ activeModal: id, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}))
