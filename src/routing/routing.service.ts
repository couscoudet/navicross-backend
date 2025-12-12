import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValhallaService } from './services/valhalla.service';
import { OsrmService } from './services/osrm.service';
import { EventsRepository } from '../events/events.repository';
import { ClosuresRepository } from '../closures/closures.repository';
import type {
  RouteRequest,
  RouteResponse,
  RouteStep,
} from './interfaces/route.interface';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@Injectable()
export class RoutingService {
  private readonly routingEngine: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly valhallaService: ValhallaService,
    private readonly osrmService: OsrmService,
    private readonly eventsRepo: EventsRepository,
    private readonly closuresRepo: ClosuresRepository,
  ) {
    this.routingEngine =
      this.configService.get<string>('ROUTING_ENGINE') || 'valhalla';
  }

  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    try {
      // Get active closures if eventSlug provided
      let excludePolygons: any[] = [];
      if (request.eventSlug) {
        const event = await this.eventsRepo.findBySlug(request.eventSlug);
        if (event) {
          excludePolygons = await this.closuresRepo.getActivePolygons(event.id);
          console.log('🚧 Active closures found:', excludePolygons.length);
          console.log(
            '🚧 Exclude polygons:',
            JSON.stringify(excludePolygons, null, 2),
          );
        }
      }

      // Use Valhalla (supports exclusions) or fallback to OSRM
      if (this.routingEngine === 'valhalla') {
        return await this.calculateWithValhalla(request, excludePolygons);
      } else {
        return await this.calculateWithOSRM(request, excludePolygons);
      }
    } catch (error) {
      // Si c'est déjà une HttpException, la relancer
      if (error instanceof HttpException) {
        throw error;
      }

      // Gérer les erreurs Valhalla
      if (error.error_code || error.status_code) {
        const valhallaError = ErrorResponseDto.fromValhallaError(error);
        throw new HttpException(valhallaError, HttpStatus.BAD_REQUEST);
      }

      // Erreur réseau
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const networkError = ErrorResponseDto.fromNetworkError();
        throw new HttpException(networkError, HttpStatus.SERVICE_UNAVAILABLE);
      }

      // Erreur générique
      console.error('Route calculation error:', error);
      const genericError = new ErrorResponseDto(
        error.message || "Impossible de calculer l'itinéraire",
        'ROUTE_CALCULATION_ERROR',
        500,
      );
      throw new HttpException(genericError, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async calculateWithValhalla(
    request: RouteRequest,
    excludePolygons: any[],
  ): Promise<RouteResponse> {
    try {
      const valhallaResponse = await this.valhallaService.calculateRoute(
        request.origin,
        request.destination,
        request.profile,
        excludePolygons,
      );

      const trip = valhallaResponse.trip;
      const leg = trip.legs[0];

      // Decode polyline to coordinates
      const coordinates = this.valhallaService.decodePolyline(leg.shape);

      // Parse maneuvers to steps
      const steps: RouteStep[] = leg.maneuvers.map((maneuver) => ({
        distance: maneuver.length * 1000, // km to meters
        duration: maneuver.time,
        instruction: maneuver.instruction,
        name: maneuver.street_names?.[0],
      }));

      const warnings: string[] = [];
      if (excludePolygons.length > 0) {
        warnings.push(
          `Route calculated avoiding ${excludePolygons.length} active closure(s)`,
        );
      }

      return {
        distance: trip.summary.length * 1000, // km to meters
        duration: trip.summary.time,
        geometry: {
          type: 'LineString',
          coordinates,
        },
        steps,
        warnings,
        routing_engine: 'valhalla',
      };
    } catch (error) {
      // Erreurs Valhalla spécifiques
      if (error.error_code || error.status_code) {
        const valhallaError = ErrorResponseDto.fromValhallaError(error);
        throw new HttpException(valhallaError, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  private async calculateWithOSRM(
    request: RouteRequest,
    excludePolygons: any[],
  ): Promise<RouteResponse> {
    try {
      // OSRM doesn't support exclusions - just calculate and warn
      const osrmResponse = await this.osrmService.calculateRoute(
        request.origin,
        request.destination,
        request.profile,
      );

      const route = osrmResponse.routes[0];

      const steps: RouteStep[] = route.legs[0].steps.map((step) => ({
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver.instruction || step.name || 'Continue',
        name: step.name,
      }));

      const warnings: string[] = [];
      if (excludePolygons.length > 0) {
        warnings.push(
          `⚠️ OSRM cannot avoid closures. ${excludePolygons.length} active closure(s) detected. Switch to Valhalla for route avoidance.`,
        );

        // Check if route intersects closures
        if (request.eventSlug) {
          const event = await this.eventsRepo.findBySlug(request.eventSlug);
          if (event) {
            const intersectingCount = await this.countIntersectingClosures(
              event.id,
              route.geometry,
            );
            if (intersectingCount > 0) {
              warnings.push(
                `Route intersects with ${intersectingCount} closure(s)`,
              );
            }
          }
        }
      }

      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        steps,
        warnings,
        routing_engine: 'osrm',
      };
    } catch (error) {
      // Erreur OSRM
      console.error('OSRM routing error:', error);
      const osrmError = new ErrorResponseDto(
        error.message || 'Erreur lors du calcul avec OSRM',
        'OSRM_ERROR',
        500,
      );
      throw new HttpException(osrmError, HttpStatus.INTERNAL_SERVER_ERROR);
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
