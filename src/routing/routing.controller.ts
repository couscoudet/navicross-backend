import { Controller, Post, Body } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { CalculateRouteDto } from './dto/calculate-route.dto';

@Controller('route')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post()
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.routingService.calculateRoute({
      origin: dto.origin,
      destination: dto.destination,
      profile: dto.profile,
      eventSlug: dto.eventSlug,
    });
  }
}
