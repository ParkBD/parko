'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Clock, CalendarCheck } from 'lucide-react'
import { fadeUp } from '@/lib/utils/motion'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils/format'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES } from '@/lib/constants/routes'
import type { Booking } from '@/types/entities'

export function BookingCard({ booking, role = 'driver' }: { booking: Booking; role?: 'driver' | 'owner' }) {
  const href = role === 'driver' ? ROUTES.DRIVER.BOOKING(booking.id) : '#'

  return (
    <motion.div {...fadeUp}>
      <Link href={href}>
        <Card className="hover:border-neutral-200 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {booking.lot?.title ?? 'Parking Lot'}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{booking.lot?.address}</span>
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>{formatDateTime(booking.startTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(booking.startTime, booking.endTime)}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                #{booking.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-neutral-900">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
