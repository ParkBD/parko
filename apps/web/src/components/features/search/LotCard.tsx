'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Star, MapPin, Car } from 'lucide-react'
import { cardHover } from '@/lib/utils/motion'
import { formatCurrency } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { ROUTES } from '@/lib/constants/routes'
import type { ParkingLot } from '@/types/entities'

const LOT_TYPE_LABEL: Record<string, string> = {
  OPEN: 'Open', COVERED: 'Covered', GARAGE: 'Garage', VALET: 'Valet',
}

export function LotCard({ lot }: { lot: ParkingLot }) {
  return (
    <motion.div {...cardHover}>
      <Link href={ROUTES.LOT(lot.id)} className="group block overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card hover:border-neutral-200 transition-colors">
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
          <Image
            src={lot.images[0] ?? '/images/lot-placeholder.jpg'}
            alt={lot.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-neutral-700">
              {LOT_TYPE_LABEL[lot.type]}
            </Badge>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 truncate">{lot.title}</h3>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{lot.address}</span>
              </div>
            </div>
            {lot.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-neutral-700">{lot.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Car className="h-3.5 w-3.5" />
              <span>{lot.availableSpots} spots</span>
            </div>
            <div className="text-sm font-semibold text-neutral-900">
              {formatCurrency(lot.pricePerHour)}
              <span className="text-xs font-normal text-neutral-400">/hr</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
