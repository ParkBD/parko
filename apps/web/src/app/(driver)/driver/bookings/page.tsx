'use client'
import { motion } from 'framer-motion'
import { CalendarCheck } from 'lucide-react'
import { useBookings } from '@/lib/hooks/useBookings'
import { PageHeader } from '@/components/common/PageHeader'
import { BookingCard } from '@/components/features/booking/BookingCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'

export default function DriverBookingsPage() {
  const { data: bookings, isLoading } = useBookings()

  return (
    <div>
      <PageHeader title="My Bookings" description="All your parking bookings." />
      {isLoading ? <PageLoader /> : !bookings?.length ? (
        <EmptyState icon={CalendarCheck} title="No bookings yet" description="Your bookings will appear here." />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="space-y-3">
          {bookings.map((b) => (
            <motion.div key={b.id} variants={fadeUp}>
              <BookingCard booking={b} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
