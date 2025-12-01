import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserPublic } from '../users/interfaces/user.interface';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepo: EventsRepository) {}

  async create(dto: CreateEventDto, user: UserPublic) {
    const exists = await this.eventsRepo.exists(dto.slug);
    if (exists) {
      throw new ConflictException('Slug already exists');
    }

    return this.eventsRepo.create({
      slug: dto.slug,
      name: dto.name,
      event_date: new Date(dto.event_date),
      route: dto.route,
      description: dto.description,
      created_by: user.email,
    });
  }

  async findAll() {
    return this.eventsRepo.findAll(true);
  }

  async findMyEvents(user: UserPublic) {
    return this.eventsRepo.findByCreator(user.email);
  }

  async findBySlug(slug: string) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async update(slug: string, dto: UpdateEventDto, user: UserPublic) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.created_by !== user.email) {
      throw new ForbiddenException('You can only modify your own events');
    }

    return this.eventsRepo.update(slug, {
      name: dto.name,
      event_date: dto.event_date ? new Date(dto.event_date) : undefined,
      route: dto.route,
      description: dto.description,
      published: dto.published,
    });
  }

  async delete(slug: string, user: UserPublic) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.created_by !== user.email) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.eventsRepo.delete(slug);
    return { message: 'Event deleted successfully' };
  }
}
