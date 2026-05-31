import { Sidebar } from './Sidebar'
import { ROUTES } from '@/lib/constants/routes'
import { LayoutDashboard, MapPin, CalendarCheck, TrendingUp, User } from 'lucide-react'

const items = [
  { label: 'Dashboard', href: ROUTES.OWNER.DASHBOARD, icon: LayoutDashboard },
  { label: 'My Lots',   href: ROUTES.OWNER.LOTS,      icon: MapPin },
  { label: 'Bookings',  href: ROUTES.OWNER.BOOKINGS,  icon: CalendarCheck },
  { label: 'Earnings',  href: ROUTES.OWNER.EARNINGS,  icon: TrendingUp },
  { label: 'Profile',   href: ROUTES.OWNER.PROFILE,   icon: User },
]

export function OwnerSidebar() {
  return <Sidebar items={items} title="Owner" />
}
