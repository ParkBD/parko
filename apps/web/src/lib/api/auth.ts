import { get, post } from './client'
import type { LoginDto, RegisterDto, AuthTokens } from '@/types/api'
import type { User } from '@/types/entities'

export const authApi = {
  login:    (body: LoginDto)    => post<AuthTokens>('/auth/login', body),
  register: (body: RegisterDto) => post<AuthTokens>('/auth/register', body),
  me:       ()                  => get<User>('/auth/me'),
  refresh:  (token: string)     => post<AuthTokens>('/auth/refresh', { refreshToken: token }),
  logout:   ()                  => post('/auth/logout'),
  forgotPassword: (email: string) => post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    post('/auth/reset-password', { token, password }),
}
