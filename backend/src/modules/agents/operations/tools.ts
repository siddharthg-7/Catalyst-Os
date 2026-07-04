import { Injectable } from '@nestjs/common';

@Injectable()
export class OperationsTools {
  checkCloudStatus(provider: string) {
    return { provider, status: 'nominal', latencyMs: 45 };
  }
}
