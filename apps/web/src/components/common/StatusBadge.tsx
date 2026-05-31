import { Badge } from '@/components/ui/badge'
import type { BookingStatus, LotStatus, PaymentStatus, WithdrawalStatus } from '@/types/entities'

type Status = BookingStatus | LotStatus | PaymentStatus | WithdrawalStatus

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'blue' | 'secondary' }> = {
  ACTIVE:     { label: 'Active',     variant: 'success' },
  CONFIRMED:  { label: 'Confirmed',  variant: 'blue' },
  COMPLETED:  { label: 'Completed',  variant: 'secondary' },
  PENDING:    { label: 'Pending',    variant: 'warning' },
  CANCELLED:  { label: 'Cancelled',  variant: 'danger' },
  REJECTED:   { label: 'Rejected',   variant: 'danger' },
  INACTIVE:   { label: 'Inactive',   variant: 'secondary' },
  SUCCESS:    { label: 'Success',    variant: 'success' },
  FAILED:     { label: 'Failed',     variant: 'danger' },
  REFUNDED:   { label: 'Refunded',   variant: 'secondary' },
  APPROVED:   { label: 'Approved',   variant: 'success' },
  PROCESSED:  { label: 'Processed',  variant: 'success' },
}

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_MAP[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
