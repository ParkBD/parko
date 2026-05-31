'use client'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth.store'
import { ROUTES } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/lib/hooks/useAuth'
import { MapPin, LogOut, LayoutDashboard } from 'lucide-react'

export function PublicNav() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  const dashboardHref =
    user?.role === 'DRIVER' ? ROUTES.DRIVER.DASHBOARD :
    user?.role === 'OWNER'  ? ROUTES.OWNER.DASHBOARD  :
    user ? ROUTES.ADMIN.DASHBOARD : null

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.HOME} className="flex items-center gap-2 font-semibold text-neutral-900">
          <MapPin className="h-5 w-5 text-blue-600" />
          Parko
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                  <p className="text-xs text-neutral-400">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {dashboardHref && (
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.AUTH.LOGIN}>Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={ROUTES.AUTH.REGISTER}>Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
