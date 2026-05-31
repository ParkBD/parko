import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { staggerContainer, fadeUp } from '@/lib/utils/motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface StatCard {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  color?: 'blue' | 'green' | 'amber' | 'neutral'
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600' },
  green:   { bg: 'bg-green-50',   icon: 'text-green-600' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600' },
  neutral: { bg: 'bg-neutral-100', icon: 'text-neutral-600' },
}

export function StatsGrid({ stats }: { stats: StatCard[] }) {
  return (
    <motion.div
      variants={staggerContainer()}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {stats.map((stat) => {
        const colors = COLOR_MAP[stat.color ?? 'neutral']
        return (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">{stat.value}</p>
                    {stat.trend && (
                      <p className={cn('mt-1 text-xs font-medium', stat.trend.positive ? 'text-green-600' : 'text-red-500')}>
                        {stat.trend.positive ? '+' : ''}{stat.trend.value}% vs last month
                      </p>
                    )}
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bg)}>
                    <stat.icon className={cn('h-5 w-5', colors.icon)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
