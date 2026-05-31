import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RoleType } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const driverRole = await this.prisma.role.findUnique({ where: { name: RoleType.DRIVER } });
    if (!driverRole) throw new NotFoundException('Role configuration missing — run seed');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        status: 'PENDING_VERIFICATION',
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
        wallet: { create: {} },
        roles: {
          create: { roleId: driverRole.id },
        },
      },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });

    const roles = user.roles.map((r) => r.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'BANNED') throw new UnauthorizedException('Account banned');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account suspended');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.roles.map((r) => r.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const stored = await this.redis.get(`refresh:${userId}`);
    if (!stored) throw new UnauthorizedException('Session expired');

    const isValid = await bcrypt.compare(refreshToken, stored);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.deletedAt) throw new UnauthorizedException();

    const roles = user.roles.map((r) => r.role.name);
    return this.generateTokens(user.id, user.email, roles);
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }

  async verifyEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  private async generateTokens(userId: string, email: string, roles: RoleType[]) {
    const payload = { sub: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiry', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiry', '7d'),
      }),
    ]);

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(`refresh:${userId}`, hash, REFRESH_TTL);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles?.map((r: any) => r.role.name) ?? [],
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
    };
  }
}
