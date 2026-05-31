import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geoApi, RadiusSearchPayload, SaveLotPolygonPayload } from '@/lib/api/geo';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/**
 * Fetch geo data (polygon + entrances/exits) for a specific lot.
 */
export function useLotGeo(lotId: string | null | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.GEO_LOT, lotId],
    queryFn: () => geoApi.getLotGeo(lotId!),
    enabled: !!lotId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Radius-based parking search.
 */
export function useRadiusSearch(params: RadiusSearchPayload | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.GEO_RADIUS, params],
    queryFn: () => geoApi.searchWithinRadius(params!),
    enabled: !!params && params.lat != null && params.lng != null,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // live refresh every 30 s
  });
}

/**
 * Nearby lots (sorted by distance, no availability filter).
 */
export function useNearbyParking(
  lat: number | null | undefined,
  lng: number | null | undefined,
  radius = 5000,
) {
  return useQuery({
    queryKey: [QUERY_KEYS.GEO_NEARBY, lat, lng, radius],
    queryFn: () => geoApi.getNearby({ lat: lat!, lng: lng!, radius }),
    enabled: lat != null && lng != null,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Save a lot polygon (owner action).
 */
export function useSaveLotPolygon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveLotPolygonPayload) => geoApi.saveLotPolygon(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.GEO_LOT, variables.lotId] });
    },
  });
}

/**
 * Validate a GeoJSON polygon via PostGIS.
 */
export function useValidatePolygon() {
  return useMutation({
    mutationFn: (geojson: Record<string, any>) => geoApi.validatePolygon(geojson),
  });
}
