'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { MapPin, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useLogout } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/auth.store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  items: NavItem[]
  title?: string
}

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-neutral-100 bg-white">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-neutral-100">
        <MapPin className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-neutral-900">Parko</span>
        {title && <span className="text-xs text-neutral-400 ml-1">· {title}</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-neutral-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn('relative z-10 h-4 w-4 shrink-0', active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600')} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-neutral-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="text-xs">{user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-900 truncate">{user?.name}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="shrink-0 text-neutral-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
