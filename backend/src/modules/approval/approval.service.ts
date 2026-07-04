import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async listPending(startupId: string) {
    return [];
  }

  async review(approvalId: string, action: 'approve' | 'reject', feedback?: string) {
    return {
      id: approvalId,
      status: action === 'approve' ? 'approved' : 'rejected',
      feedback,
    };
  }
}
