import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { randomUUID } from 'crypto';

export interface Session {
  id: string;
  user_id: number;
  expires_at: Date;
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number, expiresInDays = 30): Promise<Session> {
    try {
      const sessionId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const session = await this.db.queryOne<Session>(
        `INSERT INTO user_sessions (id, user_id, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sessionId, userId, expiresAt],
      );

      if (!session) {
        throw new Error('Failed to create session - no data returned');
      }

      return session;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create session: ${error.message}`,
      );
    }
  }

  async findById(sessionId: string): Promise<Session | null> {
    try {
      return this.db.queryOne<Session>(
        `SELECT * FROM user_sessions 
         WHERE id = $1 AND expires_at > NOW()`,
        [sessionId],
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to find session: ${error.message}`,
      );
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM user_sessions WHERE id = $1', [
        sessionId,
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete session: ${error.message}`,
      );
    }
  }

  async deleteAllForUser(userId: number): Promise<void> {
    try {
      await this.db.query('DELETE FROM user_sessions WHERE user_id = $1', [
        userId,
      ]);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete user sessions: ${error.message}`,
      );
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.db.query(
        'DELETE FROM user_sessions WHERE expires_at <= NOW()',
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to cleanup expired sessions: ${error.message}`,
      );
    }
  }
}
