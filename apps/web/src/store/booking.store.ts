import { create } from 'zustand';

interface BookingDraft {
  lotId: string | null;
  slotId: string | null;
  startTime: string | null;
  endTime: string | null;
  vehicleNumber: string | null;
  coinsToUse: number;
}

interface BookingState {
  draft: BookingDraft;
  setDraft: (data: Partial<BookingDraft>) => void;
  clearDraft: () => void;
}

const initialDraft: BookingDraft = {
  lotId: null,
  slotId: null,
  startTime: null,
  endTime: null,
  vehicleNumber: null,
  coinsToUse: 0,
};

export const useBookingStore = create<BookingState>((set) => ({
  draft: initialDraft,
  setDraft: (data) => set((state) => ({ draft: { ...state.draft, ...data } })),
  clearDraft: () => set({ draft: initialDraft }),
}));
