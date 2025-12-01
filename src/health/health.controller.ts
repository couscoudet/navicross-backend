import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async checkDatabase() {
    try {
      // Test basic query
      const result = await this.db.queryOne<{ version: string }>(
        'SELECT version() as version',
      );

      // Check PostGIS
      const postgis = await this.db.queryOne<{ version: string }>(
        'SELECT PostGIS_Version() as version',
      );

      return {
        status: 'ok',
        database: 'connected',
        postgis: !!postgis,
        version: result && result.version,
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}
