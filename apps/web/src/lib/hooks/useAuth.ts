'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth.store'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import { ROUTES } from '@/lib/constants/routes'
import type { LoginDto, RegisterDto } from '@/types/api'

export const useMe = () => {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: [QUERY_KEYS.AUTH_ME],
    queryFn: () => authApi.me(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
}

export const useLogin = () => {
  const { setAuth } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginDto) => authApi.login(body),
    onSuccess: (data: any) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.AUTH_ME] })
      const role = data.user.role
      if (role === 'DRIVER') router.push(ROUTES.DRIVER.DASHBOARD)
      else if (role === 'OWNER') router.push(ROUTES.OWNER.DASHBOARD)
      else router.push(ROUTES.ADMIN.DASHBOARD)
    },
  })
}

export const useRegister = () => {
  const { setAuth } = useAuthStore()
  const router = useRouter()
  return useMutation({
    mutationFn: (body: RegisterDto) => authApi.register(body),
    onSuccess: (data: any) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      router.push(data.user.role === 'OWNER' ? ROUTES.OWNER.DASHBOARD : ROUTES.DRIVER.DASHBOARD)
    },
  })
}

export const useLogout = () => {
  const { clear } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  return () => {
    authApi.logout().catch(() => null)
    clear()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    qc.clear()
    router.push(ROUTES.AUTH.LOGIN)
  }
}
