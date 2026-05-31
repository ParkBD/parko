'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, CalendarCheck, TrendingUp, Clock } from 'lucide-react'
import { useMyLots } from '@/lib/hooks/useLots'
import { useOwnerBookings } from '@/lib/hooks/useBookings'
import { useAuthStore } from '@/lib/stores/auth.store'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsGrid } from '@/components/features/admin/StatsGrid'
import { BookingCard } from '@/components/features/booking/BookingCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { ROUTES } from '@/lib/constants/routes'

export default function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: lots } = useMyLots()
  const { data: bookings } = useOwnerBookings()

  const active = bookings?.filter((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED') ?? []
  const pending = lots?.filter((l) => l.status === 'PENDING') ?? []

  const stats = [
    { label: 'My Lots',    value: lots?.length ?? 0,    icon: MapPin,        color: 'blue' as const },
    { label: 'Active',     value: active.length,         icon: Clock,         color: 'green' as const },
    { label: 'All Bookings', value: bookings?.length ?? 0, icon: CalendarCheck, color: 'neutral' as const },
    { label: 'Pending',    value: pending.length,         icon: TrendingUp,    color: 'amber' as const },
  ]

  return (
    <motion.div variants={staggerContainer()} initial="initial" animate="animate" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          title={`Dashboard`}
          description={`Welcome back, ${user?.name?.split(' ')[0]}.`}
          action={<Button asChild><Link href={ROUTES.OWNER.LOT_NEW}>+ Add lot</Link></Button>}
        />
      </motion.div>
      <motion.div variants={fadeUp}><StatsGrid stats={stats} /></motion.div>
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Recent Bookings</h2>
          <Button variant="ghost" size="sm" asChild><Link href={ROUTES.OWNER.BOOKINGS}>View all</Link></Button>
        </div>
        {active.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No active bookings" />
        ) : (
          <div className="space-y-3">
            {active.slice(0, 5).map((b) => <BookingCard key={b.id} booking={b} role="owner" />)}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
