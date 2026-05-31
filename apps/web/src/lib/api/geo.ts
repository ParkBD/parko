import { get, post } from '@/lib/api/client';

export interface SaveLotPolygonPayload {
  lotId: string;
  polygon: Record<string, any>;
  entrances: { lat: number; lng: number }[];
  exits: { lat: number; lng: number }[];
}

export interface RadiusSearchPayload {
  lat: number;
  lng: number;
  radiusMeters?: number;
  limit?: number;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radius?: number;
}

export const geoApi = {
  saveLotPolygon: (data: SaveLotPolygonPayload) =>
    post<any>('/geo/polygon', data),

  getLotGeo: (lotId: string) =>
    get<any>(`/geo/lot/${lotId}`),

  searchWithinRadius: (data: RadiusSearchPayload) =>
    post<any[]>('/geo/search', data),

  getNearby: (params: NearbyParams) =>
    get<any[]>('/geo/nearby', { params }),

  validatePolygon: (geojson: Record<string, any>) =>
    post<{ valid: boolean; reason: string | null }>('/geo/validate', { geojson }),
};
