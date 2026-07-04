import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceTools {
  calculateBurn(cash: number, burn: number) {
    return { cash, burn, runway: parseFloat((cash / burn).toFixed(1)) };
  }

  verifyBudget(expense: number, cash: number, burn: number) {
    const potentialRunway = parseFloat((cash / (burn + expense)).toFixed(1));
    return { affordable: potentialRunway >= 11, potentialRunway };
  }
}
