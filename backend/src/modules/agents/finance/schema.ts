export interface FinanceAuditInput {
  expenseName: string;
  amount: number;
}

export interface FinanceAuditOutput {
  approved: boolean;
  runwayMonthsBefore: number;
  runwayMonthsAfter: number;
  recommendation: string;
}
