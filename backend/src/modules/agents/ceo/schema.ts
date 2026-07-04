export interface CeoPlanInput {
  goal: string;
  context: string;
}

export interface CeoPlanOutput {
  initiativeId: string;
  decomposedTasks: Array<{
    id: string;
    assignedTo: string;
    title: string;
    constraints: string;
  }>;
  expectedDeliverables: Array<{
    type: string;
    title: string;
  }>;
}
