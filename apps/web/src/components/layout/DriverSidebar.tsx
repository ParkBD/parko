import { Sidebar } from './Sidebar'
import { ROUTES } from '@/lib/constants/routes'
import { LayoutDashboard, CalendarCheck, Wallet, User } from 'lucide-react'

const items = [
  { label: 'Dashboard', href: ROUTES.DRIVER.DASHBOARD, icon: LayoutDashboard },
  { label: 'Bookings',  href: ROUTES.DRIVER.BOOKINGS,  icon: CalendarCheck },
  { label: 'Wallet',    href: ROUTES.DRIVER.WALLET,    icon: Wallet },
  { label: 'Profile',   href: ROUTES.DRIVER.PROFILE,   icon: User },
]

export function DriverSidebar() {
  return <Sidebar items={items} title="Driver" />
}
