'use client'
import { motion } from 'framer-motion'
import { Wallet, Plus } from 'lucide-react'
import { fadeUp } from '@/lib/utils/motion'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'

interface WalletCardProps {
  balance: number
  onTopup: () => void
}

export function WalletCard({ balance, onTopup }: WalletCardProps) {
  return (
    <motion.div {...fadeUp}>
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-6 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium">
            <Wallet className="h-4 w-4" />
            Wallet Balance
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCurrency(balance)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:text-white"
            onClick={onTopup}
          >
            <Plus className="h-3.5 w-3.5" />
            Top up
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
