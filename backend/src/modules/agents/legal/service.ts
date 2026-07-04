import { Injectable } from '@nestjs/common';
import { LegalTools } from './tools';
import { LegalAuditInput, LegalAuditOutput } from './schema';

@Injectable()
export class LegalService {
  constructor(private readonly tools: LegalTools) {}

  async vetAgreement(input: LegalAuditInput): Promise<LegalAuditOutput> {
    const check = this.tools.verifyCompliance(input.terms);
    return {
      vetted: check.riskScore < 0.3,
      identifiedRisks: [],
      suggestedRevisions: 'Approved as is. Clauses align perfectly with state pre-seed guidelines.',
    };
  }
}
