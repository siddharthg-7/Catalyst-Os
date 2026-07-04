import { Injectable } from '@nestjs/common';
import { TalentTools } from './tools';
import { TalentHiringInput, TalentHiringOutput } from './schema';

@Injectable()
export class TalentService {
  constructor(private readonly tools: TalentTools) {}

  async draftRole(input: TalentHiringInput): Promise<TalentHiringOutput> {
    const spec = this.tools.createJobSpec(input.role, input.targetSalary, input.targetEquity);
    return {
      jobSpecification: spec,
      sourcingPipeline: ['GitHub Jobs', 'HN Who is Hiring', 'Selected Dev Referrals'],
    };
  }
}
