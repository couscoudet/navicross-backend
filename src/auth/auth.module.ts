import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsRepository } from './sessions.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionsRepository],
  exports: [AuthService, SessionsRepository],
})
export class AuthModule {}
