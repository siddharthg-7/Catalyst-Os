import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Connected successfully to Neon PostgreSQL database.');
    } catch (err) {
      console.warn('[PrismaService] Database connection deferred.', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
