import { Injectable } from '@nestjs/common';
import { CeoTools } from './tools';
import { CeoPlanInput, CeoPlanOutput } from './schema';

@Injectable()
export class CeoService {
  constructor(private readonly tools: CeoTools) {}

  async executePlan(input: CeoPlanInput): Promise<CeoPlanOutput> {
    const result = this.tools.createPlan({
      title: 'Strategic Onboarding',
      description: input.goal,
    });

    return {
      initiativeId: result.planId,
      decomposedTasks: [
        { id: 'task_1', assignedTo: 'Finance', title: 'Verify runway impacts', constraints: 'Limit runway drop' },
        { id: 'task_2', assignedTo: 'Talent', title: 'Recruit Platform engineer', constraints: 'Equity heavy' },
      ],
      expectedDeliverables: [
        { type: 'contract', title: 'Platform Lead Offer Sheet' },
      ],
    };
  }
}
