import { AuthGuard } from '@/components/providers/AuthGuard'
import { OwnerSidebar } from '@/components/layout/OwnerSidebar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="OWNER">
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <OwnerSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
