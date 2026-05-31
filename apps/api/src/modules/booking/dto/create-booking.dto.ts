import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod, VehicleType } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() spaceId: string;
  @ApiProperty() @IsDateString() startTime: string;
  @ApiProperty() @IsDateString() endTime: string;
  @ApiProperty() @IsString() vehicleNumber: string;
  @ApiProperty({ enum: VehicleType }) @IsEnum(VehicleType) vehicleType: VehicleType;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) coinsToUse?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
