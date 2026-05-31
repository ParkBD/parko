import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns'

export const formatCurrency = (amount: number, currency = 'BDT') =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

export const formatDate = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy')

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy · h:mm a')

export const formatTime = (date: string | Date) =>
  format(new Date(date), 'h:mm a')

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true })

export const formatDuration = (start: string | Date, end: string | Date) => {
  const hours = differenceInHours(new Date(end), new Date(start))
  const mins = differenceInMinutes(new Date(end), new Date(start)) % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export const formatBookingCode = (code: string) =>
  code.toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1)

export const truncate = (str: string, n: number) =>
  str.length > n ? `${str.slice(0, n)}…` : str
