import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  Closure,
  ClosureCreate,
  ClosureUpdate,
  ClosurePublic,
} from './interfaces/closure.interface';

@Injectable()
export class ClosuresRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: ClosureCreate): Promise<Closure> {
    try {
      const row = await this.db.queryOne<any>(
        `INSERT INTO closures (event_id, name, type, polygon, center, points, start_time, end_time, description)
         VALUES (
           $1,
           $2,
           $3,
           ST_GeomFromGeoJSON($4),
           ST_Centroid(ST_GeomFromGeoJSON($4)),
           $5,
           $6,
           $7,
           $8
         )
         RETURNING id, event_id, name, type,
                   ST_AsGeoJSON(polygon) as polygon,
                   ST_AsGeoJSON(center) as center,
                   points, start_time, end_time, description, created_at, updated_at`,
        [
          data.event_id,
          data.name,
          data.type,
          JSON.stringify(data.polygon),
          data.points ? JSON.stringify(data.points) : null,
          data.start_time,
          data.end_time,
          data.description || null,
        ],
      );

      if (!row) {
        throw new Error('Failed to create closure - no data returned');
      }

      return this.parseClosure(row);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create closure: ${error.message}`,
      );
    }
  }

  async findByEventId(eventId: number): Promise<ClosurePublic[]> {
    try {
      const rows = await this.db.queryMany<any>(
        `SELECT id, name, type,
                ST_AsGeoJSON(polygon) as polygon,
                ST_AsGeoJSON(center) as center,
                start_time, end_time, description
         FROM closures
         WHERE event_id = $1
         ORDER BY start_time ASC`,
        [eventId],
      );

      return rows.map((row) => this.parseClosurePublic(row));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch closures: ${error.message}`,
      );
    }
  }

  async findActiveByEventId(eventId: number): Promise<ClosurePublic[]> {
    try {
      const rows = await this.db.queryMany<any>(
        `SELECT id, name, type,
                ST_AsGeoJSON(polygon) as polygon,
                ST_AsGeoJSON(center) as center,
                start_time, end_time, description
         FROM closures
         WHERE event_id = $1
           AND NOW() >= start_time
           AND NOW() <= end_time
         ORDER BY start_time ASC`,
        [eventId],
      );

      return rows.map((row) => this.parseClosurePublic(row));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch active closures: ${error.message}`,
      );
    }
  }

  async findById(id: number): Promise<Closure | null> {
    try {
      const row = await this.db.queryOne<any>(
        `SELECT id, event_id, name, type,
                ST_AsGeoJSON(polygon) as polygon,
                ST_AsGeoJSON(center) as center,
                points, start_time, end_time, description, created_at, updated_at
         FROM closures
         WHERE id = $1`,
        [id],
      );

      return row ? this.parseClosure(row) : null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to find closure: ${error.message}`,
      );
    }
  }

  async update(id: number, data: ClosureUpdate): Promise<Closure> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.polygon !== undefined) {
        updates.push(`polygon = ST_GeomFromGeoJSON($${paramIndex})`);
        updates.push(
          `center = ST_Centroid(ST_GeomFromGeoJSON($${paramIndex}))`,
        );
        values.push(JSON.stringify(data.polygon));
        paramIndex++;
      }
      if (data.points !== undefined) {
        updates.push(`points = $${paramIndex++}`);
        values.push(data.points ? JSON.stringify(data.points) : null);
      }
      if (data.start_time !== undefined) {
        updates.push(`start_time = $${paramIndex++}`);
        values.push(data.start_time);
      }
      if (data.end_time !== undefined) {
        updates.push(`end_time = $${paramIndex++}`);
        values.push(data.end_time);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description || null);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const row = await this.db.queryOne<any>(
        `UPDATE closures
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, event_id, name, type,
                   ST_AsGeoJSON(polygon) as polygon,
                   ST_AsGeoJSON(center) as center,
                   points, start_time, end_time, description, created_at, updated_at`,
        values,
      );

      if (!row) {
        throw new NotFoundException('Closure not found');
      }

      return this.parseClosure(row);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update closure: ${error.message}`,
      );
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const result = await this.db.query('DELETE FROM closures WHERE id = $1', [
        id,
      ]);

      if (result.rowCount === 0) {
        throw new NotFoundException('Closure not found');
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete closure: ${error.message}`,
      );
    }
  }

  async getActivePolygons(eventId: number): Promise<any[]> {
    try {
      const rows = await this.db.queryMany<{ polygon: string }>(
        `SELECT ST_AsGeoJSON(polygon) as polygon
         FROM closures
         WHERE event_id = $1
           AND NOW() >= start_time
           AND NOW() <= end_time`,
        [eventId],
      );

      return rows.map((row) => JSON.parse(row.polygon));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch active polygons: ${error.message}`,
      );
    }
  }

  private parseClosure(row: any): Closure {
    return {
      ...row,
      polygon: row.polygon ? JSON.parse(row.polygon) : null,
      center: row.center ? JSON.parse(row.center) : null,
      points: row.points || null,
    };
  }

  private parseClosurePublic(row: any): ClosurePublic {
    return {
      name: row.name,
      id: row.id,
      type: row.type,
      polygon: row.polygon ? JSON.parse(row.polygon) : null,
      center: row.center ? JSON.parse(row.center) : null,
      start_time: row.start_time,
      end_time: row.end_time,
      description: row.description,
    };
  }
}
