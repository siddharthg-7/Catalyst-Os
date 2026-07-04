import { Injectable } from '@nestjs/common';

@Injectable()
export class LegalTools {
  verifyCompliance(clause: string) {
    return { clause, status: 'vetted', riskScore: 0.1 };
  }
}
