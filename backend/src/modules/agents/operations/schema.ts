export interface OperationsCheckInput {
  provider: string;
}

export interface OperationsCheckOutput {
  status: string;
  uptimePercentage: number;
  warnings: string[];
}
