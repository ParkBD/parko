import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        wallet: {
          select: { balance: true, coinBalance: true },
        },
        roles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      ...user,
      wallet: user.wallet
        ? {
            balance: user.wallet.balance.toNumber(),
            coinBalance: user.wallet.coinBalance,
          }
        : null,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!existing) throw new NotFoundException('Profile not found');

    const data: Record<string, unknown> = { ...dto };

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }

    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all refresh tokens so the user must re-login on other devices
    await this.redis.del(`refresh:${userId}`);

    return { message: 'Password changed successfully' };
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, coinBalance: true },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      balance: wallet.balance.toNumber(),
      coinBalance: wallet.coinBalance,
    };
  }

  async softDelete(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    // Revoke active sessions
    await this.redis.del(`refresh:${userId}`);

    return { message: 'Account deleted successfully' };
  }
}
