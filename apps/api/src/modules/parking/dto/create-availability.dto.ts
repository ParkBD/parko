import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AvailabilityType, DayOfWeek } from '@prisma/client';

export class CreateAvailabilityDto {
  @ApiProperty({
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
    description: 'REGULAR = recurring weekly schedule; OVERRIDE = specific date override; BLOCKED = date blocked',
  })
  @IsEnum(AvailabilityType)
  type: AvailabilityType;

  @ApiPropertyOptional({
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
    description: 'Required when type is REGULAR',
  })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({
    example: '2025-12-25',
    description: 'ISO date string (YYYY-MM-DD). Required when type is OVERRIDE or BLOCKED.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Opening time in HH:mm format',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'openTime must be in HH:mm format' })
  openTime?: string;

  @ApiPropertyOptional({
    example: '22:00',
    description: 'Closing time in HH:mm format',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'closeTime must be in HH:mm format' })
  closeTime?: string;

  @ApiProperty({ example: true, description: 'Whether the space is available during this window' })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Override the number of available slots for this window',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  slotOverride?: number;

  @ApiPropertyOptional({
    example: 75.0,
    description: 'Override the price per hour for this window',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({
    example: 'Reduced hours due to maintenance',
    description: 'Optional note about this availability window',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
