import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ClosuresRepository } from './closures.repository';
import { EventsRepository } from '../events/events.repository';
import { DatabaseService } from '../database/database.service';
import { CreateClosureDto } from './dto/create-closure.dto';
import { UpdateClosureDto } from './dto/update-closure.dto';
import type { UserPublic } from '../users/interfaces/user.interface';

@Injectable()
export class ClosuresService {
  constructor(
    private readonly closuresRepo: ClosuresRepository,
    private readonly eventsRepo: EventsRepository,
    private readonly db: DatabaseService,
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
