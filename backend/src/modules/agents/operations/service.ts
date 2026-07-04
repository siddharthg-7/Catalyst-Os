import { Injectable } from '@nestjs/common';
import { OperationsTools } from './tools';
import { OperationsCheckInput, OperationsCheckOutput } from './schema';

@Injectable()
export class OperationsService {
  constructor(private readonly tools: OperationsTools) {}

  async checkUptime(input: OperationsCheckInput): Promise<OperationsCheckOutput> {
    const status = this.tools.checkCloudStatus(input.provider);
    return {
      status: status.status,
      uptimePercentage: 99.98,
      warnings: [],
    };
  }
}
