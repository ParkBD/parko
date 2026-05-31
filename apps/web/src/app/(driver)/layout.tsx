import { AuthGuard } from '@/components/providers/AuthGuard'
import { DriverSidebar } from '@/components/layout/DriverSidebar'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="DRIVER">
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <DriverSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
