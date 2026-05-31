export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  LOT: (id: string) => `/lot/${id}`,

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT: '/auth/forgot-password',
  },

  DRIVER: {
    DASHBOARD: '/driver/dashboard',
    BOOKINGS: '/driver/bookings',
    BOOKING: (id: string) => `/driver/bookings/${id}`,
    WALLET: '/driver/wallet',
    PROFILE: '/driver/profile',
  },

  OWNER: {
    DASHBOARD: '/owner/dashboard',
    LOTS: '/owner/lots',
    LOT_NEW: '/owner/lots/new',
    LOT: (id: string) => `/owner/lots/${id}`,
    LOT_AVAILABILITY: (id: string) => `/owner/lots/${id}/availability`,
    BOOKINGS: '/owner/bookings',
    EARNINGS: '/owner/earnings',
    PROFILE: '/owner/profile',
  },

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    USER: (id: string) => `/admin/users/${id}`,
    LOTS: '/admin/lots',
    LOT: (id: string) => `/admin/lots/${id}`,
    BOOKINGS: '/admin/bookings',
    PAYMENTS: '/admin/payments',
    WITHDRAWALS: '/admin/withdrawals',
    ANALYTICS: '/admin/analytics',
  },
} as const
