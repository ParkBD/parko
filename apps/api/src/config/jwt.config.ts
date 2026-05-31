import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'change_me_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh_in_production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
