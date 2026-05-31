import type { User } from './entities'

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isHydrated: boolean
}

export interface DecodedToken {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}
