import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StartupService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(startupId: string) {
    return {
      id: startupId,
      name: 'CatalystOS Startup',
      industry: 'B2B Cloud SaaS',
      description: 'AI Cloud Orchestrator saving dev-hour overhead.',
      fundingStage: 'Pre-Seed',
      cashBalance: 245000,
      burnRate: 18500,
      healthScore: 78,
    };
  }

  async updateProfile(startupId: string, data: any) {
    return {
      id: startupId,
      ...data,
    };
  }
}
