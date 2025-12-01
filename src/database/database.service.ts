import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      database: this.configService.get('database.database'),
      user: this.configService.get('database.user'),
      password: this.configService.get('database.password'),
    });

    // Test connection
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<T | null> {
    const result = await this.pool.query<T>(text, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async queryMany<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }
}
