import { Injectable } from '@nestjs/common';

@Injectable()
export class TalentTools {
  createJobSpec(role: string, salary: number, equity: number) {
    return {
      role,
      compensation: { baseSalary: salary, equityPercentage: equity },
      requirements: ['Kubernetes', 'Go', 'Docker', 'Systems engineering'],
    };
  }
}
