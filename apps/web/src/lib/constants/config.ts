export const CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  API_PREFIX: '/api/v1',
  MAP_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  APP_NAME: 'Parko',
  DEFAULT_AVATAR: '/images/avatar-placeholder.png',
  DEFAULT_LOT_IMAGE: '/images/lot-placeholder.jpg',
  SEARCH_RADIUS_KM: 5,
  PAGINATION_LIMIT: 20,
} as const
