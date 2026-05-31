'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const roleLinks: Record<string, { label: string; href: string }[]> = {
  DRIVER: [
    { label: 'Find Parking', href: '/parking/search' },
    { label: 'My Bookings', href: '/bookings' },
    { label: 'Wallet', href: '/wallet' },
  ],
  OWNER: [
    { label: 'My Listings', href: '/owner/lots' },
    { label: 'Bookings', href: '/owner/bookings' },
    { label: 'Earnings', href: '/owner/earnings' },
    { label: 'Wallet', href: '/wallet' },
  ],
  SECURITY: [
    { label: 'Check In', href: '/security/checkin' },
    { label: 'Check Out', href: '/security/checkout' },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Lots', href: '/admin/lots' },
    { label: 'Withdrawals', href: '/admin/withdrawals' },
  ],
};

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!user) return null;

  const links = roleLinks[user.role] ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">Parko</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.firstName} {user.lastName} · {user.role}
          </span>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">
          Welcome, {user.firstName}!
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <span className="font-semibold text-gray-800">{link.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
