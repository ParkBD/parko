import { Injectable } from '@nestjs/common';

export const PLATFORM_FEE_RATE = 0.15;

@Injectable()
export class CommissionService {
  compute(coins: number): { platformFee: number; ownerEarnings: number } {
    const platformFee = Math.floor(coins * PLATFORM_FEE_RATE);
    return { platformFee, ownerEarnings: coins - platformFee };
  }
}
