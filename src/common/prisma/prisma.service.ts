import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;
  private pool: Pool;

  constructor() {
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT) || 5432;
    const database = process.env.DB_NAME || 'postgres';

    if (!user || !password || !host) {
      throw new Error(
        'Missing DB_USER, DB_PASSWORD, or DB_HOST env vars — set these in .env (see prisma.config.ts / DATABASE_URL for the values).',
      );
    }

    this.pool = new Pool({
      user,
      password,
      host,
      port,
      database,
      ssl: { rejectUnauthorized: false },
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.warn(`Pool idle client error: ${err.message}`);
    });

    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  get client() {
    return this.prisma;
  }

  async onModuleInit() {
    const maxAttempts = 3;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.prisma.$connect();
        this.logger.log('✅ Database connected successfully!');
        return;
      } catch (err: any) {
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`,
        );
        if (attempt === maxAttempts) {
          this.logger.error('❌ Database connection failed after retries.');
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
    this.logger.log('Database disconnected');
  }
}