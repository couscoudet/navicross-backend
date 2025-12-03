import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ValhallaRequest,
  ValhallaResponse,
} from '../interfaces/route.interface';

@Injectable()
export class ValhallaService {
  private readonly valhallaUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.valhallaUrl =
      this.configService.get<string>('VALHALLA_URL') ||
      'https://valhalla1.openstreetmap.de';
  }

  async calculateRoute(
    origin: [number, number],
    destination: [number, number],
    profile: string,
    excludePolygons: any[] = [],
  ): Promise<ValhallaResponse> {
    try {
      const costing = this.mapProfileToValhalla(profile);

      const request: ValhallaRequest = {
        locations: [
          { lat: origin[1], lon: origin[0] },
          { lat: destination[1], lon: destination[0] },
        ],
        costing,
      };

      // Add exclude_polygons if provided
      if (excludePolygons.length > 0) {
        request.exclude_polygons = excludePolygons.map((polygon) =>
          polygon.coordinates[0].map((coord: [number, number]) => [
            coord[0],
            coord[1],
          ]),
        );
        console.log(
          '🚧 Valhalla exclude_polygons:',
          JSON.stringify(request.exclude_polygons, null, 2),
        );
      }

      const url = `${this.valhallaUrl}/route`;
      console.log('🚧 Valhalla request:', JSON.stringify(request, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Valhalla request failed: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as ValhallaResponse;

      if (!data.trip) {
        throw new Error('Invalid Valhalla response: no trip data');
      }

      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to calculate route with Valhalla: ${error.message}`,
      );
    }
  }

  decodePolyline(encoded: string): [number, number][] {
    const coordinates: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lon = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlon = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lon += dlon;

      coordinates.push([lon / 1e6, lat / 1e6]);
    }

    return coordinates;
  }

  private mapProfileToValhalla(profile: string): string {
    const mapping = {
      driving: 'auto',
      walking: 'pedestrian',
      foot: 'pedestrian',
      cycling: 'bicycle',
    };
    return mapping[profile] || 'auto';
  }
}
