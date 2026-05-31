'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth.store'
import { PageLoader } from '@/components/common/LoadingSpinner'
import type { UserRole } from '@/types/entities'

interface AuthGuardProps {
  children: React.ReactNode
  role: UserRole | UserRole[]
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const router = useRouter()

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(user.role)) {
      router.push('/')
    }
  }, [user, isHydrated, role, router])

  if (!isHydrated) return <PageLoader />
  if (!user) return <PageLoader />

  return <>{children}</>
}
