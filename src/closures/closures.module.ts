import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ClosuresController } from './closures.controller';
import { ClosuresService } from './closures.service';
import { ClosuresRepository } from './closures.repository';
import { GpxParserService } from './services/gpx-parser.service';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EventsModule,
    AuthModule,
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  ],
  controllers: [ClosuresController],
  providers: [ClosuresService, ClosuresRepository, GpxParserService],
  exports: [ClosuresService, ClosuresRepository],
})
export class ClosuresModule {}
