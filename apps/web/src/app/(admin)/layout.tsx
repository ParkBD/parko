import { AuthGuard } from '@/components/providers/AuthGuard'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role={['ADMIN', 'SECURITY']}>
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
