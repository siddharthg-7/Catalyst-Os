export interface TalentHiringInput {
  role: string;
  targetSalary: number;
  targetEquity: number;
}

export interface TalentHiringOutput {
  jobSpecification: {
    role: string;
    compensation: { baseSalary: number; equityPercentage: number };
    requirements: string[];
  };
  sourcingPipeline: string[];
}
