import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get('radius')
  radiusSearch(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '5',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.searchService.radiusSearch(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
    );
  }

  @Public()
  @Post('polygon')
  polygonSearch(
    @Body('polygon') polygon: number[][],
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.searchService.polygonSearch(
      polygon,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
    );
  }
}
