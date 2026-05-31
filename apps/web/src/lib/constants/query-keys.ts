export const QUERY_KEYS = {
  AUTH_ME:     'auth:me',
  BOOKINGS:    'bookings',
  BOOKING:     'booking',
  LOTS:        'lots',
  LOT:         'lot',
  SEARCH:      'search',
  WALLET:      'wallet',
  TRANSACTIONS:'transactions',
  EARNINGS:    'earnings',
  USERS:       'users',
  USER:        'user',
  PAYMENTS:    'payments',
  WITHDRAWALS: 'withdrawals',
  ANALYTICS:   'analytics',
  GEO_LOT:     'geo:lot',
  GEO_NEARBY:  'geo:nearby',
  GEO_RADIUS:  'geo:radius',
} as const

export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS]
