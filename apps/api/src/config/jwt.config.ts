import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'parknest-access-secret-change-in-prod',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'parknest-refresh-secret-change-in-prod',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
}));
