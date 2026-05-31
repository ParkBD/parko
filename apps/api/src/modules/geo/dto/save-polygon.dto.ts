import { IsString, IsObject, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LatLngDto {
  @ApiProperty({ example: 23.8103 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 90.4125 })
  @IsNumber()
  lng: number;
}

export class SavePolygonDto {
  @ApiProperty({ description: 'UUID of the parking space/lot' })
  @IsString()
  lotId: string;

  @ApiProperty({
    description: 'GeoJSON FeatureCollection or Polygon geometry',
    example: {
      type: 'Polygon',
      coordinates: [[[90.4125, 23.8103], [90.4130, 23.8103], [90.4130, 23.8110], [90.4125, 23.8103]]],
    },
  })
  @IsObject()
  polygon: Record<string, any>;

  @ApiProperty({ type: [LatLngDto], description: 'Entrance points' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  entrances: LatLngDto[];

  @ApiProperty({ type: [LatLngDto], description: 'Exit points' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  exits: LatLngDto[];
}
