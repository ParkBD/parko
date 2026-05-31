import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminWithdrawalService } from './admin-withdrawal.service';

const mockTx = {
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  walletTransaction: { create: jest.fn() },
  withdrawalRequest: { findUnique: jest.fn(), update: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockTx)),
  withdrawalRequest: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
};

const pending = { id: 'wr1', userId: 'user1', walletId: 'w1', amount: 1000, status: 'PENDING' };
const approved = { ...pending, status: 'APPROVED' };

describe('AdminWithdrawalService', () => {
  let service: AdminWithdrawalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminWithdrawalService(mockPrisma as any);
  });

  // ── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('throws NotFoundException when not found', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(null);
      await expect(service.approve('admin1', 'wr1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when not PENDING', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(approved);
      await expect(service.approve('admin1', 'wr1')).rejects.toThrow(BadRequestException);
    });

    it('transitions PENDING → APPROVED', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(pending);
      mockTx.withdrawalRequest.update.mockResolvedValue({ ...pending, status: 'APPROVED' });
      const result = await service.approve('admin1', 'wr1');
      expect(mockTx.withdrawalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedBy: 'admin1' }) }),
      );
    });
  });

  // ── reject ────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('throws BadRequestException when COMPLETED', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue({ ...pending, status: 'COMPLETED' });
      await expect(service.reject('admin1', 'wr1', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('refunds coins on rejection', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(pending);
      mockTx.wallet.findUnique.mockResolvedValue({ id: 'w1', coinBalance: 0, pendingWithdraw: 1000 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.withdrawalRequest.update.mockResolvedValue({ ...pending, status: 'REJECTED' });

      await service.reject('admin1', 'wr1', 'Rejected by admin');

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { coinBalance: { increment: 1000 }, pendingWithdraw: { decrement: 1000 } },
      });
    });
  });

  // ── complete ──────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('throws BadRequestException when PENDING (must be APPROVED first)', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(pending);
      await expect(service.complete('admin1', 'wr1')).rejects.toThrow(BadRequestException);
    });

    it('finalises wallet on completion', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(approved);
      mockTx.wallet.findUnique.mockResolvedValue({ id: 'w1', pendingWithdraw: 1000 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.withdrawalRequest.update.mockResolvedValue({ ...approved, status: 'COMPLETED' });

      await service.complete('admin1', 'wr1');

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: {
          pendingWithdraw: { decrement: 1000 },
          totalWithdrawn: { increment: 1000 },
        },
      });
    });
  });
});
