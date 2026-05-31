import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'

interface PriceTagProps {
  amount: number
  per?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PriceTag({ amount, per = 'hr', size = 'md', className }: PriceTagProps) {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }
  return (
    <span className={cn('font-semibold text-neutral-900', sizes[size], className)}>
      {formatCurrency(amount)}
      <span className="text-xs font-normal text-neutral-400 ml-0.5">/{per}</span>
    </span>
  )
}
