import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { GeocodeService } from './geocode.service';

@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return this.geocodeService.search(query, limit || 5);
  }
}
