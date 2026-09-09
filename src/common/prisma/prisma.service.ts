import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;

  constructor() {
    // Extract connection parts manually
    const user = 'fac20af5a2a5e8f28211d7c5cf769210232dd09aee86319f01b4e8d8e7733db5';
    const password = 'sk_iFZVxtKiDMdjqsKC2ZjvT';
    const host = 'pooled.db.prisma.io';
    const port = 5432;
    const database = 'postgres';

    // Create pool with explicit parameters (bypasses URL parsing issues)
    const pool = new Pool({
      user,
      password, // This ensures password is treated as a string
      host,
      port,
      database,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    
    const adapter = new PrismaPg(pool);
    this.prisma = new PrismaClient({ adapter });
  }

  get client() {
    return this.prisma;
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('✅ Database connected successfully!');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('Database disconnected');
  }
}
