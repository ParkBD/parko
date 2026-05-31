import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';

const mockTx = {
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  walletTransaction: { create: jest.fn() },
  withdrawalRequest: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((fn) => fn(mockTx)),
  wallet: { findUnique: jest.fn() },
  withdrawalRequest: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
};

const dto = {
  amount: 1000,
  method: 'BKASH',
  accountDetails: { accountNumber: '01700000000', accountName: 'Test User' },
};

describe('WithdrawalService', () => {
  let service: WithdrawalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WithdrawalService(mockPrisma as any);
  });

  describe('create', () => {
    it('throws NotFoundException when wallet missing', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(null);
      await expect(service.create('user1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when insufficient available balance', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({
        id: 'w1', coinBalance: 400, escrowBalance: 0, pendingWithdraw: 0,
      });
      await expect(service.create('user1', { ...dto, amount: 500 })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when already has PENDING request', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({
        id: 'w1', coinBalance: 2000, escrowBalance: 0, pendingWithdraw: 0,
      });
      mockTx.withdrawalRequest.findFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' });
      await expect(service.create('user1', dto)).rejects.toThrow(BadRequestException);
    });

    it('creates request and reserves coins', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({
        id: 'w1', coinBalance: 2000, escrowBalance: 0, pendingWithdraw: 0,
      });
      mockTx.withdrawalRequest.findFirst.mockResolvedValue(null);
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.withdrawalRequest.create.mockResolvedValue({ id: 'wr1', amount: 1000, status: 'PENDING' });

      const result = await service.create('user1', dto);

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { coinBalance: { decrement: 1000 }, pendingWithdraw: { increment: 1000 } },
      });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('cancel', () => {
    it('throws NotFoundException when request not found', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue(null);
      await expect(service.cancel('user1', 'wr1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not owner', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue({ id: 'wr1', userId: 'other', status: 'PENDING', amount: 500, walletId: 'w1' });
      await expect(service.cancel('user1', 'wr1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when not PENDING', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue({ id: 'wr1', userId: 'user1', status: 'APPROVED', amount: 500, walletId: 'w1' });
      await expect(service.cancel('user1', 'wr1')).rejects.toThrow(BadRequestException);
    });

    it('refunds pendingWithdraw back to coinBalance', async () => {
      mockTx.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'wr1', userId: 'user1', status: 'PENDING', amount: 1000, walletId: 'w1',
      });
      mockTx.wallet.findUnique.mockResolvedValue({ id: 'w1', coinBalance: 0, pendingWithdraw: 1000 });
      mockTx.wallet.update.mockResolvedValue({});
      mockTx.walletTransaction.create.mockResolvedValue({});
      mockTx.withdrawalRequest.update.mockResolvedValue({ status: 'REJECTED' });

      await service.cancel('user1', 'wr1');

      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { coinBalance: { increment: 1000 }, pendingWithdraw: { decrement: 1000 } },
      });
    });
  });
});
