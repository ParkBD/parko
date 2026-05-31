'use client'
import { motion } from 'framer-motion'
import { ArrowDownToLine, Check, X } from 'lucide-react'
import { useAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal } from '@/lib/hooks/useAdmin'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fadeUp, staggerContainer } from '@/lib/utils/motion'
import { formatCurrency, formatRelative } from '@/lib/utils/format'

export default function AdminWithdrawalsPage() {
  const { data: withdrawals, isLoading } = useAdminWithdrawals()
  const approve = useApproveWithdrawal()
  const reject  = useRejectWithdrawal()

  return (
    <div>
      <PageHeader title="Withdrawals" />
      {isLoading ? <PageLoader /> : !withdrawals?.length ? (
        <EmptyState icon={ArrowDownToLine} title="No withdrawal requests" />
      ) : (
        <motion.div variants={staggerContainer(0.04)} initial="initial" animate="animate" className="space-y-3">
          {withdrawals.map((w) => (
            <motion.div key={w.id} variants={fadeUp}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{formatCurrency(w.amount)}</p>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">Bank: {w.bankAccount}</p>
                      <p className="text-xs text-neutral-400">{formatRelative(w.createdAt)}</p>
                    </div>
                    {w.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="icon-sm" variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => approve.mutate(w.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => reject.mutate(w.id)}>
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
