import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lotId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'DHA-1234' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiPropertyOptional({ example: 'CAR' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ description: 'Coins to apply from wallet' })
  @IsOptional()
  @IsInt()
  @Min(0)
  coinsToUse?: number;
}
