'use client'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/lib/api/search'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import type { SearchParams } from '@/types/api'

export const useSearch = (params: SearchParams, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.SEARCH, params],
    queryFn: () => searchApi.lots(params),
    enabled: enabled && !!(params.lat && params.lng),
    staleTime: 30_000,
  })
