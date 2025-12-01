import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { SessionsRepository } from './sessions.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly sessionsRepo: SessionsRepository,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const exists = await this.usersRepo.exists(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.usersRepo.create({
      email: dto.email,
      password_hash: passwordHash,
      name: dto.name,
    });

    // Create session
    const session = await this.sessionsRepo.create(user.id);

    return {
      user: this.usersRepo.toPublic(user),
      sessionId: session.id,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create session
    const session = await this.sessionsRepo.create(user.id);

    return {
      user: this.usersRepo.toPublic(user),
      sessionId: session.id,
    };
  }

  async logout(sessionId: string | null) {
    if (!sessionId) {
      throw new BadRequestException('No session provided');
    }

    await this.sessionsRepo.delete(sessionId);

    return {
      message: 'Logged out successfully',
    };
  }

  async validateSession(sessionId: string) {
    if (!sessionId) {
      return null;
    }

    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      return null;
    }

    const user = await this.usersRepo.findById(session.user_id);
    if (!user) {
      return null;
    }

    return {
      session,
      user: this.usersRepo.toPublic(user),
    };
  }
}
