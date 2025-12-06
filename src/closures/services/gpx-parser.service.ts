import { Injectable, BadRequestException } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import * as tj from '@tmcw/togeojson';
import * as turf from '@turf/turf';

export interface ParsedClosure {
  type: 'barrier' | 'segment' | 'zone';
  polygon: any; // GeoJSON Polygon
  start_time: Date;
  end_time: Date;
  name?: string;
  points?: any; // Optional metadata
}

export interface ParseResult {
  closures: ParsedClosure[];
  errors: Array<{ element: string; name?: string; error: string }>;
}

@Injectable()
export class GpxParserService {
  parseGpx(buffer: Buffer, eventDate?: Date): ParseResult {
    const closures: ParsedClosure[] = [];
    const errors: Array<{ element: string; name?: string; error: string }> = [];

    try {
      // Parse XML
      const xmlString = buffer.toString('utf-8');
      const xmlDoc = new DOMParser().parseFromString(xmlString);

      // Convert GPX to GeoJSON using togeojson
      const geojson = tj.gpx(xmlDoc);

      if (!geojson || !geojson.features) {
        throw new BadRequestException('Invalid GPX file');
      }

      if (geojson.features.length === 0) {
        throw new BadRequestException('GPX file is empty');
      }

      if (geojson.features.length > 100) {
        throw new BadRequestException(
          'Maximum 100 elements allowed per GPX file',
        );
      }

      // Parse each feature
      geojson.features.forEach((feature: any) => {
        try {
          const closure = this.parseFeature(feature, eventDate);
          if (closure) {
            closures.push(closure);
          }
        } catch (error) {
          errors.push({
            element: feature.geometry.type,
            name: feature.properties?.name,
            error: error.message,
          });
        }
      });

      return { closures, errors };
    } catch (error) {
      throw new BadRequestException(`Failed to parse GPX: ${error.message}`);
    }
  }

  private parseFeature(feature: any, eventDate?: Date): ParsedClosure | null {
    const { geometry, properties } = feature;

    // Determine type from properties or geometry
    let type: 'barrier' | 'segment' | 'zone';

    if (properties.type) {
      type = properties.type;
    } else {
      // Infer from geometry
      if (geometry.type === 'Point') {
        type = 'barrier';
      } else if (geometry.type === 'LineString') {
        type = 'segment';
      } else if (geometry.type === 'Polygon') {
        type = 'zone';
      } else {
        throw new Error(`Unsupported geometry type: ${geometry.type}`);
      }
    }

    if (!['barrier', 'segment', 'zone'].includes(type)) {
      throw new Error(
        `Invalid type "${type}". Must be barrier, segment, or zone`,
      );
    }

    // Extract dates from extensions or use event date as default
    let startTime = this.extractDate(properties, 'start_time');
    let endTime = this.extractDate(properties, 'end_time');

    if (!startTime && !endTime && eventDate) {
      // Use event date as default: start at event time, end 8 hours later
      startTime = new Date(eventDate);
      endTime = new Date(eventDate.getTime() + 8 * 60 * 60 * 1000); // +8 hours
    }

    if (!startTime || !endTime) {
      throw new Error(
        'start_time and end_time required in GPX extensions or must provide event date',
      );
    }

    if (startTime >= endTime) {
      throw new Error('start_time must be before end_time');
    }

    // Convert geometry to polygon
    let polygon;
    let points;

    switch (type) {
      case 'barrier':
        if (geometry.type !== 'Point') {
          throw new Error('Barriers must be Points in GPX');
        }
        polygon = this.createBarrierPolygon(
          geometry.coordinates[0],
          geometry.coordinates[1],
        );
        points = { center: geometry.coordinates };
        break;

      case 'segment':
        if (geometry.type !== 'LineString') {
          throw new Error('Segments must be LineStrings in GPX');
        }
        polygon = this.createSegmentPolygon(geometry.coordinates);
        points = {
          start: geometry.coordinates[0],
          end: geometry.coordinates[geometry.coordinates.length - 1],
        };
        break;

      case 'zone':
        if (geometry.type === 'LineString') {
          // Convert LineString to closed Polygon
          polygon = this.createZoneFromLineString(geometry.coordinates);
        } else if (geometry.type === 'Polygon') {
          polygon = geometry;
        } else {
          throw new Error('Zones must be LineStrings or Polygons in GPX');
        }
        break;
    }

    return {
      type,
      polygon,
      start_time: startTime,
      end_time: endTime,
      name: properties.name,
      points,
    };
  }

  private extractDate(properties: any, key: string): Date | null {
    // Try direct property
    if (properties[key]) {
      const date = new Date(properties[key]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try extensions
    if (properties.extensions && properties.extensions[key]) {
      const date = new Date(properties.extensions[key]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  private createBarrierPolygon(lng: number, lat: number): any {
    // Create 30m circle
    const point = turf.point([lng, lat]);
    const circle = turf.circle(point, 0.03, { units: 'kilometers' });
    return circle.geometry;
  }

  private createSegmentPolygon(coordinates: number[][]): any {
    // Create line and buffer 15m
    const line = turf.lineString(coordinates);
    const buffered = turf.buffer(line, 0.015, { units: 'kilometers' });

    if (!buffered || !buffered.geometry) {
      throw new Error('Failed to create buffer for segment');
    }

    return buffered.geometry;
  }

  private createZoneFromLineString(coordinates: number[][]): any {
    // Close the polygon if not already closed
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push(first);
    }

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }
}
