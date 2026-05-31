import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CoinPackage, PaymentMethod } from '@prisma/client';

export class BuyCoinsDto {
  @ApiProperty({ enum: CoinPackage })
  @IsEnum(CoinPackage)
  package: CoinPackage;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
