/**
 * CatalystOS - Deterministic Financial Engine (Phase 5 & Section 6)
 * Authoritative financial math service for runway, headcount cost, burn rate deltas, and treasury projections.
 * LLMs interpret these numbers; they are strictly FORBIDDEN from calculating or modifying them.
 * Uses integer cents internally for decimal-safe monetary arithmetic to prevent floating-point drift.
 */

export interface HeadcountCostParams {
  baseSalary: number;
  benefitsMultiplier?: number; // e.g., 1.20 (20% benefits, payroll tax, tooling)
  headcount?: number; // Default 1
}

export interface RunwayCalculationResult {
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number;
  runwayStatus: 'HEALTHY' | 'ADEQUATE' | 'CRITICAL' | 'DEPLETED';
  monthlyDepletionDate?: string;
}

export interface ScenarioSimulationParams {
  currentCash: number;
  currentBurn: number;
  additionalHeadcount?: Array<{ role: string; salary: number; count: number }>;
  adSpendDelta?: number; // Monthly change in growth/marketing spend
  revenueDelta?: number; // Monthly incoming recurring revenue change
  oneTimeExpenditure?: number; // Direct cash deduction
  benefitsMultiplier?: number;
  minimumRunwayMonths?: number;
  criticalRunwayMonths?: number;
}

export interface ScenarioSimulationResult {
  initialCash: number;
  initialBurn: number;
  initialRunway: number;
  projectedCash: number;
  projectedBurn: number;
  projectedRunway: number;
  runwayDeltaMonths: number;
  netBurnDelta: number;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRunwayCritical: boolean; // Runway < criticalRunwayMonths
  timelineProjection: Array<{ month: number; projectedCash: number }>;
}

export class FinancialEngine {
  private defaultBenefitsMultiplier = 1.20;
  private defaultCriticalRunway = 6.0;
  private defaultMinimumRunway = 4.0;

  /**
   * Converts a dollar float to integer cents.
   */
  public toCents(dollars: number): number {
    return Math.round((Number(dollars) || 0) * 100);
  }

  /**
   * Converts integer cents to a 2-decimal dollar float.
   */
  public fromCents(cents: number): number {
    return Math.round(cents) / 100;
  }

  /**
   * Calculates deterministic operational runway: Cash Balance / Monthly Burn.
   * Handles negative cash, negative burn, zero burn, and large cash numbers safely.
   */
  public calculateRunway(
    cashBalance: number, 
    monthlyBurn: number,
    policyOptions?: { criticalRunwayMonths?: number; minimumRunwayMonths?: number }
  ): RunwayCalculationResult {
    const cash = Number(cashBalance) || 0;
    const burn = Number(monthlyBurn) || 0;
    const criticalThreshold = policyOptions?.criticalRunwayMonths ?? this.defaultCriticalRunway;
    const minThreshold = policyOptions?.minimumRunwayMonths ?? this.defaultMinimumRunway;

    // Depleted if cash <= 0
    if (cash <= 0) {
      return {
        cashBalance: cash,
        monthlyBurn: burn,
        runwayMonths: 0,
        runwayStatus: 'DEPLETED'
      };
    }

    let runwayMonths = 0;
    if (burn <= 0) {
      // Net-positive cashflow / self-sustaining
      runwayMonths = 999;
    } else {
      runwayMonths = parseFloat((cash / burn).toFixed(1));
    }

    let runwayStatus: RunwayCalculationResult['runwayStatus'] = 'HEALTHY';
    if (runwayMonths <= 0) runwayStatus = 'DEPLETED';
    else if (runwayMonths < minThreshold) runwayStatus = 'CRITICAL';
    else if (runwayMonths < criticalThreshold) runwayStatus = 'CRITICAL';
    else if (runwayMonths < 12) runwayStatus = 'ADEQUATE';
    else runwayStatus = 'HEALTHY';

    return {
      cashBalance: cash,
      monthlyBurn: burn,
      runwayMonths,
      runwayStatus
    };
  }

  /**
   * Calculates fully-loaded monthly headcount cost.
   * Fully Loaded Cost = (Base Salary * Benefits Multiplier) / 12
   * Uses integer cents for precise division.
   */
  public calculateFullyLoadedMonthlyCost(params: HeadcountCostParams): number {
    const base = Math.max(0, Number(params.baseSalary) || 0);
    const multiplier = params.benefitsMultiplier ?? this.defaultBenefitsMultiplier;
    const count = Math.max(1, Number(params.headcount) || 1);

    const baseCents = this.toCents(base);
    const annualTotalCents = Math.round(baseCents * multiplier * count);
    const monthlyCostCents = Math.round(annualTotalCents / 12);

    return this.fromCents(monthlyCostCents);
  }

  /**
   * Evaluates comprehensive "What-If" financial scenarios.
   * Deterministically computes projected cash curves, monthly burn shifts, and risk ratings.
   */
  public simulateScenario(params: ScenarioSimulationParams): ScenarioSimulationResult {
    const currentCash = Number(params.currentCash) || 0;
    const currentBurn = Number(params.currentBurn) || 0;
    const criticalThreshold = params.criticalRunwayMonths ?? this.defaultCriticalRunway;
    const minThreshold = params.minimumRunwayMonths ?? this.defaultMinimumRunway;

    let monthlyHeadcountDeltaCents = 0;
    if (params.additionalHeadcount && Array.isArray(params.additionalHeadcount)) {
      for (const h of params.additionalHeadcount) {
        const cost = this.calculateFullyLoadedMonthlyCost({
          baseSalary: h.salary,
          benefitsMultiplier: params.benefitsMultiplier,
          headcount: h.count
        });
        monthlyHeadcountDeltaCents += this.toCents(cost);
      }
    }

    const adSpendDeltaCents = this.toCents(params.adSpendDelta || 0);
    const revenueDeltaCents = this.toCents(params.revenueDelta || 0);
    const oneTimeExpCents = this.toCents(params.oneTimeExpenditure || 0);

    const initialCashCents = this.toCents(currentCash);
    const initialBurnCents = this.toCents(currentBurn);

    const projectedCashCents = initialCashCents - oneTimeExpCents;
    const netBurnDeltaCents = monthlyHeadcountDeltaCents + adSpendDeltaCents - revenueDeltaCents;
    const projectedBurnCents = Math.max(100000, initialBurnCents + netBurnDeltaCents); // Floor at $1,000/mo

    const projectedCash = this.fromCents(projectedCashCents);
    const projectedBurn = this.fromCents(projectedBurnCents);
    const netBurnDelta = this.fromCents(netBurnDeltaCents);

    const initialRunwayResult = this.calculateRunway(currentCash, currentBurn, {
      criticalRunwayMonths: criticalThreshold,
      minimumRunwayMonths: minThreshold
    });
    const initialRunway = initialRunwayResult.runwayMonths;

    const projectedRunwayResult = this.calculateRunway(projectedCash, projectedBurn, {
      criticalRunwayMonths: criticalThreshold,
      minimumRunwayMonths: minThreshold
    });
    const projectedRunway = projectedRunwayResult.runwayMonths;
    const runwayDeltaMonths = parseFloat((projectedRunway - initialRunway).toFixed(1));

    // Risk Classification
    let riskRating: ScenarioSimulationResult['riskRating'] = 'LOW';
    if (projectedRunway < minThreshold || projectedCash <= 0) {
      riskRating = 'CRITICAL';
    } else if (projectedRunway < criticalThreshold) {
      riskRating = 'HIGH';
    } else if (projectedRunway < 10.0 || netBurnDelta > 20000) {
      riskRating = 'MEDIUM';
    }

    // 12-Month Depletion Timeline
    const timelineProjection: Array<{ month: number; projectedCash: number }> = [];
    let rollingCashCents = projectedCashCents;
    for (let month = 1; month <= 12; month++) {
      rollingCashCents = Math.max(0, rollingCashCents - projectedBurnCents);
      timelineProjection.push({
        month,
        projectedCash: this.fromCents(rollingCashCents)
      });
    }

    return {
      initialCash: currentCash,
      initialBurn: currentBurn,
      initialRunway,
      projectedCash,
      projectedBurn,
      projectedRunway,
      runwayDeltaMonths,
      netBurnDelta,
      riskRating,
      isRunwayCritical: projectedRunway < criticalThreshold,
      timelineProjection
    };
  }
}

export const financialEngine = new FinancialEngine();
