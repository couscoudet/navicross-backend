import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OSRMResponse } from '../interfaces/route.interface';

@Injectable()
export class OsrmService {
  private readonly osrmUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.osrmUrl =
      this.configService.get<string>('OSRM_URL') ||
      'http://router.project-osrm.org';
  }

  async calculateRoute(
    origin: [number, number],
    destination: [number, number],
    profile: string,
  ): Promise<OSRMResponse> {
    try {
      const osrmProfile = this.mapProfileToOSRM(profile);
      const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
      const url = `${this.osrmUrl}/route/v1/${osrmProfile}/${coordinates}?overview=full&steps=true&geometries=geojson`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`OSRM request failed: ${response.status}`);
      }

      const data = (await response.json()) as OSRMResponse;

      if (data.code !== 'Ok') {
        throw new Error(`OSRM error: ${data.code}`);
      }

      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to calculate route: ${error.message}`,
      );
    }
  }

  private mapProfileToOSRM(profile: string): string {
    const mapping = {
      driving: 'car',
      walking: 'foot',
      foot: 'foot',
      cycling: 'bike',
    };
    return mapping[profile] || 'car';
  }
}
