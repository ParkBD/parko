import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ParkingSpaceType, VehicleType } from '@prisma/client';

export class CreateSpaceDto {
  @ApiProperty({ example: 'Downtown Covered Parking' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Secure covered parking near city center' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ParkingSpaceType, example: ParkingSpaceType.COVERED })
  @IsEnum(ParkingSpaceType)
  spaceType: ParkingSpaceType;

  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSlots: number;

  @ApiProperty({ example: 50.0, description: 'Price per hour in currency units' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @ApiPropertyOptional({ example: 400.0, description: 'Price per day in currency units' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerDay?: number;

  @ApiPropertyOptional({ example: 'BDT', default: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string = 'BDT';

  @ApiProperty({ example: '123 Motijheel C/A' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Floor 2' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Dhaka Division' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'BD', default: 'BD' })
  @IsOptional()
  @IsString()
  country?: string = 'BD';

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: 23.7276, description: 'Latitude in decimal degrees' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 90.4071, description: 'Longitude in decimal degrees' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    example: ['CCTV', 'EV Charging', '24/7 Security'],
    description: 'List of amenity strings',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  amenities?: any[];

  @ApiProperty({
    enum: VehicleType,
    isArray: true,
    example: [VehicleType.CAR, VehicleType.SUV],
    description: 'Supported vehicle types',
  })
  @IsArray()
  @IsEnum(VehicleType, { each: true })
  vehicleTypes: VehicleType[];

  @ApiPropertyOptional({ example: 'No overnight parking' })
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({ example: 'Enter from the north gate' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isInstantBook?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Minimum booking duration in hours' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minBookingHours?: number;

  @ApiPropertyOptional({ example: 24, description: 'Maximum booking duration in hours' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBookingHours?: number;

  @ApiPropertyOptional({ example: 'Free cancellation up to 2 hours before booking' })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;
}
