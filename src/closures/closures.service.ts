import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClosuresRepository } from './closures.repository';
import { EventsRepository } from '../events/events.repository';
import { DatabaseService } from '../database/database.service';
import { GpxParserService } from './services/gpx-parser.service';
import { CreateClosureDto } from './dto/create-closure.dto';
import { UpdateClosureDto } from './dto/update-closure.dto';
import type { UserPublic } from '../users/interfaces/user.interface';

@Injectable()
export class ClosuresService {
  constructor(
    private readonly closuresRepo: ClosuresRepository,
    private readonly eventsRepo: EventsRepository,
    private readonly db: DatabaseService,
    private readonly gpxParser: GpxParserService,
  ) {}

  async create(eventSlug: string, dto: CreateClosureDto, user: UserPublic) {
    const event = await this.eventsRepo.findBySlug(eventSlug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.created_by !== user.email) {
      throw new ForbiddenException(
        'You can only add closures to your own events',
      );
    }

    return this.closuresRepo.create({
      event_id: event.id,
      type: dto.type,
      polygon: dto.polygon,
      points: dto.points,
      start_time: new Date(dto.start_time),
      end_time: new Date(dto.end_time),
    });
  }

  async uploadGpx(
    eventSlug: string,
    file: Express.Multer.File,
    user: UserPublic,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.gpx')) {
      throw new BadRequestException('Only .gpx files are allowed');
    }

    const event = await this.eventsRepo.findBySlug(eventSlug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.created_by !== user.email) {
      throw new ForbiddenException(
        'You can only add closures to your own events',
      );
    }

    // Parse GPX with event date as fallback
    const { closures, errors } = this.gpxParser.parseGpx(
      file.buffer,
      new Date(event.event_date),
    );

    // Create all valid closures
    const created: any[] = [];
    for (const closure of closures) {
      try {
        const result = await this.closuresRepo.create({
          event_id: event.id,
          type: closure.type,
          polygon: closure.polygon,
          points: closure.points,
          start_time: closure.start_time,
          end_time: closure.end_time,
        });
        created.push(result);
      } catch (error: any) {
        errors.push({
          element: closure.type,
          name: closure.name,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async findByEventSlug(eventSlug: string) {
    const event = await this.eventsRepo.findBySlug(eventSlug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.closuresRepo.findByEventId(event.id);
  }

  async findActiveByEventSlug(eventSlug: string) {
    const event = await this.eventsRepo.findBySlug(eventSlug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.closuresRepo.findActiveByEventId(event.id);
  }

  async update(id: number, dto: UpdateClosureDto, user: UserPublic) {
    const closure = await this.closuresRepo.findById(id);
    if (!closure) {
      throw new NotFoundException('Closure not found');
    }

    const event = await this.db.queryOne<{ created_by: string }>(
      'SELECT created_by FROM events WHERE id = $1',
      [closure.event_id],
    );

    if (!event || event.created_by !== user.email) {
      throw new ForbiddenException(
        'You can only modify closures from your own events',
      );
    }

    return this.closuresRepo.update(id, {
      polygon: dto.polygon,
      points: dto.points,
      start_time: dto.start_time ? new Date(dto.start_time) : undefined,
      end_time: dto.end_time ? new Date(dto.end_time) : undefined,
    });
  }

  async delete(id: number, user: UserPublic) {
    const closure = await this.closuresRepo.findById(id);
    if (!closure) {
      throw new NotFoundException('Closure not found');
    }

    const event = await this.db.queryOne<{ created_by: string }>(
      'SELECT created_by FROM events WHERE id = $1',
      [closure.event_id],
    );

    if (!event || event.created_by !== user.email) {
      throw new ForbiddenException(
        'You can only delete closures from your own events',
      );
    }

    await this.closuresRepo.delete(id);
    return { message: 'Closure deleted successfully' };
  }
}
