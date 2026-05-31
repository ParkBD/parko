import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { TopupService, validateIpnHash } from './topup.service';

const mockPrisma = {
  wallet: { findUnique: jest.fn() },
  paymentGatewayTxn: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  walletTransaction: { create: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

const mockHttp = { post: jest.fn(), get: jest.fn() };

const mockConfig = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      SSLCOMMERZ_STORE_ID: 'teststore',
      SSLCOMMERZ_STORE_PASSWORD: 'testpass',
      SSLCOMMERZ_IS_SANDBOX: 'true',
      FRONTEND_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:4000',
    };
    return cfg[key];
  }),
};

// ── validateIpnHash ──────────────────────────────────────────────────────────

describe('validateIpnHash', () => {
  it('returns false when verify_sign missing', () => {
    expect(validateIpnHash({}, 'secret')).toBe(false);
  });

  it('validates correct hash', () => {
    const storePasswd = 'testpass';
    const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

    const params: Record<string, string> = {
      tran_id: 'PARKO-123',
      amount: '500.00',
      status: 'VALID',
    };
    // build expected hash the same way the service does
    const withPasswd = { ...params, store_passwd: md5(storePasswd) };
    const hashStr = Object.keys(withPasswd).sort().map((k) => `${k}=${withPasswd[k]}`).join('&');
    const expectedHash = md5(hashStr);

    const body = { ...params, verify_sign: expectedHash };
    expect(validateIpnHash(body, storePasswd)).toBe(true);
  });

  it('returns false for tampered amount', () => {
    const storePasswd = 'testpass';
    const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

    const params: Record<string, string> = { tran_id: 'X', amount: '500.00', status: 'VALID' };
    const withPasswd = { ...params, store_passwd: md5(storePasswd) };
    const hashStr = Object.keys(withPasswd).sort().map((k) => `${k}=${withPasswd[k]}`).join('&');
    const hash = md5(hashStr);

    // tamper amount after hash computed
    const body = { ...params, amount: '1.00', verify_sign: hash };
    expect(validateIpnHash(body, storePasswd)).toBe(false);
  });
});

// ── TopupService ─────────────────────────────────────────────────────────────

describe('TopupService.processIpn', () => {
  let service: TopupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TopupService(mockPrisma as any, mockHttp as any, mockConfig as any);
  });

  it('is idempotent: skips already-SUCCESS txn', async () => {
    mockPrisma.paymentGatewayTxn.findUnique.mockResolvedValue({
      id: 'pgTxn1', status: 'SUCCESS', amount: 500, coinsToCredit: 500,
    });
    // processIpn should return early without crediting wallet
    const result = await service.processIpn({ tran_id: 'PARKO-123', status: 'VALID', amount: '500.00', verify_sign: 'ignored' });
    expect(result).toMatchObject({ skipped: true });
    expect(mockPrisma.wallet.findUnique).not.toHaveBeenCalled();
  });

  it('marks txn FAILED when SSLCommerz status is FAILED', async () => {
    mockPrisma.paymentGatewayTxn.findUnique.mockResolvedValue({
      id: 'pgTxn1', status: 'INITIATED', amount: 500, coinsToCredit: 500, walletId: 'w1',
    });
    mockPrisma.paymentGatewayTxn.update.mockResolvedValue({});

    const result = await service.processIpn({ tran_id: 'PARKO-123', status: 'FAILED', amount: '500.00', verify_sign: 'x' });
    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.paymentGatewayTxn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });
});
