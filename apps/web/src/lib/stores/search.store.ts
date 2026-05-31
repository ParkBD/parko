'use client'
import { create } from 'zustand'

interface Coords { lat: number; lng: number }
interface DateRange { start: Date; end: Date }
interface Filters { type?: string; maxPrice?: number }

interface SearchStore {
  coords: Coords | null
  dateRange: DateRange | null
  filters: Filters
  mapViewport: { zoom: number; center: [number, number] } | null
  setCoords: (c: Coords) => void
  setDateRange: (r: DateRange | null) => void
  setFilters: (f: Filters) => void
  setMapViewport: (v: { zoom: number; center: [number, number] }) => void
  reset: () => void
}

export const useSearchStore = create<SearchStore>()((set) => ({
  coords: null,
  dateRange: null,
  filters: {},
  mapViewport: null,
  setCoords: (coords) => set({ coords }),
  setDateRange: (dateRange) => set({ dateRange }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setMapViewport: (mapViewport) => set({ mapViewport }),
  reset: () => set({ coords: null, dateRange: null, filters: {}, mapViewport: null }),
}))
