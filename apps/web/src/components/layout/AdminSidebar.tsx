import { Sidebar } from './Sidebar'
import { ROUTES } from '@/lib/constants/routes'
import { LayoutDashboard, Users, MapPin, CalendarCheck, CreditCard, ArrowDownToLine, BarChart3 } from 'lucide-react'

const items = [
  { label: 'Dashboard',   href: ROUTES.ADMIN.DASHBOARD,   icon: LayoutDashboard },
  { label: 'Users',       href: ROUTES.ADMIN.USERS,       icon: Users },
  { label: 'Lots',        href: ROUTES.ADMIN.LOTS,        icon: MapPin },
  { label: 'Bookings',    href: ROUTES.ADMIN.BOOKINGS,    icon: CalendarCheck },
  { label: 'Payments',    href: ROUTES.ADMIN.PAYMENTS,    icon: CreditCard },
  { label: 'Withdrawals', href: ROUTES.ADMIN.WITHDRAWALS, icon: ArrowDownToLine },
  { label: 'Analytics',   href: ROUTES.ADMIN.ANALYTICS,   icon: BarChart3 },
]

export function AdminSidebar() {
  return <Sidebar items={items} title="Admin" />
}
