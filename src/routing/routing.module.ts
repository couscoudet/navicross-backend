import { Module } from '@nestjs/common';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { OsrmService } from './services/osrm.service';
import { EventsModule } from '../events/events.module';
import { ClosuresModule } from '../closures/closures.module';
import { ValhallaService } from './services/valhalla.service';
import { RateLimiterService } from './services/rate-limiter.service';

@Module({
  imports: [EventsModule, ClosuresModule],
  controllers: [RoutingController],
  providers: [RoutingService, OsrmService, ValhallaService, RateLimiterService],
  exports: [RoutingService],
})
export class RoutingModule {}
