import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
    baseUrl: process.env.SSLCOMMERZ_BASE_URL ?? 'https://sandbox.sslcommerz.com',
    successUrl: process.env.SSLCOMMERZ_SUCCESS_URL,
    failUrl: process.env.SSLCOMMERZ_FAIL_URL,
    cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL,
    isLive: process.env.NODE_ENV === 'production',
  },
}));
