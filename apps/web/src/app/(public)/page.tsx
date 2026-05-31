'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Search, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fadeUp, staggerContainer } from '@/lib/utils/motion'
import { ROUTES } from '@/lib/constants/routes'

const FEATURES = [
  { icon: Search,  title: 'Find Instantly', description: 'Search parking near you by location, date, and price.' },
  { icon: Shield,  title: 'Secure Booking', description: 'QR-code check-in with real-time availability.' },
  { icon: Zap,     title: 'Earn Passively', description: 'List your parking space and earn while you sleep.' },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <motion.section
        variants={staggerContainer(0.1)}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <motion.div variants={fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600">
          <MapPin className="h-3.5 w-3.5" /> Airbnb for parking spaces
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl max-w-2xl">
          Park smarter,<br />earn more.
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-4 max-w-lg text-lg text-neutral-500">
          Find and book parking spaces near you. Or list your space and earn passive income.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button size="lg" asChild>
            <Link href={ROUTES.SEARCH}>Find parking</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={ROUTES.AUTH.REGISTER}>List your space</Link>
          </Button>
        </motion.div>
      </motion.section>

      <motion.section
        variants={staggerContainer(0.08)}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-6 sm:grid-cols-3 pb-24"
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} variants={fadeUp} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 mb-4">
              <f.icon className="h-5 w-5 text-neutral-700" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">{f.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{f.description}</p>
          </motion.div>
        ))}
      </motion.section>
    </div>
  )
}
