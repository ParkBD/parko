import { CommissionService } from './commission.service';

describe('CommissionService', () => {
  let service: CommissionService;

  beforeEach(() => {
    service = new CommissionService();
  });

  it('1000 coins → fee=150, owner=850', () => {
    expect(service.compute(1000)).toEqual({ platformFee: 150, ownerEarnings: 850 });
  });

  it('100 coins → fee=15, owner=85', () => {
    expect(service.compute(100)).toEqual({ platformFee: 15, ownerEarnings: 85 });
  });

  it('7 coins → fee=1 (floor(1.05)), owner=6', () => {
    expect(service.compute(7)).toEqual({ platformFee: 1, ownerEarnings: 6 });
  });

  it('1 coin → fee=0 (floor(0.15)), owner=1', () => {
    expect(service.compute(1)).toEqual({ platformFee: 0, ownerEarnings: 1 });
  });

  it('0 coins → fee=0, owner=0', () => {
    expect(service.compute(0)).toEqual({ platformFee: 0, ownerEarnings: 0 });
  });

  it('platformFee + ownerEarnings always equals input', () => {
    [1, 7, 13, 100, 333, 1000, 9999].forEach((coins) => {
      const { platformFee, ownerEarnings } = service.compute(coins);
      expect(platformFee + ownerEarnings).toBe(coins);
    });
  });
});
