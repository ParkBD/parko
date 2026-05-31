import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-neutral-900">
        <MapPin className="h-5 w-5 text-blue-600" />
        Parko
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-8 shadow-card">
        {children}
      </div>
    </div>
  )
}
