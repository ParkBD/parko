'use client'
import { motion } from 'framer-motion'
import { Users, MoreHorizontal } from 'lucide-react'
import { useAdminUsers, useBanUser } from '@/lib/hooks/useAdmin'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { fadeUp, staggerContainer } from '@/lib/utils/motion'
import { formatDate } from '@/lib/utils/format'

const ROLE_VARIANT: Record<string, 'blue' | 'success' | 'warning' | 'secondary'> = {
  DRIVER: 'blue', OWNER: 'success', ADMIN: 'warning', SECURITY: 'secondary',
}

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers()
  const ban = useBanUser()

  return (
    <div>
      <PageHeader title="Users" description={`${users?.length ?? 0} total`} />
      {isLoading ? <PageLoader /> : !users?.length ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <motion.div variants={staggerContainer(0.03)} initial="initial" animate="animate" className="space-y-1">
          {users.map((user) => (
            <motion.div key={user.id} variants={fadeUp}
              className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-neutral-50 transition-colors"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                <p className="text-xs text-neutral-400">{user.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[user.role] ?? 'secondary'}>{user.role}</Badge>
              <span className="text-xs text-neutral-400 hidden sm:block">{formatDate(user.createdAt)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-600" onClick={() => ban.mutate(user.id)}>
                    Ban user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
