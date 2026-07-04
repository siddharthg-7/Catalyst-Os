import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMemories(startupId: string) {
    return [];
  }

  async storeMemory(startupId: string, category: string, title: string, description: string) {
    return {
      id: 'mem_' + Date.now(),
      category,
      title,
      description,
      createdAt: new Date().toISOString(),
    };
  }
}
