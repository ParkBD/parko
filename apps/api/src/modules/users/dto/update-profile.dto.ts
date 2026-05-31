import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Abir' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Hossain' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'abir_dev' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Parking enthusiast and software engineer.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '19953012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'DL-DHAKA-2023-001234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  drivingLicense?: string;

  @ApiPropertyOptional({ example: '42, Mirpur Road' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Flat 4B, Tower 2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 'Dhaka Division' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  state?: string;

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ example: '1216' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
