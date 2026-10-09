/**
 * CatalystOS - Dynamic Agent Rule Engine (Module 3 & Data Schema Specification)
 * Provides persistent storage and runtime customization of behavioral guidelines,
 * ethical constraints, spend limits, and domain responsibilities for executive AI agents.
 * Dynamically injected into agent system prompts without requiring server restarts.
 */

import { prisma, safeDbQuery } from './dbService';
import { decisionLedgerService } from './decisionLedgerService';

export interface AgentRuleRecord {
  id: string;
  startupId: string;
  agentRole: string; // 'CEO' | 'CFO' | 'HR' | 'CMO' | 'COO' | 'LEGAL' | 'AUDITOR' | string
  rules: string[];   // Customizable behavioral constraints
  spendLimit: number; // Spend limit in USD
  updatedAt: string;
}

export const CANONICAL_AGENT_ROLES = [
  'CEO',
  'CFO',
  'HR',
  'CMO',
  'COO',
  'LEGAL',
  'AUDITOR',
  'INVESTMENT'
] as const;

export const DEFAULT_AGENT_RULES: Record<string, { rules: string[]; spendLimit: number }> = {
  CEO: {
    rules: [
      'Prioritize cross-functional strategic velocity and customer-aligned product roadmaps.',
      'Synthesize conflicting department recommendations into unified, actionable founder briefs.',
      'Escalate all financial commitments and structural changes to founder approval.'
    ],
    spendLimit: 25000
  },
  CFO: {
    rules: [
      'Fiduciary governance: enforce minimum runway preservation of at least 6.0 months.',
      'Disallow unvetted commitments exceeding spend limit without explicit founder authorization.',
      'Verify unit economics, loaded payroll buffers (1.20x), and payback horizons for all expenditures.'
    ],
    spendLimit: 5000
  },
  HR: {
    rules: [
      'Maintain compliance with company compensation policies and competitive benchmark bands.',
      'Require budget sign-off from CFO before extending offers or increasing team capacity.',
      'Enforce standard intellectual property assignment, confidentiality, and vesting cliff guidelines.'
    ],
    spendLimit: 3000
  },
  TALENT: {
    rules: [
      'Maintain compliance with company compensation policies and competitive benchmark bands.',
      'Require budget sign-off from CFO before extending offers or increasing team capacity.',
      'Enforce standard intellectual property assignment, confidentiality, and vesting cliff guidelines.'
    ],
    spendLimit: 3000
  },
  CMO: {
    rules: [
      'Target customer acquisition channels with demonstrable LTV:CAC efficiency (>3.0x).',
      'Ensure marketing copy, social claims, and product messaging are truthful and strictly compliant.',
      'Cap experimental campaign allocations within authorized monthly growth spend limits.'
    ],
    spendLimit: 2500
  },
  GROWTH: {
    rules: [
      'Target customer acquisition channels with demonstrable LTV:CAC efficiency (>3.0x).',
      'Ensure marketing copy, social claims, and product messaging are truthful and strictly compliant.',
      'Cap experimental campaign allocations within authorized monthly growth spend limits.'
    ],
    spendLimit: 2500
  },
  COO: {
    rules: [
      'Maintain sprint cadence, track prerequisite task blockers, and enforce sequential delivery.',
      'Ensure vendor SLAs, security baselines, and production reliability thresholds are satisfied.',
      'Proactively flag operational bottlenecks before milestone target deadlines.'
    ],
    spendLimit: 5000
  },
  OPERATIONS: {
    rules: [
      'Maintain sprint cadence, track prerequisite task blockers, and enforce sequential delivery.',
      'Ensure vendor SLAs, security baselines, and production reliability thresholds are satisfied.',
      'Proactively flag operational bottlenecks before milestone target deadlines.'
    ],
    spendLimit: 5000
  },
  LEGAL: {
    rules: [
      'Include mandatory regulatory safeguards, commercial disclaimers, and data privacy covenants.',
      'Flag high-risk liability exposures and mandate human legal review for external contracts.',
      'Protect core company IP, trade secrets, and non-disclosure obligations.'
    ],
    spendLimit: 0
  },
  AUDITOR: {
    rules: [
      'Enforce zero hallucination policy: every substantive recommendation must cite grounded company records.',
      'Verify arithmetic calculations, burn rates, and financial impact deltas deterministically.',
      'Gate delivery and reject incomplete, contradictory, or ungrounded agent outputs.'
    ],
    spendLimit: 0
  },
  INVESTMENT: {
    rules: [
      'Maintain institutional-grade cap table modeling and dilutive impact simulations.',
      'Verify regulatory exemptions (Regulation D / SAFE instruments) for investor outreach.',
      'Ensure growth disclosures and ARR metrics adhere to GAAP and SEC accounting guidelines.'
    ],
    spendLimit: 10000
  }
};

// In-memory tenant store keyed by `${startupId}:${normalizedRole}`
const agentRuleMemoryStore = new Map<string, AgentRuleRecord>();

export class AgentRuleService {
  /**
   * Normalizes role strings to canonical identifiers (e.g. 'cfo' -> 'CFO', 'talent' -> 'HR', 'growth' -> 'CMO').
   */
  public normalizeRole(role: string): string {
    const raw = (role || '').trim().toUpperCase();
    if (raw === 'TALENT') return 'HR';
    if (raw === 'GROWTH') return 'CMO';
    if (raw === 'OPERATIONS') return 'COO';
    return raw;
  }

  /**
   * Retrieves active behavioral rules and spend limit for a specific agent role.
   */
  public async getRulesForAgent(startupId: string, role: string): Promise<AgentRuleRecord> {
    const normRole = this.normalizeRole(role);
    const key = `${startupId || 'default'}:${normRole}`;

    // 1. Check in-memory store
    if (agentRuleMemoryStore.has(key)) {
      return agentRuleMemoryStore.get(key)!;
    }

    // 2. Check Prisma database if agentRule model exists
    try {
      const dbRecord: any = await safeDbQuery(() => (prisma as any).agentRule?.findFirst({
        where: { startupId, agentRole: normRole }
      }));
      if (dbRecord) {
        const record: AgentRuleRecord = {
          id: dbRecord.id,
          startupId: dbRecord.startupId,
          agentRole: dbRecord.agentRole,
          rules: Array.isArray(dbRecord.rules) ? dbRecord.rules : [],
          spendLimit: typeof dbRecord.spendLimit === 'number' ? dbRecord.spendLimit : 0,
          updatedAt: dbRecord.updatedAt instanceof Date ? dbRecord.updatedAt.toISOString() : new Date().toISOString()
        };
        agentRuleMemoryStore.set(key, record);
        return record;
      }
    } catch {}

    // 3. Fallback to default configuration
    const defaults = DEFAULT_AGENT_RULES[normRole] || DEFAULT_AGENT_RULES['CEO'];
    const defaultRecord: AgentRuleRecord = {
      id: `rule_${normRole.toLowerCase()}_${Date.now()}`,
      startupId: startupId || 'default',
      agentRole: normRole,
      rules: [...defaults.rules],
      spendLimit: defaults.spendLimit,
      updatedAt: new Date().toISOString()
    };

    agentRuleMemoryStore.set(key, defaultRecord);
    return defaultRecord;
  }

  /**
   * Updates behavioral rules and spend limit for an agent role on the fly.
   * Logs a tamper-evident event in the decision ledger and persists updates.
   */
  public async updateRulesForAgent(params: {
    startupId: string;
    role: string;
    rules: string[];
    spendLimit?: number;
    actorId?: string;
  }): Promise<AgentRuleRecord> {
    const { startupId, role, rules, spendLimit, actorId } = params;
    const normRole = this.normalizeRole(role);
    const key = `${startupId || 'default'}:${normRole}`;

    const current = await this.getRulesForAgent(startupId, normRole);
    const updatedRecord: AgentRuleRecord = {
      ...current,
      rules: Array.isArray(rules) ? rules.filter(r => typeof r === 'string' && r.trim().length > 0) : current.rules,
      spendLimit: typeof spendLimit === 'number' ? spendLimit : current.spendLimit,
      updatedAt: new Date().toISOString()
    };

    // Update in-memory store
    agentRuleMemoryStore.set(key, updatedRecord);

    // Persist to Prisma database if available
    try {
      await safeDbQuery(async () => {
        if ((prisma as any).agentRule) {
          await (prisma as any).agentRule.upsert({
            where: { id: current.id },
            update: {
              rules: updatedRecord.rules,
              spendLimit: updatedRecord.spendLimit,
              updatedAt: new Date()
            },
            create: {
              id: updatedRecord.id,
              startupId: updatedRecord.startupId,
              agentRole: normRole,
              rules: updatedRecord.rules,
              spendLimit: updatedRecord.spendLimit
            }
          });
        }
      });
    } catch {}

    // Record in tamper-evident decision ledger
    decisionLedgerService.appendEvent({
      decisionId: `rule_${normRole}_${startupId}`,
      startupId: startupId || 'default',
      workflowId: `wf_rule_update_${Date.now()}`,
      actor: actorId || `Founder (${normRole} Rule Admin)`,
      eventType: 'POLICY_CHANGED',
      payload: {
        agentRole: normRole,
        oldRules: current.rules,
        newRules: updatedRecord.rules,
        oldSpendLimit: current.spendLimit,
        newSpendLimit: updatedRecord.spendLimit,
        updatedAt: updatedRecord.updatedAt
      }
    });

    console.log(`[AgentRuleService] Updated rules for ${normRole} (Spend Limit: $${updatedRecord.spendLimit})`);
    return updatedRecord;
  }

  /**
   * Retrieves all configured agent rules for a given startup.
   */
  public async getAllRules(startupId: string): Promise<AgentRuleRecord[]> {
    const roles: string[] = ['CEO', 'CFO', 'HR', 'CMO', 'COO', 'LEGAL', 'AUDITOR', 'INVESTMENT'];
    const results: AgentRuleRecord[] = [];

    for (const role of roles) {
      const record = await this.getRulesForAgent(startupId, role);
      results.push(record);
    }

    return results;
  }

  /**
   * Formats dynamic rules into prompt instructions to inject directly into LLM prompts.
   */
  public async formatRulesPrompt(startupId: string, role: string): Promise<string> {
    const record = await this.getRulesForAgent(startupId, role);
    if (!record.rules || record.rules.length === 0) {
      return '';
    }

    let prompt = `\n### DYNAMIC BEHAVIORAL RULES & BOUNDARIES (${record.agentRole}):\n`;
    record.rules.forEach((rule, idx) => {
      prompt += `${idx + 1}. ${rule}\n`;
    });
    if (record.spendLimit > 0) {
      prompt += `Spend Limit: $${record.spendLimit.toLocaleString()} USD (Expenditures exceeding this require explicit founder sign-off).\n`;
    }
    prompt += `You MUST strictly adhere to these customized corporate rules.\n`;

    return prompt;
  }
}

export const agentRuleService = new AgentRuleService();
