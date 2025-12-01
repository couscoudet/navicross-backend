import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPublic } from '../users/interfaces/user.interface';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  findMyEvents(@CurrentUser() user: UserPublic) {
    return this.eventsService.findMyEvents(user);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateEventDto, @CurrentUser() user: UserPublic) {
    return this.eventsService.create(dto, user);
  }

  @Patch(':slug')
  @UseGuards(AuthGuard)
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.eventsService.update(slug, dto, user);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard)
  delete(@Param('slug') slug: string, @CurrentUser() user: UserPublic) {
    return this.eventsService.delete(slug, user);
  }
}
