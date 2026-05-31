import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { PayoutMethod } from '@prisma/client';

export class RequestPayoutDto {
  @ApiProperty({ minimum: 100 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: PayoutMethod })
  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.method === PayoutMethod.BANK_TRANSFER)
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.method === PayoutMethod.BANK_TRANSFER)
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.method === PayoutMethod.BANK_TRANSFER)
  @IsString()
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => [PayoutMethod.BKASH, PayoutMethod.NAGAD, PayoutMethod.ROCKET].includes(o.method))
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
