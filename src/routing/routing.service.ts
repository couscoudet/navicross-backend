import { Injectable } from '@nestjs/common';
import { OsrmService } from './services/osrm.service';
import { EventsRepository } from '../events/events.repository';
import { ClosuresRepository } from '../closures/closures.repository';
import type {
  RouteRequest,
  RouteResponse,
  RouteStep,
} from './interfaces/route.interface';

@Injectable()
export class RoutingService {
  constructor(
    private readonly osrmService: OsrmService,
    private readonly eventsRepo: EventsRepository,
    private readonly closuresRepo: ClosuresRepository,
  ) {}

  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    // 1. Calculate route with OSRM
    const osrmResponse = await this.osrmService.calculateRoute(
      request.origin,
      request.destination,
      request.profile,
    );

    const route = osrmResponse.routes[0];

    // 2. Parse steps
    const steps: RouteStep[] = route.legs[0].steps.map((step) => ({
      distance: step.distance,
      duration: step.duration,
      instruction: step.maneuver.instruction || step.name || 'Continue',
      name: step.name,
    }));

    // 3. Check for closures if eventSlug provided
    const warnings: string[] = [];
    if (request.eventSlug) {
      const intersectionWarning = await this.checkClosuresIntersection(
        request.eventSlug,
        route.geometry.coordinates,
      );
      if (intersectionWarning) {
        warnings.push(intersectionWarning);
      }
    }

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps,
      warnings,
    };
  }

  private async checkClosuresIntersection(
    eventSlug: string,
    routeCoordinates: [number, number][],
  ): Promise<string | null> {
    try {
      // Get event
      const event = await this.eventsRepo.findBySlug(eventSlug);
      if (!event) {
        return null;
      }

      // Get active closures
      const activeClosures = await this.closuresRepo.findActiveByEventId(
        event.id,
      );

      if (activeClosures.length === 0) {
        return null;
      }

      // Check intersection using PostGIS
      const lineString = {
        type: 'LineString',
        coordinates: routeCoordinates,
      };

      const intersectingCount = await this.countIntersectingClosures(
        event.id,
        lineString,
      );

      if (intersectingCount > 0) {
        return `Route intersects with ${intersectingCount} active closure(s) for event '${eventSlug}'`;
      }

      return null;
    } catch (error) {
      console.error('Error checking closures intersection:', error);
      return null;
    }
  }

  private async countIntersectingClosures(
    eventId: number,
    lineString: any,
  ): Promise<number> {
    const result = await this.closuresRepo['db'].queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM closures
       WHERE event_id = $1
         AND NOW() >= start_time
         AND NOW() <= end_time
         AND ST_Intersects(polygon, ST_GeomFromGeoJSON($2))`,
      [eventId, JSON.stringify(lineString)],
    );

    return parseInt(result?.count || '0', 10);
  }
}
