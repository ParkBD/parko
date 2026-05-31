import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ParkingSpaceType, VehicleType } from '@prisma/client';

export class CreateSpaceDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ParkingSpaceType, default: ParkingSpaceType.OPEN })
  @IsEnum(ParkingSpaceType) spaceType: ParkingSpaceType;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) totalSlots: number;
  @ApiProperty() @IsNumber() @Min(0) pricePerHour: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) pricePerDay?: number;
  @ApiPropertyOptional({ default: 'BDT' }) @IsOptional() @IsString() currency?: string;
  @ApiProperty() @IsString() addressLine1: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiProperty() @IsString() city: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional({ default: 'BD' }) @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() amenities?: string[];
  @ApiProperty({ enum: VehicleType, isArray: true })
  @IsArray() @IsEnum(VehicleType, { each: true }) vehicleTypes: VehicleType[];
  @ApiPropertyOptional() @IsOptional() @IsString() rules?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInstantBook?: boolean;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) minBookingHours?: number;
  @ApiPropertyOptional({ default: 24 }) @IsOptional() @IsInt() @Max(168) maxBookingHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationPolicy?: string;
}
