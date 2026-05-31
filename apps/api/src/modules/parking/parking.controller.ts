import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ParkingService } from './parking.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('parking')
@Controller('parking')
export class ParkingController {
  constructor(private parkingService: ParkingService) {}

  @Roles(RoleType.OWNER, RoleType.ADMIN)
  @Post('spaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create parking space' })
  createSpace(@CurrentUser('id') ownerId: string, @Body() dto: CreateSpaceDto) {
    return this.parkingService.createSpace(ownerId, dto);
  }

  @Public()
  @Get('spaces')
  @ApiOperation({ summary: 'List active parking spaces' })
  getSpaces(@Query('page') page = 1, @Query('limit') limit = 20, @Query('city') city?: string) {
    return this.parkingService.getSpaces(+page, +limit, city);
  }

  @Roles(RoleType.OWNER)
  @Get('spaces/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my parking spaces' })
  getMySpaces(@CurrentUser('id') ownerId: string) {
    return this.parkingService.getOwnerSpaces(ownerId);
  }

  @Public()
  @Get('spaces/:id')
  @ApiOperation({ summary: 'Get parking space by ID' })
  getSpace(@Param('id') id: string) {
    return this.parkingService.getSpace(id);
  }

  @Roles(RoleType.OWNER, RoleType.ADMIN)
  @Patch('spaces/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update parking space' })
  updateSpace(@Param('id') id: string, @CurrentUser('id') ownerId: string, @Body() dto: UpdateSpaceDto) {
    return this.parkingService.updateSpace(id, ownerId, dto);
  }

  @Roles(RoleType.OWNER, RoleType.ADMIN)
  @Delete('spaces/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete parking space' })
  deleteSpace(@Param('id') id: string, @CurrentUser('id') ownerId: string) {
    return this.parkingService.deleteSpace(id, ownerId);
  }

  @Roles(RoleType.OWNER)
  @Post('spaces/:id/images')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add image to parking space' })
  addImage(@Param('id') spaceId: string, @CurrentUser('id') ownerId: string, @Body() body: any) {
    return this.parkingService.addImage(spaceId, ownerId, body);
  }

  @Roles(RoleType.OWNER)
  @Delete('spaces/:spaceId/images/:imageId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove image' })
  removeImage(@Param('imageId') imageId: string, @CurrentUser('id') ownerId: string) {
    return this.parkingService.removeImage(imageId, ownerId);
  }

  @Roles(RoleType.OWNER)
  @Put('spaces/:id/polygon')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set space boundary polygon' })
  setPolygon(@Param('id') spaceId: string, @CurrentUser('id') ownerId: string, @Body() body: any) {
    return this.parkingService.setPolygon(spaceId, ownerId, body);
  }

  @Public()
  @Get('spaces/:id/availability')
  @ApiOperation({ summary: 'Get space availability schedule' })
  getAvailability(@Param('id') spaceId: string) {
    return this.parkingService.getAvailability(spaceId);
  }

  @Roles(RoleType.OWNER)
  @Post('spaces/:id/availability')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add availability slot' })
  addAvailability(@Param('id') spaceId: string, @CurrentUser('id') ownerId: string, @Body() dto: CreateAvailabilityDto) {
    return this.parkingService.upsertAvailability(spaceId, ownerId, dto);
  }

  @Roles(RoleType.OWNER)
  @Delete('spaces/:id/availability/:availId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete availability slot' })
  deleteAvailability(@Param('availId') availId: string, @CurrentUser('id') ownerId: string) {
    return this.parkingService.deleteAvailability(availId, ownerId);
  }
}
