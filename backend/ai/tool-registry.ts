import { startupProfile } from '../state';

export interface AgentTool {
  name: string;
  description: string;
  execute: (args: any) => any;
}

export class ToolRegistry {
  private tools: Record<string, AgentTool> = {};

  constructor() {
    this.registerDefaultTools();
  }

  public registerTool(tool: AgentTool): void {
    this.tools[tool.name] = tool;
  }

  public getTool(name: string): AgentTool | undefined {
    return this.tools[name];
  }

  public executeTool(name: string, args: any): any {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered.`);
    }
    return tool.execute(args);
  }

  private registerDefaultTools(): void {
    // 1. Runway Calculator Tool
    this.registerTool({
      name: 'calculateRunway',
      description: 'Calculates the remaining cash runway based on current cash balance and monthly burn rate.',
      execute: () => {
        const cash = startupProfile.cashBalance;
        const burn = startupProfile.burnRate;
        const runway = parseFloat((cash / burn).toFixed(1));
        return { cash, burn, runway, status: runway < 11 ? 'danger' : 'safe' };
      }
    });

    // 2. Budget Affordability Checker
    this.registerTool({
      name: 'verifyBudget',
      description: 'Checks if proposed expense fits pre-seed parameters without lowering runway below threshold.',
      execute: (args: { expense: number }) => {
        const monthlyExpense = args.expense;
        const newBurn = startupProfile.burnRate + monthlyExpense;
        const potentialRunway = parseFloat((startupProfile.cashBalance / newBurn).toFixed(1));
        return {
          originalRunway: parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1)),
          potentialRunway,
          isAffordable: potentialRunway >= 11
        };
      }
    });
  }
}

export const toolRegistry = new ToolRegistry();
