import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { GeoService } from './geo.service';
import { SavePolygonDto } from './dto/save-polygon.dto';
import { RadiusSearchDto } from './dto/radius-search.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Roles(RoleType.OWNER, RoleType.ADMIN)
  @Post('polygon')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save lot polygon boundary + entrances/exits (Owner only)' })
  saveLotPolygon(
    @CurrentUser('id') ownerId: string,
    @Body() dto: SavePolygonDto,
  ) {
    return this.geoService.saveLotPolygon(ownerId, dto);
  }

  @Public()
  @Get('lot/:lotId')
  @ApiOperation({ summary: 'Get GeoJSON polygon + entrance/exit points for a lot' })
  getLotGeo(@Param('lotId') lotId: string) {
    return this.geoService.getLotGeo(lotId);
  }

  @Public()
  @Post('search')
  @ApiOperation({ summary: 'Search parking lots within radius' })
  searchWithinRadius(@Body() dto: RadiusSearchDto) {
    return this.geoService.searchWithinRadius(dto);
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby lots sorted by distance' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  getNearbyLots(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.geoService.getNearbyLots(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 5000,
    );
  }

  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate a GeoJSON polygon via PostGIS ST_IsValid' })
  validatePolygon(@Body() body: { geojson: Record<string, any> }) {
    return this.geoService.validatePolygon(body.geojson);
  }
}
