/**
 * CatalystOS - Financial Engine Unit Test Suite (Phase 5)
 * Verifies deterministic arithmetic: runway calculations, fully loaded headcount cost, and what-if simulation curves.
 */

import { financialEngine } from '../backend/services/financialEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${title} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

function runFinancialTests() {
  console.log('\n========================================================================');
  console.log('💰 CATALYSTOS PHASE 5: DETERMINISTIC FINANCIAL ENGINE TEST SUITE');
  console.log('========================================================================\n');

  // Test 1: Standard Runway Math
  {
    const res = financialEngine.calculateRunway(250000, 25000);
    assert(res.runwayMonths === 10.0, 'Calculates 10.0 months for $250k cash with $25k/mo burn', `Got: ${res.runwayMonths}`);
    assert(res.runwayStatus === 'ADEQUATE', 'Flags 10 months as ADEQUATE runway status');
  }

  // Test 2: Critical Runway Alert (< 6 months)
  {
    const res = financialEngine.calculateRunway(100000, 25000);
    assert(res.runwayMonths === 4.0, 'Calculates 4.0 months for $100k cash with $25k/mo burn');
    assert(res.runwayStatus === 'CRITICAL', 'Flags 4 months as CRITICAL runway');
  }

  // Test 3: Zero Burn Rate / Infinite Runway
  {
    const res = financialEngine.calculateRunway(200000, 0);
    assert(res.runwayMonths === 999, 'Zero burn yields 999 runway months safely without division by zero');
    assert(res.runwayStatus === 'HEALTHY', 'Status is HEALTHY');
  }

  // Test 4: Fully Loaded Employee Cost
  {
    // $120,000 base * 1.20 benefits = $144,000 / 12 = $12,000/mo
    const monthlyCost = financialEngine.calculateFullyLoadedMonthlyCost({
      baseSalary: 120000,
      benefitsMultiplier: 1.20,
      headcount: 1
    });
    assert(monthlyCost === 12000, 'Fully loaded $120k salary equals $12,000/mo with 20% benefits', `Got: ${monthlyCost}`);
  }

  // Test 5: Multiple Headcount
  {
    // 2 engineers @ $150k each * 1.20 = $360,000 / 12 = $30,000/mo
    const monthlyCost = financialEngine.calculateFullyLoadedMonthlyCost({
      baseSalary: 150000,
      benefitsMultiplier: 1.20,
      headcount: 2
    });
    assert(monthlyCost === 30000, 'Two $150k engineers equal $30,000/mo fully loaded', `Got: ${monthlyCost}`);
  }

  // Test 6: What-If Scenario Simulation
  {
    const sim = financialEngine.simulateScenario({
      currentCash: 300000,
      currentBurn: 20000,
      additionalHeadcount: [
        { role: 'Senior Backend', salary: 150000, count: 1 } // +$15,000/mo fully loaded
      ],
      adSpendDelta: 5000, // +$5,000/mo
      revenueDelta: 2000, // -$2,000/mo
      oneTimeExpenditure: 10000 // -$10,000 cash
    });

    // Net Burn Delta = 15000 + 5000 - 2000 = +18000
    // Projected Burn = 20000 + 18000 = 38000
    // Projected Cash = 300000 - 10000 = 290000
    // Projected Runway = 290000 / 38000 = 7.6 months
    assert(sim.projectedBurn === 38000, 'Projected monthly burn is $38,000/mo', `Got: ${sim.projectedBurn}`);
    assert(sim.projectedCash === 290000, 'Projected cash after one-time exp is $290,000', `Got: ${sim.projectedCash}`);
    assert(sim.projectedRunway === 7.6, 'Projected runway is exactly 7.6 months', `Got: ${sim.projectedRunway}`);
    assert(sim.timelineProjection.length === 12, 'Generates 12-month depletion projection');
  }

  console.log(`\n========================================================================`);
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================================================\n`);

  if (failed > 0) process.exit(1);
}

runFinancialTests();
