'use client'
import { motion } from 'framer-motion'
import { MapPin, Check, X } from 'lucide-react'
import { useLots, useApproveLot } from '@/lib/hooks/useLots'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriceTag } from '@/components/common/PriceTag'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fadeUp, staggerContainer } from '@/lib/utils/motion'

export default function AdminLotsPage() {
  const { data: lots, isLoading } = useLots()
  const approve = useApproveLot()

  return (
    <div>
      <PageHeader title="Lots" description={`${lots?.length ?? 0} total`} />
      {isLoading ? <PageLoader /> : !lots?.length ? (
        <EmptyState icon={MapPin} title="No lots" />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="space-y-3">
          {lots.map((lot) => (
            <motion.div key={lot.id} variants={fadeUp}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{lot.title}</p>
                        <StatusBadge status={lot.status} />
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{lot.address}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                        <span>{lot.totalSpots} spots</span>
                        <PriceTag amount={lot.pricePerHour} size="sm" />
                        <span>{lot.type}</span>
                      </div>
                    </div>
                    {lot.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="icon-sm" variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => approve.mutate(lot.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
