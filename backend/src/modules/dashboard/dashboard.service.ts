import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(startupId: string) {
    return {
      runwayMonths: 13.2,
      burnRate: 18500,
      cashBalance: 245000,
      healthScore: 78,
      agentCount: 6,
      pendingApprovals: 2,
    };
  }
}
