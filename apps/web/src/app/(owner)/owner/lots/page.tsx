'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, Plus } from 'lucide-react'
import { useMyLots } from '@/lib/hooks/useLots'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriceTag } from '@/components/common/PriceTag'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { ROUTES } from '@/lib/constants/routes'

export default function OwnerLotsPage() {
  const { data: lots, isLoading } = useMyLots()

  return (
    <div>
      <PageHeader
        title="My Lots"
        action={<Button asChild><Link href={ROUTES.OWNER.LOT_NEW}><Plus className="h-4 w-4" /> Add lot</Link></Button>}
      />

      {isLoading ? <PageLoader /> : !lots?.length ? (
        <EmptyState
          icon={MapPin}
          title="No lots yet"
          description="List your first parking space to start earning."
          action={<Button asChild><Link href={ROUTES.OWNER.LOT_NEW}>Add your first lot</Link></Button>}
        />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="space-y-3">
          {lots.map((lot) => (
            <motion.div key={lot.id} variants={fadeUp}>
              <Link href={ROUTES.OWNER.LOT(lot.id)}>
                <Card className="hover:border-neutral-200 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        <Image src={lot.images[0] ?? '/images/lot-placeholder.jpg'} alt={lot.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-neutral-900 truncate">{lot.title}</p>
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{lot.address}</span>
                            </div>
                          </div>
                          <StatusBadge status={lot.status} />
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                          <span>{lot.totalSpots} spots</span>
                          <PriceTag amount={lot.pricePerHour} size="sm" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
