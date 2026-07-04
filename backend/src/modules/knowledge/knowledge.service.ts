import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async listFiles(startupId: string) {
    return [];
  }

  async uploadFile(startupId: string, name: string, content: string, type: string) {
    return {
      id: 'doc_' + Date.now(),
      name,
      type,
      size: `${Math.round(content.length / 1024)} KB`,
      summary: 'Parsed and indexed doc.',
      insights: ['Insight 1', 'Insight 2'],
    };
  }
}
