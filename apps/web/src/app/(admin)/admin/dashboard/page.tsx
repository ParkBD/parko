'use client'
import { motion } from 'framer-motion'
import { Users, MapPin, CalendarCheck, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { useAnalytics } from '@/lib/hooks/useAdmin'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsGrid } from '@/components/features/admin/StatsGrid'
import { RevenueChart } from '@/components/features/earnings/RevenueChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { formatCurrency } from '@/lib/utils/format'

export default function AdminDashboardPage() {
  const { data: analytics, isLoading } = useAnalytics()

  if (isLoading) return <PageLoader />

  const stats = [
    { label: 'Total Users',   value: analytics?.totalUsers ?? 0,     icon: Users,        color: 'blue' as const },
    { label: 'Lots',          value: analytics?.totalLots ?? 0,      icon: MapPin,        color: 'neutral' as const },
    { label: 'GMV',           value: formatCurrency(analytics?.totalRevenue ?? 0), icon: TrendingUp, color: 'green' as const },
    { label: 'Active Now',    value: analytics?.activeBookings ?? 0,  icon: Clock,         color: 'amber' as const },
  ]

  const pending = [
    { label: 'Lots pending approval', value: analytics?.pendingLots ?? 0,        icon: MapPin,        color: 'amber' as const },
    { label: 'Pending withdrawals',   value: analytics?.pendingWithdrawals ?? 0, icon: AlertCircle,   color: 'danger' as const },
  ]

  return (
    <motion.div variants={staggerContainer()} initial="initial" animate="animate" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader title="Dashboard" description="Platform overview" />
      </motion.div>

      <motion.div variants={fadeUp}><StatsGrid stats={stats} /></motion.div>

      {analytics?.revenueTrend && analytics.revenueTrend.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <RevenueChart data={analytics.revenueTrend} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Pending Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {pending.map((p) => (
            <div key={p.label} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <p.icon className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-sm text-neutral-700">{p.label}</p>
              </div>
              <span className="text-lg font-semibold text-neutral-900">{p.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
