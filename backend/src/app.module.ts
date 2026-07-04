import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { SharedModule } from './shared/shared.module';
import { SecurityMiddleware } from './middleware/security.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StartupModule } from './modules/startup/startup.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { MemoryModule } from './modules/memory/memory.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    SharedModule,
    AuthModule,
    UsersModule,
    StartupModule,
    DashboardModule,
    KnowledgeModule,
    ApprovalModule,
    MemoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}
