/**
 * CatalystOS — Phase G: Proactive CatalystOS Engine (Section 23)
 *
 * Implements continuous operational analysis across company data to proactively
 * detect issues and opportunities, delegating them to the appropriate executive
 * AI specialist and notifying the founder before bottlenecks cascade.
 *
 * Operational Dimensions:
 * 1. RUNWAY_WARNING       -> Aura (CFO)
 * 2. GROWTH_WARNING       -> Vector (CMO)
 * 3. HIRING_BOTTLENECK    -> Echo (Head of People)
 * 4. OPERATIONAL_ISSUE    -> Helix (VP Operations)
 * 5. LEGAL_RISK           -> Nexus (General Counsel)
 * 6. MISSED_TASK          -> Atlas (CEO Orchestrator)
 * 7. IMPORTANT_DEADLINE   -> Atlas (CEO Orchestrator)
 */

import { prisma, safeDbQuery, hasValidDbUrl } from './dbService';
import { getCompanionAgent } from './taskDelegationService';

export interface ProactiveInsight {
  id: string;
  startupId: string;
  category:
    | 'RUNWAY_WARNING'
    | 'GROWTH_WARNING'
    | 'HIRING_BOTTLENECK'
    | 'OPERATIONAL_ISSUE'
    | 'LEGAL_RISK'
    | 'MISSED_TASK'
    | 'IMPORTANT_DEADLINE';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
  title: string;
  description: string;
  agent: {
    name: string;
    role: string;
    department: string;
    avatar: string;
  };
  recommendation: string;
  suggestedActionCommand?: string;
  detectedAt: string;
}

export class ProactiveEngine {
  /**
   * Performs continuous analysis of company health, metrics, tasks, approvals, and memories.
   * Returns a prioritized list of proactive insights and recommendations.
   */
  public async analyzeCompany(startupId: string): Promise<ProactiveInsight[]> {
    if (!startupId) return [];

    const insights: ProactiveInsight[] = [];
    const now = new Date();

    if (!hasValidDbUrl || !prisma) {
      return this.getOfflineDemoInsights(startupId);
    }

    try {
      const startup: any = await safeDbQuery(() =>
        (prisma as any).startup.findUnique({
          where: { id: startupId },
          include: {
            plans: {
              include: {
                tasks: true,
                approvals: true
              }
            },
            documents: true,
            decisions: { orderBy: { createdAt: 'desc' }, take: 20 },
            memories: { orderBy: { createdAt: 'desc' }, take: 25 },
            notifications: { orderBy: { createdAt: 'desc' }, take: 10 }
          }
        })
      );

      if (!startup) return [];

      const cashBalance = startup.cashBalance ?? 0;
      const burnRate = startup.burnRate ?? 0;
      const runwayMonths = burnRate > 0 ? parseFloat((cashBalance / burnRate).toFixed(1)) : 999;
      const healthScore = startup.healthScore ?? 80;

      // Flatten plans tasks & approvals
      const allTasks: any[] = [];
      const allApprovals: any[] = [];
      if (Array.isArray(startup.plans)) {
        for (const p of startup.plans) {
          if (Array.isArray(p.tasks)) allTasks.push(...p.tasks);
          if (Array.isArray(p.approvals)) allApprovals.push(...p.approvals);
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // 1. RUNWAY WARNING (Agent: Aura / CFO)
      // ───────────────────────────────────────────────────────────────────────
      const aura = getCompanionAgent('FINANCE');
      if (burnRate > 0 && runwayMonths < 6) {
        insights.push({
          id: `ins_runway_${Date.now()}`,
          startupId,
          category: 'RUNWAY_WARNING',
          severity: 'CRITICAL',
          title: 'Critical Cash Runway Warning',
          description: `Current liquid reserves ($${cashBalance.toLocaleString()}) provide only ${runwayMonths} months of runway at current burn ($${burnRate.toLocaleString()}/mo). Safety threshold is 6.0 months.`,
          agent: {
            name: aura.name,
            role: aura.role,
            department: 'FINANCE',
            avatar: aura.avatar
          },
          recommendation:
            'Aura recommends freezing non-essential contractor spend, deferring discretionary capital outlays, and initiating a customer prepayment campaign or Seed SAFE extension.',
          suggestedActionCommand: 'Model 3-month burn reduction scenarios and review department budgets',
          detectedAt: now.toISOString()
        });
      } else if (burnRate > 0 && runwayMonths >= 6 && runwayMonths <= 9) {
        insights.push({
          id: `ins_runway_adv_${Date.now()}`,
          startupId,
          category: 'RUNWAY_WARNING',
          severity: 'WARNING',
          title: 'Runway Governance Advisory',
          description: `Liquid runway is at ${runwayMonths} months. Preparing ahead prevents emergency dilution.`,
          agent: {
            name: aura.name,
            role: aura.role,
            department: 'FINANCE',
            avatar: aura.avatar
          },
          recommendation:
            'Aura recommends establishing strict monthly spend bounds and benchmarking burn multiple to preserve runway past 12 months.',
          suggestedActionCommand: 'Generate 12-month cash forecast and treasury burn report',
          detectedAt: now.toISOString()
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // 2. HIRING BOTTLENECK (Agent: Echo / Head of People)
      // ───────────────────────────────────────────────────────────────────────
      const echo = getCompanionAgent('TALENT');
      const hiringDecisions = (startup.decisions || []).filter(
        (d: any) =>
          d.status === 'approved' &&
          (d.title.toLowerCase().includes('hire') ||
            d.title.toLowerCase().includes('recruiting') ||
            d.description.toLowerCase().includes('engineer'))
      );
      const pendingHiringTasks = allTasks.filter(
        (t: any) =>
          (t.department === 'TALENT' || t.department === 'HR') &&
          (t.status === 'pending' || t.status === 'in_progress')
      );

      if (hiringDecisions.length > 0 && pendingHiringTasks.length > 0) {
        insights.push({
          id: `ins_hiring_${Date.now()}`,
          startupId,
          category: 'HIRING_BOTTLENECK',
          severity: 'WARNING',
          title: 'Hiring Bottleneck: Engineering Requisitions Open',
          description: `Founder approved hiring roadmap, but candidate sourcing pipeline and technical interview rubrics remain pending execution.`,
          agent: {
            name: echo.name,
            role: echo.role,
            department: 'TALENT',
            avatar: echo.avatar
          },
          recommendation:
            'Echo recommends initiating active candidate sourcing on specialist engineering boards and scheduling 30-minute recruiter screens.',
          suggestedActionCommand: 'Distribute approved candidate scorecards and start technical sourcing pipeline',
          detectedAt: now.toISOString()
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // 3. OPERATIONAL ISSUE / UNASSIGNED TASKS (Agent: Helix / VP Operations)
      // ───────────────────────────────────────────────────────────────────────
      const helix = getCompanionAgent('OPERATIONS');
      const unassignedTasks = allTasks.filter(
        (t: any) =>
          (t.status === 'pending' || t.status === 'in_progress') &&
          (!t.assignedTo || t.assignedTo.trim() === '' || t.assignedTo === 'UNASSIGNED')
      );

      if (unassignedTasks.length >= 2) {
        insights.push({
          id: `ins_ops_${Date.now()}`,
          startupId,
          category: 'OPERATIONAL_ISSUE',
          severity: 'WARNING',
          title: 'Operational Issue: Unassigned Execution Tasks',
          description: `${unassignedTasks.length} active plan tasks currently lack human owners, risking milestone delivery velocity.`,
          agent: {
            name: helix.name,
            role: helix.role,
            department: 'OPERATIONS',
            avatar: helix.avatar
          },
          recommendation:
            'Helix recommends assigning human role owners across departments or delegating to the co-pilot agent to prevent sprint slippage.',
          suggestedActionCommand: 'Assign designated department owners to all pending plan tasks',
          detectedAt: now.toISOString()
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // 4. GROWTH WARNING (Agent: Vector / CMO)
      // ───────────────────────────────────────────────────────────────────────
      const vector = getCompanionAgent('GROWTH');
      const hasRecentGrowthCampaign = (startup.decisions || []).some(
        (d: any) =>
          d.category === 'MARKETING_PLAN' ||
          d.title.toLowerCase().includes('growth') ||
          d.title.toLowerCase().includes('marketing')
      );

      if (!hasRecentGrowthCampaign || healthScore < 70) {
        insights.push({
          id: `ins_growth_${Date.now()}`,
          startupId,
          category: 'GROWTH_WARNING',
          severity: 'OPPORTUNITY',
          title: 'Growth Opportunity: Inbound Acquisition Expansion',
          description: `Top-of-funnel customer acquisition velocity can be accelerated with targeted ICP positioning and referral loops.`,
          agent: {
            name: vector.name,
            role: vector.role,
            department: 'GROWTH',
            avatar: vector.avatar
          },
          recommendation:
            'Vector recommends deploying an automated product changelog distribution loop and engaging high-intent engineering leads.',
          suggestedActionCommand: 'Launch developer referral loop and publish technical milestone brief',
          detectedAt: now.toISOString()
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // 5. LEGAL RISK (Agent: Nexus / General Counsel)
      // ───────────────────────────────────────────────────────────────────────
      const hasComplianceDoc = (startup.documents || []).some(
        (d: any) =>
          d.name.toLowerCase().includes('policy') ||
          d.name.toLowerCase().includes('contract') ||
          d.name.toLowerCase().includes('legal')
      );

      if (!hasComplianceDoc) {
        insights.push({
          id: `ins_legal_${Date.now()}`,
          startupId,
          category: 'LEGAL_RISK',
          severity: 'INFO',
          title: 'Legal Risk: Data Governance & Employment Safeguards',
          description: `Company document vault does not yet contain ratified standard IP assignment agreements or commercial terms of service.`,
          agent: {
            name: 'Nexus',
            role: 'General Counsel',
            department: 'LEGAL',
            avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150'
          },
          recommendation:
            'Nexus recommends establishing standard customer terms of service, NDA templates, and IP confidentiality clauses before onboarding external partners.',
          suggestedActionCommand: 'Ratify standard employee IP assignment policy and enterprise terms of service',
          detectedAt: now.toISOString()
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // 6. MISSED TASK / IMPORTANT DEADLINE (Agent: Atlas / CEO Orchestrator)
      // ───────────────────────────────────────────────────────────────────────
      const pendingApprovals = allApprovals.filter(
        (a: any) => a.status === 'pending_review' || a.status === 'pending'
      );

      if (pendingApprovals.length > 0) {
        insights.push({
          id: `ins_approval_${Date.now()}`,
          startupId,
          category: 'IMPORTANT_DEADLINE',
          severity: 'CRITICAL',
          title: 'Important Deadline: Approval Queue Bottleneck',
          description: `${pendingApprovals.length} strategic deliverable(s) awaiting founder decision in the approval queue. Execution is paused until review.`,
          agent: {
            name: 'Atlas',
            role: 'CEO Orchestrator',
            department: 'EXECUTIVE',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
          },
          recommendation:
            'Atlas recommends reviewing pending submissions to authorize employee execution and unblock cross-functional milestones.',
          suggestedActionCommand: 'Open Founder Approval Queue and review pending submissions',
          detectedAt: now.toISOString()
        });
      }
    } catch (err: any) {
      console.warn('[ProactiveEngine] Analysis error:', err.message);
    }

    return insights;
  }

  /**
   * Runs company analysis and persists any newly detected insights as high-priority
   * Notifications for the founder, deduplicating against notifications created in the last 24h.
   */
  public async generateAndNotifyInsights(startupId: string): Promise<ProactiveInsight[]> {
    const insights = await this.analyzeCompany(startupId);
    if (insights.length === 0 || !hasValidDbUrl || !prisma) {
      return insights;
    }

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentNotifications = await safeDbQuery(() =>
        (prisma as any).notification.findMany({
          where: {
            startupId,
            createdAt: { gte: oneDayAgo }
          },
          select: { title: true }
        })
      ) as any[] || [];

      const existingTitles = new Set(recentNotifications.map((n: any) => n.title));

      for (const insight of insights) {
        const notifTitle = `${insight.agent.name}: ${insight.title}`;
        if (!existingTitles.has(notifTitle)) {
          await safeDbQuery(() =>
            (prisma as any).notification.create({
              data: {
                title: notifTitle,
                message: `${insight.recommendation}\nRecommended action: "${insight.suggestedActionCommand || 'Review dashboard'}"`,
                type: insight.severity === 'CRITICAL' ? 'PROACTIVE_WARNING' : 'PROACTIVE_RECOMMENDATION',
                startupId
              }
            })
          );
          existingTitles.add(notifTitle);
        }
      }
    } catch (err: any) {
      console.warn('[ProactiveEngine] Notification dispatch error:', err.message);
    }

    return insights;
  }

  /**
   * Deterministic fallback when database is unavailable or running in mock mode.
   */
  private getOfflineDemoInsights(startupId: string): ProactiveInsight[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'ins_demo_runway',
        startupId,
        category: 'RUNWAY_WARNING',
        severity: 'WARNING',
        title: 'Runway Advisory: Monitor Capital Efficiency',
        description: 'Monthly cash burn tracking recommended across active department initiatives.',
        agent: {
          name: 'Aura',
          role: 'Chief Financial Officer',
          department: 'FINANCE',
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
        },
        recommendation: 'Aura recommends maintaining 6+ months buffer for planned engineering hires.',
        suggestedActionCommand: 'Review cashflow forecast and budget allocation',
        detectedAt: now
      },
      {
        id: 'ins_demo_hiring',
        startupId,
        category: 'HIRING_BOTTLENECK',
        severity: 'INFO',
        title: 'Hiring Requisition Preparation',
        description: 'Ensure engineering leveling scorecard alignment across senior interviewers.',
        agent: {
          name: 'Echo',
          role: 'Head of People & Recruiting',
          department: 'TALENT',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
        },
        recommendation: 'Echo recommends sharing the 4-stage interview scorecard with hiring managers.',
        suggestedActionCommand: 'Distribute approved candidate scorecards',
        detectedAt: now
      }
    ];
  }
}

export const proactiveEngine = new ProactiveEngine();
export default proactiveEngine;
