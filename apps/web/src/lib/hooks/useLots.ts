'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lotsApi } from '@/lib/api/lots'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import type { CreateLotDto, UpdateLotDto } from '@/types/api'

export const useLots = (params?: Record<string, any>) =>
  useQuery({
    queryKey: [QUERY_KEYS.LOTS, params],
    queryFn: () => lotsApi.list(params),
  })

export const useMyLots = () =>
  useQuery({
    queryKey: [QUERY_KEYS.LOTS, 'my'],
    queryFn: () => lotsApi.myLots(),
  })

export const useLot = (id: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.LOT, id],
    queryFn: () => lotsApi.get(id),
    enabled: !!id,
    staleTime: 60_000,
  })

export const useCreateLot = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLotDto) => lotsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.LOTS] }),
  })
}

export const useUpdateLot = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateLotDto) => lotsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.LOT, id] })
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.LOTS] })
    },
  })
}

export const useDeleteLot = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => lotsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.LOTS] }),
  })
}

export const useApproveLot = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => lotsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.LOTS] }),
  })
}
