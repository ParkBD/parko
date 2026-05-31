'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarCheck, Wallet, MapPin, Clock } from 'lucide-react'
import { useBookings } from '@/lib/hooks/useBookings'
import { useWallet } from '@/lib/hooks/useWallet'
import { useAuthStore } from '@/lib/stores/auth.store'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsGrid } from '@/components/features/admin/StatsGrid'
import { BookingCard } from '@/components/features/booking/BookingCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { formatCurrency } from '@/lib/utils/format'
import { ROUTES } from '@/lib/constants/routes'

export default function DriverDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: bookings } = useBookings()
  const { data: wallet } = useWallet()

  const active    = bookings?.filter((b) => b.status === 'ACTIVE') ?? []
  const upcoming  = bookings?.filter((b) => b.status === 'CONFIRMED').slice(0, 3) ?? []

  const stats = [
    { label: 'Active',    value: active.length,    icon: Clock,         color: 'green' as const },
    { label: 'All Trips', value: bookings?.length ?? 0, icon: CalendarCheck, color: 'blue' as const },
    { label: 'Balance',   value: formatCurrency(wallet?.balance ?? 0), icon: Wallet, color: 'amber' as const },
    { label: 'Saved Lots', value: '—',             icon: MapPin,        color: 'neutral' as const },
  ]

  return (
    <motion.div variants={staggerContainer()} initial="initial" animate="animate" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          title={`Good ${getGreeting()}, ${user?.name?.split(' ')[0]}.`}
          description="Here's your parking overview."
          action={<Button asChild><Link href={ROUTES.SEARCH}>Find parking</Link></Button>}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <StatsGrid stats={stats} />
      </motion.div>

      {active.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Active Booking</h2>
          <BookingCard booking={active[0]} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Upcoming</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.DRIVER.BOOKINGS}>View all</Link>
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No upcoming bookings" description="Find and book a parking space to get started." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
