import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Search parking spaces near coordinates' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  searchNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '5',
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.searchService.searchNearby(+lat, +lng, +radius, +page, +limit);
  }

  @Public()
  @Get('city')
  @ApiOperation({ summary: 'Search parking spaces by city' })
  searchByCity(@Query('city') city: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.searchService.searchByCity(city, +page, +limit);
  }
}
