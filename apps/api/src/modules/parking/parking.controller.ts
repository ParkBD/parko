import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { CreateParkingLotDto } from './dto/create-lot.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('parking')
@ApiBearerAuth()
@Controller('parking')
export class ParkingController {
  constructor(private parkingService: ParkingService) {}

  @Roles('OWNER')
  @Post('lots')
  createLot(@CurrentUser('id') userId: string, @Body() dto: CreateParkingLotDto) {
    return this.parkingService.createLot(userId, dto);
  }

  @Roles('OWNER')
  @Get('lots/mine')
  getMyLots(@CurrentUser('id') userId: string) {
    return this.parkingService.getOwnerLots(userId);
  }

  @Roles('OWNER')
  @Patch('lots/:id')
  updateLot(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateParkingLotDto>,
  ) {
    return this.parkingService.updateLot(id, userId, dto);
  }

  @Public()
  @Get('lots')
  getActiveLots(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('city') city?: string,
  ) {
    return this.parkingService.getActiveLots(+page, +limit, city);
  }

  @Public()
  @Get('lots/:id')
  getLot(@Param('id') id: string) {
    return this.parkingService.getLot(id);
  }

  @Get('lots/:id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.parkingService.getLiveAvailability(
      id,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Roles('ADMIN')
  @Patch('lots/:id/approve')
  approveLot(@Param('id') id: string) {
    return this.parkingService.approveLot(id);
  }
}
