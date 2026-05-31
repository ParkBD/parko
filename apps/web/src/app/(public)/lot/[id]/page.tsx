'use client'
import { use } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, Star, Car, Shield } from 'lucide-react'
import { useLot } from '@/lib/hooks/useLots'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { PriceTag } from '@/components/common/PriceTag'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fadeUp } from '@/lib/utils/motion'

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: lot, isLoading } = useLot(id)

  if (isLoading) return <PageLoader />
  if (!lot) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <motion.div {...fadeUp}>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100">
              <Image src={lot.images[0] ?? '/images/lot-placeholder.jpg'} alt={lot.title} fill className="object-cover" />
            </div>

            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-900">{lot.title}</h1>
                  <div className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                    <MapPin className="h-4 w-4" />
                    {lot.address}, {lot.city}
                  </div>
                </div>
                {lot.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">{lot.rating.toFixed(1)}</span>
                    <span className="text-sm text-neutral-400">({lot.reviewCount})</span>
                  </div>
                )}
              </div>

              {lot.description && (
                <p className="mt-4 text-sm text-neutral-600 leading-relaxed">{lot.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {lot.amenities.map((a) => (
                  <Badge key={a} variant="secondary">{a}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <PriceTag amount={lot.pricePerHour} size="lg" />
                <div className="flex items-center gap-1 text-sm text-neutral-500">
                  <Car className="h-4 w-4" />
                  {lot.availableSpots} available
                </div>
              </div>

              <Button className="w-full" size="lg">Book now</Button>

              <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
                <Shield className="h-3.5 w-3.5" />
                Secure booking · Free cancellation
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
