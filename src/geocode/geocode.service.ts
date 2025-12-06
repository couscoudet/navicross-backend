import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable()
export class GeocodeService {
  private readonly apiUrl = 'https://api-adresse.data.gouv.fr/search/';

  async search(query: string, limit: number = 5): Promise<GeocodeResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const response = await fetch(`${this.apiUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`API Adresse request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return [];
      }

      // Transform API Adresse format to Nominatim-like format
      return data.features.map((feature: any) => ({
        lat: feature.geometry.coordinates[1].toString(),
        lon: feature.geometry.coordinates[0].toString(),
        display_name: feature.properties.label,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        `Geocoding failed: ${error.message}`,
      );
    }
  }
}
