'use client'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useWallet, useTransactions } from '@/lib/hooks/useWallet'
import { PageHeader } from '@/components/common/PageHeader'
import { RevenueChart } from '@/components/features/earnings/RevenueChart'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fadeUp, staggerContainer } from '@/lib/utils/motion'
import { formatCurrency, formatRelative } from '@/lib/utils/format'

export default function OwnerEarningsPage() {
  const { data: wallet, isLoading } = useWallet()
  const { data: transactions } = useTransactions()

  // Build revenue trend from credit transactions
  const credits = transactions?.filter((t) => t.type === 'CREDIT') ?? []

  if (isLoading) return <PageLoader />

  return (
    <motion.div variants={staggerContainer()} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp}>
        <PageHeader title="Earnings" description="Your revenue from parking lots." />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Available Balance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
              {formatCurrency(wallet?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {credits.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader><CardTitle>Revenue (last 30 days)</CardTitle></CardHeader>
            <CardContent>
              <RevenueChart data={credits.slice(-30).map((t) => ({ date: t.createdAt, amount: t.amount }))} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Transaction History</h2>
        {!transactions?.length ? (
          <EmptyState icon={TrendingUp} title="No transactions yet" />
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-neutral-50">
                <div>
                  <p className="text-sm text-neutral-900">{t.description}</p>
                  <p className="text-xs text-neutral-400">{formatRelative(t.createdAt)}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'CREDIT' ? 'text-green-600' : 'text-neutral-900'}`}>
                  {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
