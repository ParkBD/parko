import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { AvailabilityType, DayOfWeek } from '@prisma/client';

export class CreateAvailabilityDto {
  @ApiProperty({ enum: AvailabilityType }) @IsEnum(AvailabilityType) type: AvailabilityType;
  @ApiPropertyOptional({ enum: DayOfWeek }) @IsOptional() @IsEnum(DayOfWeek) dayOfWeek?: DayOfWeek;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional({ example: '08:00' }) @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) openTime?: string;
  @ApiPropertyOptional({ example: '22:00' }) @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) closeTime?: string;
  @ApiProperty({ default: true }) @IsBoolean() isAvailable: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() slotOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priceOverride?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
