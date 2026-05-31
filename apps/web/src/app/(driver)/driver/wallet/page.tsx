'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt } from 'lucide-react'
import { useWallet, useTransactions } from '@/lib/hooks/useWallet'
import { PageHeader } from '@/components/common/PageHeader'
import { WalletCard } from '@/components/features/wallet/WalletCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { formatCurrency, formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export default function DriverWalletPage() {
  const [showTopup, setShowTopup] = useState(false)
  const { data: wallet, isLoading } = useWallet()
  const { data: transactions } = useTransactions()

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" />
      <WalletCard balance={wallet?.balance ?? 0} onTopup={() => setShowTopup(true)} />

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Transactions</h2>
        {!transactions?.length ? (
          <EmptyState icon={Receipt} title="No transactions" />
        ) : (
          <motion.div variants={staggerContainer(0.03)} initial="initial" animate="animate" className="space-y-1">
            {transactions.map((t) => (
              <motion.div
                key={t.id}
                variants={fadeUp}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div>
                  <p className="text-sm text-neutral-900">{t.description}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{formatRelative(t.createdAt)}</p>
                </div>
                <span className={cn('text-sm font-semibold', t.type === 'CREDIT' || t.type === 'TOPUP' || t.type === 'REFUND' ? 'text-green-600' : 'text-neutral-900')}>
                  {t.type === 'CREDIT' || t.type === 'TOPUP' || t.type === 'REFUND' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
