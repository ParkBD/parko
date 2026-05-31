import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RadiusSearchDto {
  @ApiProperty({ example: 23.8103 })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ example: 90.4125 })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ example: 5000, default: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  @Type(() => Number)
  radiusMeters: number = 5000;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;
}
