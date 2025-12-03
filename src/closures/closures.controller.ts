import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ClosuresService } from './closures.service';
import { CreateClosureDto } from './dto/create-closure.dto';
import { UpdateClosureDto } from './dto/update-closure.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPublic } from '../users/interfaces/user.interface';

@Controller()
export class ClosuresController {
  constructor(private readonly closuresService: ClosuresService) {}

  @Get('events/:slug/closures')
  findByEvent(@Param('slug') slug: string) {
    return this.closuresService.findByEventSlug(slug);
  }

  @Get('events/:slug/closures/active')
  findActiveByEvent(@Param('slug') slug: string) {
    return this.closuresService.findActiveByEventSlug(slug);
  }

  @Post('events/:slug/closures')
  @UseGuards(AuthGuard)
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateClosureDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.closuresService.create(slug, dto, user);
  }

  @Patch('closures/:id')
  @UseGuards(AuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClosureDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.closuresService.update(id, dto, user);
  }

  @Delete('closures/:id')
  @UseGuards(AuthGuard)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPublic,
  ) {
    return this.closuresService.delete(id, user);
  }
}
