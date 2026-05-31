import { IsString, IsArray, IsIn, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PointDto {
  @ApiProperty({ example: 23.8103 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 90.4125 })
  @IsNumber()
  lng: number;
}

export class UpdateEntranceExitDto {
  @ApiProperty({ description: 'UUID of the parking space/lot' })
  @IsString()
  lotId: string;

  @ApiProperty({ enum: ['entrance', 'exit'] })
  @IsIn(['entrance', 'exit'])
  type: 'entrance' | 'exit';

  @ApiProperty({ type: [PointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points: PointDto[];
}
