import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { CommissionService } from '../commission/commission.service';

const mockTx = {
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  walletTransaction: { create: jest.fn() },
  escrow: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockTx)),
  escrow: { findUnique: jest.fn() },
};

describe('EscrowService', () => {
  let service: EscrowService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EscrowService(mockPrisma as any, new CommissionService());
  });

  // ── holdForBooking ──────────────────────────────────────────────────────────

  describe('holdForBooking', () => {
    it('throws NotFoundException when driver wallet missing', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(null);
      await expect(
        service.holdForBooking('b1', 'driver1', 'owner1', 500),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when insufficient balance', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({
        id: 'w1', coinBalance: 200, escrowBalance: 0,
      });
      await expect(
        service.holdForBooking('b1', 'driver1', 'owner1', 500),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates escrow with correct platformFee and ownerEarnings (1000 coins)', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({
        id: 'w1', coinBalance: 2000, escrowBalance: 0,
      });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.escrow.create.mockResolvedValue({
        totalCoins: 1000, platformFee: 150, ownerEarnings: 850,
      });

      const result = await service.holdForBooking('b1', 'driver1', 'owner1', 1000);

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: { coinBalance: { decrement: 1000 }, escrowBalance: { increment: 1000 } },
      });
      expect(mockTx.escrow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCoins: 1000,
            platformFee: 150,
            ownerEarnings: 850,
            status: 'HELD',
          }),
        }),
      );
      expect(result.platformFee).toBe(150);
      expect(result.ownerEarnings).toBe(850);
    });
  });

  // ── releaseOnComplete ───────────────────────────────────────────────────────

  describe('releaseOnComplete', () => {
    it('throws NotFoundException when escrow missing', async () => {
      mockTx.escrow.findUnique.mockResolvedValue(null);
      await expect(service.releaseOnComplete('b1', 800)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when escrow not HELD', async () => {
      mockTx.escrow.findUnique.mockResolvedValue({
        bookingId: 'b1', driverId: 'driver1', ownerId: 'owner1',
        totalCoins: 1000, status: 'RELEASED',
      });
      await expect(service.releaseOnComplete('b1', 1000)).rejects.toThrow(BadRequestException);
    });

    it('refunds driver overpayment and credits owner 85%', async () => {
      mockTx.escrow.findUnique.mockResolvedValue({
        bookingId: 'b1', driverId: 'driver1', ownerId: 'owner1',
        totalCoins: 1000, status: 'HELD',
      });
      // driver wallet
      mockTx.wallet.findUnique
        .mockResolvedValueOnce({ id: 'wDriver', coinBalance: 0, escrowBalance: 1000 })
        // owner wallet
        .mockResolvedValueOnce({ id: 'wOwner', coinBalance: 500 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.escrow.update.mockResolvedValue({ status: 'RELEASED' });

      await service.releaseOnComplete('b1', 800); // actual=800, held=1000 → refund 200

      // driver gets 200 refund
      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'driver1' },
          data: expect.objectContaining({
            escrowBalance: { decrement: 1000 },
            coinBalance: { increment: 200 },
          }),
        }),
      );
      // owner gets 85% of 800 = 680
      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'owner1' },
          data: expect.objectContaining({
            coinBalance: { increment: 680 },
          }),
        }),
      );
    });

    it('clears driver escrowBalance without refund when actual equals total', async () => {
      mockTx.escrow.findUnique.mockResolvedValue({
        bookingId: 'b1', driverId: 'driver1', ownerId: 'owner1',
        totalCoins: 500, status: 'HELD',
      });
      mockTx.wallet.findUnique
        .mockResolvedValueOnce({ id: 'wOwner', coinBalance: 0 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.escrow.update.mockResolvedValue({ status: 'RELEASED' });

      await service.releaseOnComplete('b1', 500);

      // driver update: only decrement escrowBalance, no coinBalance increment
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: { escrowBalance: { decrement: 500 } },
      });
    });
  });

  // ── refundOnCancel ──────────────────────────────────────────────────────────

  describe('refundOnCancel', () => {
    it('throws NotFoundException when escrow missing', async () => {
      mockTx.escrow.findUnique.mockResolvedValue(null);
      await expect(service.refundOnCancel('b1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when escrow already RELEASED', async () => {
      mockTx.escrow.findUnique.mockResolvedValue({ status: 'RELEASED', totalCoins: 500 });
      await expect(service.refundOnCancel('b1')).rejects.toThrow(BadRequestException);
    });

    it('refunds full amount to driver and sets status REFUNDED', async () => {
      mockTx.escrow.findUnique.mockResolvedValue({
        driverId: 'driver1', totalCoins: 300, status: 'HELD',
      });
      mockTx.wallet.findUnique.mockResolvedValue({ id: 'w1', coinBalance: 0, escrowBalance: 300 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.escrow.update.mockResolvedValue({ status: 'REFUNDED' });

      await service.refundOnCancel('b1');

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          coinBalance: { increment: 300 },
          escrowBalance: { decrement: 300 },
        },
      });
      expect(mockTx.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REFUNDED' }),
        }),
      );
    });
  });
});
