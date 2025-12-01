import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  Event,
  EventCreate,
  EventUpdate,
  EventPublic,
} from './interfaces/event.interface';

@Injectable()
export class EventsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: EventCreate): Promise<Event> {
    try {
      const row = await this.db.queryOne<Event>(
        `INSERT INTO events (slug, name, event_date, route, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, slug, name, event_date, 
                   ST_AsGeoJSON(route) as route,
                   description, published, created_at, updated_at, created_by`,
        [
          data.slug,
          data.name,
          data.event_date,
          data.route ? JSON.stringify(data.route) : null,
          data.description || null,
          data.created_by,
        ],
      );

      if (!row) {
        throw new Error('Failed to create event - no data returned');
      }

      return this.parseEvent(row);
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new InternalServerErrorException('Slug already exists');
      }
      throw new InternalServerErrorException(
        `Failed to create event: ${error.message}`,
      );
    }
  }

  async findAll(publishedOnly = true): Promise<EventPublic[]> {
    try {
      const query = publishedOnly
        ? 'SELECT id, slug, name, event_date, published FROM events WHERE published = true ORDER BY event_date DESC'
        : 'SELECT id, slug, name, event_date, published FROM events ORDER BY event_date DESC';

      return this.db.queryMany<EventPublic>(query);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch events: ${error.message}`,
      );
    }
  }

  async findBySlug(slug: string): Promise<Event | null> {
    try {
      const row = await this.db.queryOne<any>(
        `SELECT id, slug, name, event_date,
                ST_AsGeoJSON(route) as route,
                description, published, created_at, updated_at, created_by
         FROM events
         WHERE slug = $1`,
        [slug],
      );

      return row ? this.parseEvent(row) : null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to find event: ${error.message}`,
      );
    }
  }

  async findByCreator(createdBy: string): Promise<EventPublic[]> {
    try {
      return this.db.queryMany<EventPublic>(
        `SELECT id, slug, name, event_date, published
         FROM events
         WHERE created_by = $1
         ORDER BY event_date DESC`,
        [createdBy],
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user events: ${error.message}`,
      );
    }
  }

  async update(slug: string, data: EventUpdate): Promise<Event> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.event_date !== undefined) {
        updates.push(`event_date = $${paramIndex++}`);
        values.push(data.event_date);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.published !== undefined) {
        updates.push(`published = $${paramIndex++}`);
        values.push(data.published);
      }
      if (data.route !== undefined) {
        updates.push(`route = $${paramIndex++}`);
        values.push(data.route ? JSON.stringify(data.route) : null);
      }

      updates.push(`updated_at = NOW()`);
      values.push(slug);

      const row = await this.db.queryOne<any>(
        `UPDATE events
         SET ${updates.join(', ')}
         WHERE slug = $${paramIndex}
         RETURNING id, slug, name, event_date,
                   ST_AsGeoJSON(route) as route,
                   description, published, created_at, updated_at, created_by`,
        values,
      );

      if (!row) {
        throw new NotFoundException('Event not found');
      }

      return this.parseEvent(row);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update event: ${error.message}`,
      );
    }
  }

  async delete(slug: string): Promise<void> {
    try {
      const result = await this.db.query('DELETE FROM events WHERE slug = $1', [
        slug,
      ]);

      if (result.rowCount === 0) {
        throw new NotFoundException('Event not found');
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete event: ${error.message}`,
      );
    }
  }

  async exists(slug: string): Promise<boolean> {
    try {
      const result = await this.db.queryOne<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM events WHERE slug = $1)',
        [slug],
      );
      return result?.exists || false;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to check event existence: ${error.message}`,
      );
    }
  }

  private parseEvent(row: any): Event {
    return {
      ...row,
      route: row.route ? JSON.parse(row.route) : null,
    };
  }
}
