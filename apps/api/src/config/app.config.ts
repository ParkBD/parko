import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT ?? '10', 10),
  coinToBdtRate: parseFloat(process.env.COIN_TO_BDT_RATE ?? '1'),
}));
