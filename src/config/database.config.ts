import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT as string, 10) || 5432,
  database: process.env.DB_NAME || 'navicross',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
}));
