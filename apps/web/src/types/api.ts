export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

// Auth DTOs
export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  name: string
  email: string
  password: string
  phone?: string
  role?: 'DRIVER' | 'OWNER'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: import('./entities').User
}

// Booking DTOs
export interface CreateBookingDto {
  lotId: string
  startTime: string
  endTime: string
}

// Lot DTOs
export interface CreateLotDto {
  title: string
  description?: string
  address: string
  city: string
  latitude: number
  longitude: number
  type: import('./entities').LotType
  totalSpots: number
  pricePerHour: number
  images?: string[]
  amenities?: string[]
}

export interface UpdateLotDto extends Partial<CreateLotDto> {}

// Search params
export interface SearchParams {
  lat?: number
  lng?: number
  radius?: number
  start?: string
  end?: string
  type?: string
  maxPrice?: number
  page?: number
  limit?: number
}

// Withdrawal DTO
export interface CreateWithdrawalDto {
  amount: number
  bankAccount: string
}
