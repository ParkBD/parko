import { get, post } from './client'
import type { Wallet, Transaction } from '@/types/entities'

export const walletApi = {
  get:          () => get<Wallet>('/wallet'),
  transactions: (params?: { page?: number; limit?: number }) =>
    get<Transaction[]>('/wallet/transactions', { params }),
  topup:        (amount: number) => post('/wallet/topup', { amount }),
}
