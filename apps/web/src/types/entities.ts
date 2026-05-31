export type UserRole = 'DRIVER' | 'OWNER' | 'ADMIN' | 'SECURITY'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: UserRole
  isVerified: boolean
  createdAt: string
}

export type LotType = 'OPEN' | 'COVERED' | 'GARAGE' | 'VALET'
export type LotStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED'

export interface ParkingLot {
  id: string
  ownerId: string
  owner?: User
  title: string
  description?: string
  address: string
  city: string
  latitude: number
  longitude: number
  type: LotType
  totalSpots: number
  availableSpots: number
  pricePerHour: number
  images: string[]
  amenities: string[]
  status: LotStatus
  rating?: number
  reviewCount?: number
  createdAt: string
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface Booking {
  id: string
  driverId: string
  driver?: User
  lotId: string
  lot?: ParkingLot
  startTime: string
  endTime: string
  totalHours: number
  totalAmount: number
  status: BookingStatus
  checkinCode: string
  checkoutCode: string
  checkedInAt?: string
  checkedOutAt?: string
  createdAt: string
}

export type TransactionType = 'CREDIT' | 'DEBIT' | 'TOPUP' | 'WITHDRAWAL' | 'REFUND'

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  description: string
  bookingId?: string
  createdAt: string
}

export interface Wallet {
  id: string
  userId: string
  balance: number
  transactions: Transaction[]
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: string
  bookingId: string
  booking?: Booking
  amount: number
  status: PaymentStatus
  gateway: string
  transactionId?: string
  createdAt: string
}

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'

export interface Withdrawal {
  id: string
  ownerId: string
  owner?: User
  amount: number
  bankAccount: string
  status: WithdrawalStatus
  createdAt: string
}

export interface AnalyticsSummary {
  totalUsers: number
  totalLots: number
  totalBookings: number
  totalRevenue: number
  activeBookings: number
  pendingLots: number
  pendingWithdrawals: number
  bookingTrend: { date: string; count: number }[]
  revenueTrend: { date: string; amount: number }[]
}
