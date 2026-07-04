import { Injectable } from '@nestjs/common';
import { FinanceTools } from './tools';
import { FinanceAuditInput, FinanceAuditOutput } from './schema';

@Injectable()
export class FinanceService {
  constructor(private readonly tools: FinanceTools) {}

  async auditExpense(input: FinanceAuditInput): Promise<FinanceAuditOutput> {
    const check = this.tools.verifyBudget(input.amount, 245000, 18500);

    return {
      approved: check.affordable,
      runwayMonthsBefore: 13.2,
      runwayMonthsAfter: check.potentialRunway,
      recommendation: check.affordable 
        ? `Approve ${input.expenseName} allocation since cash reserve runway is preserved above safety thresholds.`
        : `Decline ${input.expenseName} immediately. Pre-seed runway will degrade below acceptable limits.`,
    };
  }
}
