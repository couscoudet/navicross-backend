import { Module } from '@nestjs/common';
import { ClosuresController } from './closures.controller';
import { ClosuresService } from './closures.service';
import { ClosuresRepository } from './closures.repository';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EventsModule, AuthModule],
  controllers: [ClosuresController],
  providers: [ClosuresService, ClosuresRepository],
  exports: [ClosuresService, ClosuresRepository],
})
export class ClosuresModule {}
