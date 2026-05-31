'use client'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/search.store'
import { useSearch } from '@/lib/hooks/useSearch'
import { LotCard } from '@/components/features/search/LotCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'

export default function SearchPage() {
  const { coords, dateRange, filters } = useSearchStore()

  const { data: lots, isLoading } = useSearch(
    {
      lat: coords?.lat,
      lng: coords?.lng,
      start: dateRange?.start?.toISOString(),
      end: dateRange?.end?.toISOString(),
      type: filters.type,
      maxPrice: filters.maxPrice,
    },
    !!(coords?.lat && coords?.lng),
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-6">
        Find parking
      </h1>

      {isLoading ? (
        <PageLoader />
      ) : !lots?.length ? (
        <EmptyState
          icon={Search}
          title="No parking found"
          description="Try adjusting your location or date range."
        />
      ) : (
        <motion.div
          variants={staggerContainer(0.04)}
          initial="initial"
          animate="animate"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {lots.map((lot) => (
            <motion.div key={lot.id} variants={fadeUp}>
              <LotCard lot={lot} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
