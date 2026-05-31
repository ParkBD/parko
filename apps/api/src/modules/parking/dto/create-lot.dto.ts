import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateParkingLotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'GeoJSON polygon coords [[lng,lat],[lng,lat],...]' })
  polygonCoords: any;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  totalSlots: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  @IsOptional()
  @IsArray()
  openDays?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;
}
