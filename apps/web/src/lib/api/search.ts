import { get } from './client'
import type { SearchParams } from '@/types/api'
import type { ParkingLot } from '@/types/entities'

export const searchApi = {
  lots: (params: SearchParams) => get<ParkingLot[]>('/search', { params }),
}
