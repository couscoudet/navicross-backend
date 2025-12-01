import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, UserCreate, UserPublic } from './interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: UserCreate): Promise<User> {
    try {
      const row = await this.db.queryOne<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.email, data.password_hash, data.name || null],
      );

      if (!row) {
        throw new Error('Failed to create user - no data returned');
      }

      return row;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create user: ${error.message}`,
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return this.db.queryOne<User>('SELECT * FROM users WHERE email = $1', [
        email,
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to find user by email: ${error.message}`,
      );
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      return this.db.queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to find user by id: ${error.message}`,
      );
    }
  }

  async exists(email: string): Promise<boolean> {
    try {
      const result = await this.db.queryOne<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
        [email],
      );
      return result?.exists || false;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to check user existence: ${error.message}`,
      );
    }
  }

  toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
