import { Injectable } from '@nestjs/common';

@Injectable()
export class CeoTools {
  createPlan(args: { title: string; description: string }) {
    return {
      success: true,
      planId: `plan_${Date.now()}`,
      ...args,
    };
  }

  delegate(args: { task: string; assignedTo: string }) {
    return {
      success: true,
      taskId: `task_${Date.now()}`,
      ...args,
    };
  }
}
