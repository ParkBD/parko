import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            Parko
          </div>
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Parko. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-neutral-500">
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-neutral-900 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-neutral-900 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
